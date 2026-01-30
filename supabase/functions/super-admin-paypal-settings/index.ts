import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Env = "sandbox" | "production";

type Payload =
  | { action: "get" }
  | { action: "set_enabled"; enabled: boolean }
  | { action: "set_active_env"; env: Env }
  | { action: "set_client_id"; env: Env; client_id: string }
  | { action: "clear_client_id"; env: Env };

const WS_PAYPAL_CLIENT_ID_SANDBOX = "paypal_client_id_sandbox";
const WS_PAYPAL_CLIENT_ID_PRODUCTION = "paypal_client_id_production";
const WS_PAYPAL_ACTIVE_ENV = "paypal_active_env";
const WS_PAYPAL_ENABLED = "paypal_enabled";

function normalizeEnabled(input: unknown) {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    const s = input.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  // Backward-compatible default
  return true;
}

function normalizeEnv(input: unknown): Env {
  const v = String(input ?? "").trim().toLowerCase();
  if (v !== "sandbox" && v !== "production") throw new Error("Invalid env");
  return v as Env;
}

function wsClientIdKey(env: Env) {
  return env === "sandbox" ? WS_PAYPAL_CLIENT_ID_SANDBOX : WS_PAYPAL_CLIENT_ID_PRODUCTION;
}

function normalizeClientId(input: unknown) {
  const v = String(input ?? "").trim();
  if (!v) throw new Error("client_id is required");
  if (/\s/.test(v) || v.length < 8 || v.length > 256) throw new Error("Invalid client_id format");
  return v;
}

async function requireSuperAdmin(admin: any, userId: string) {
  const { data: roleRow, error: roleErr } = await admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (roleErr) return { ok: false as const, status: 500, error: roleErr.message };
  if ((roleRow as any)?.role !== "super_admin") return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, userId };
}

async function getWebsiteSetting(admin: any, key: string): Promise<{ value: unknown; updated_at: string | null } | null> {
  const { data, error } = await admin.from("website_settings").select("value,updated_at").eq("key", key).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { value: (data as any).value, updated_at: (data as any).updated_at ? String((data as any).updated_at) : null };
}

async function hasPlainSecret(admin: any, env: Env): Promise<boolean> {
  const name = env === "sandbox" ? "client_secret_sandbox" : "client_secret_production";
  const { data, error } = await admin
    .from("integration_secrets")
    .select("ciphertext,iv")
    .eq("provider", "paypal")
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  return String((data as any).iv ?? "") === "plain" && Boolean(String((data as any).ciphertext ?? "").trim());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authed = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await authed.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const authz = await requireSuperAdmin(admin, String(claimsData.claims.sub));
    if (!authz.ok) {
      return new Response(JSON.stringify({ error: authz.error }), {
        status: authz.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;

    if (body.action === "get") {
      const enabledRow = await getWebsiteSetting(admin, WS_PAYPAL_ENABLED);
      const activeEnv = await getWebsiteSetting(admin, WS_PAYPAL_ACTIVE_ENV);
      const sb = await getWebsiteSetting(admin, WS_PAYPAL_CLIENT_ID_SANDBOX);
      const pr = await getWebsiteSetting(admin, WS_PAYPAL_CLIENT_ID_PRODUCTION);

      const sandboxClientId = typeof sb?.value === "string" ? sb.value.trim() : "";
      const productionClientId = typeof pr?.value === "string" ? pr.value.trim() : "";
      const active_env = (() => {
        const v = typeof activeEnv?.value === "string" ? activeEnv.value : null;
        return v === "sandbox" || v === "production" ? v : null;
      })();

      const sandboxSecretOk = await hasPlainSecret(admin, "sandbox");
      const productionSecretOk = await hasPlainSecret(admin, "production");

      const enabled = normalizeEnabled(enabledRow?.value);

      return new Response(
        JSON.stringify({
          enabled,
          active_env,
          sandbox: { client_id_set: Boolean(sandboxClientId), secret_set: sandboxSecretOk, ready: Boolean(sandboxClientId && sandboxSecretOk) },
          production: { client_id_set: Boolean(productionClientId), secret_set: productionSecretOk, ready: Boolean(productionClientId && productionSecretOk) },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "set_enabled") {
      const enabled = Boolean((body as any).enabled);
      const { error } = await admin.from("website_settings").upsert({ key: WS_PAYPAL_ENABLED, value: enabled }, { onConflict: "key" });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, enabled }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "set_active_env") {
      const env = normalizeEnv((body as any).env);
      const { error } = await admin.from("website_settings").upsert({ key: WS_PAYPAL_ACTIVE_ENV, value: env }, { onConflict: "key" });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, active_env: env }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "set_client_id") {
      const env = normalizeEnv((body as any).env);
      const client_id = normalizeClientId((body as any).client_id);
      const { error } = await admin.from("website_settings").upsert({ key: wsClientIdKey(env), value: client_id }, { onConflict: "key" });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "clear_client_id") {
      const env = normalizeEnv((body as any).env);
      const { error } = await admin.from("website_settings").delete().eq("key", wsClientIdKey(env));
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
