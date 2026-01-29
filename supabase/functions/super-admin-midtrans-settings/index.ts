import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Env = "sandbox" | "production";

type Payload =
  | { action: "get" }
  | { action: "reveal"; env: Env }
  | { action: "clear"; env: Env }
  | { action: "set"; env: Env; merchant_id: string; client_key: string; server_key: string };

const WS_MERCHANT_ID = "midtrans_merchant_id";
const WS_CLIENT_KEY_SANDBOX = "midtrans_client_key_sandbox";
const WS_CLIENT_KEY_PRODUCTION = "midtrans_client_key_production";

function secretNameForEnv(env: Env) {
  return env === "sandbox" ? "server_key_sandbox" : "server_key_production";
}

function wsClientKeyForEnv(env: Env) {
  return env === "sandbox" ? WS_CLIENT_KEY_SANDBOX : WS_CLIENT_KEY_PRODUCTION;
}

function normalizeMerchantId(input: unknown): string {
  const v = String(input ?? "").trim();
  if (!v) throw new Error("merchant_id is required");
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(v)) throw new Error("Invalid merchant_id format");
  return v;
}

function normalizeKey(input: unknown, kind: "client" | "server"): string {
  const v = String(input ?? "").trim();
  if (!v) throw new Error(`${kind}_key is required`);
  if (/\s/.test(v) || v.length < 8) throw new Error(`Invalid ${kind}_key format`);
  return v;
}

function maskKey(key: string): string {
  const v = String(key ?? "").trim();
  if (!v) return "";
  const tail = v.slice(-4);
  return `${"*".repeat(Math.max(0, v.length - 4))}${tail}`;
}

async function writeAuditLog(admin: any, params: { actorUserId: string; action: string; provider: string; metadata?: Record<string, unknown> }) {
  await admin.from("super_admin_audit_logs").insert({
    actor_user_id: params.actorUserId,
    action: params.action,
    provider: params.provider,
    metadata: params.metadata ?? {},
  });
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

async function getSecretRow(admin: any, name: string) {
  const { data, error } = await admin
    .from("integration_secrets")
    .select("updated_at,ciphertext,iv")
    .eq("provider", "midtrans")
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
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
      const merchant = await getWebsiteSetting(admin, WS_MERCHANT_ID);
      const sandboxClient = await getWebsiteSetting(admin, WS_CLIENT_KEY_SANDBOX);
      const productionClient = await getWebsiteSetting(admin, WS_CLIENT_KEY_PRODUCTION);

      const sandboxSecret = await getSecretRow(admin, secretNameForEnv("sandbox"));
      const productionSecret = await getSecretRow(admin, secretNameForEnv("production"));

      const merchantId = typeof merchant?.value === "string" ? merchant.value : null;
      const sandboxClientKey = typeof sandboxClient?.value === "string" ? sandboxClient.value : null;
      const productionClientKey = typeof productionClient?.value === "string" ? productionClient.value : null;

      const sandboxServer = sandboxSecret && String((sandboxSecret as any)?.iv ?? "") === "plain" ? String((sandboxSecret as any)?.ciphertext ?? "") : "";
      const productionServer =
        productionSecret && String((productionSecret as any)?.iv ?? "") === "plain" ? String((productionSecret as any)?.ciphertext ?? "") : "";

      const updatedAtCandidates = [
        merchant?.updated_at,
        sandboxClient?.updated_at,
        productionClient?.updated_at,
        sandboxSecret ? String((sandboxSecret as any)?.updated_at ?? "") : null,
        productionSecret ? String((productionSecret as any)?.updated_at ?? "") : null,
      ].filter(Boolean) as string[];
      const updated_at = updatedAtCandidates.length ? updatedAtCandidates.sort().slice(-1)[0] : null;

      return new Response(
        JSON.stringify({
          configured: Boolean(merchantId || sandboxClientKey || productionClientKey || sandboxServer || productionServer),
          updated_at,
          merchant_id: merchantId,
          sandbox: {
            configured: Boolean(sandboxClientKey && sandboxServer),
            client_key_masked: sandboxClientKey ? maskKey(sandboxClientKey) : null,
            server_key_masked: sandboxServer ? maskKey(sandboxServer) : null,
            updated_at: sandboxSecret ? String((sandboxSecret as any)?.updated_at ?? null) : null,
          },
          production: {
            configured: Boolean(productionClientKey && productionServer),
            client_key_masked: productionClientKey ? maskKey(productionClientKey) : null,
            server_key_masked: productionServer ? maskKey(productionServer) : null,
            updated_at: productionSecret ? String((productionSecret as any)?.updated_at ?? null) : null,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "reveal") {
      const env = (body as any).env as Env;
      if (env !== "sandbox" && env !== "production") {
        return new Response(JSON.stringify({ error: "Invalid env" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const secret = await getSecretRow(admin, secretNameForEnv(env));
      const iv = String((secret as any)?.iv ?? "");
      const key = iv === "plain" ? String((secret as any)?.ciphertext ?? "") : "";
      if (!key) {
        return new Response(JSON.stringify({ error: "Server key belum diset" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await writeAuditLog(admin, {
        actorUserId: String(claimsData.claims.sub),
        action: "reveal_secret",
        provider: "midtrans",
        metadata: { env, name: secretNameForEnv(env), user_agent: req.headers.get("user-agent") },
      });

      return new Response(JSON.stringify({ server_key: key, server_key_masked: maskKey(key) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "set") {
      const env = (body as any).env as Env;
      if (env !== "sandbox" && env !== "production") {
        return new Response(JSON.stringify({ error: "Invalid env" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const merchantId = normalizeMerchantId((body as any).merchant_id);
      const clientKey = normalizeKey((body as any).client_key, "client");
      const serverKey = normalizeKey((body as any).server_key, "server");

      const { error: merchantErr } = await admin.from("website_settings").upsert({ key: WS_MERCHANT_ID, value: merchantId }, { onConflict: "key" });
      if (merchantErr) throw merchantErr;

      const { error: clientErr } = await admin
        .from("website_settings")
        .upsert({ key: wsClientKeyForEnv(env), value: clientKey }, { onConflict: "key" });
      if (clientErr) throw clientErr;

      const { error: secretErr } = await admin.from("integration_secrets").upsert(
        {
          provider: "midtrans",
          name: secretNameForEnv(env),
          ciphertext: serverKey,
          iv: "plain",
        },
        { onConflict: "provider,name" },
      );
      if (secretErr) throw secretErr;

      await writeAuditLog(admin, {
        actorUserId: String(claimsData.claims.sub),
        action: "set_setting",
        provider: "midtrans",
        metadata: { env, merchant_id: merchantId, user_agent: req.headers.get("user-agent") },
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "clear") {
      const env = (body as any).env as Env;
      if (env !== "sandbox" && env !== "production") {
        return new Response(JSON.stringify({ error: "Invalid env" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: clientErr } = await admin.from("website_settings").delete().eq("key", wsClientKeyForEnv(env));
      if (clientErr) throw clientErr;

      const { error: secretErr } = await admin.from("integration_secrets").delete().eq("provider", "midtrans").eq("name", secretNameForEnv(env));
      if (secretErr) throw secretErr;

      await writeAuditLog(admin, {
        actorUserId: String(claimsData.claims.sub),
        action: "clear_setting",
        provider: "midtrans",
        metadata: { env, user_agent: req.headers.get("user-agent") },
      });

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
