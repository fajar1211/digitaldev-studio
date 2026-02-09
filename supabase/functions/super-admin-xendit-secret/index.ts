// Supabase Edge Function: super-admin-xendit-secret
// Stores Xendit API key in public.integration_secrets (plaintext, iv='plain').

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload =
  | { action: "get" }
  | { action: "clear" }
  | { action: "set_enabled"; enabled: boolean }
  | {
      action: "set";
      api_key: string;
    };

function validateXenditSecretKey(input: string) {
  const apiKey = String(input ?? "").trim();
  if (!apiKey) return { ok: false as const, error: "api_key is required" };

  // Basic safety: no whitespace, keep length reasonable.
  if (/\s/.test(apiKey) || apiKey.length < 8 || apiKey.length > 256) {
    return { ok: false as const, error: "Invalid api_key format" };
  }

  // Xendit invoice API requires SECRET key (not public key).
  // Common prefixes: xnd_development_..., xnd_production_...
  if (!apiKey.startsWith("xnd_")) {
    return { ok: false as const, error: "Invalid Xendit key. Use a key that starts with 'xnd_'" };
  }
  if (apiKey.startsWith("xnd_public_")) {
    return {
      ok: false as const,
      error:
        "Invalid Xendit key for server-side usage. Please paste the Xendit *Secret* API Key (xnd_development_... / xnd_production_...), not the public key.",
    };
  }

const WS_ENABLED = "xendit_enabled";

function jsonBool(v: unknown, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return fallback;
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
  const { data: roleRow, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
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

    // Verify JWT using signing keys (verify_jwt=false)
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
      const [{ data, error }, enabledSetting] = await Promise.all([
        admin
          .from("integration_secrets")
          .select("updated_at")
          .eq("provider", "xendit")
          .eq("name", "api_key")
          .maybeSingle(),
        getWebsiteSetting(admin, WS_ENABLED),
      ]);
      if (error) throw error;

      const enabled = jsonBool(enabledSetting?.value, true);

      return new Response(
        JSON.stringify({
          enabled,
          configured: Boolean(data),
          updated_at: data ? String((data as any).updated_at) : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "set_enabled") {
      const enabled = Boolean((body as any).enabled);

      const { error: setErr } = await admin.from("website_settings").upsert({ key: WS_ENABLED, value: enabled }, { onConflict: "key" });
      if (setErr) throw setErr;

      await writeAuditLog(admin, {
        actorUserId: String(claimsData.claims.sub),
        action: "set_setting",
        provider: "xendit",
        metadata: { key: WS_ENABLED, enabled, user_agent: req.headers.get("user-agent") },
      });

      return new Response(JSON.stringify({ ok: true, enabled }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "set") {
      const validated = validateXenditSecretKey((body as any).api_key);
      if (!validated.ok) {
        return new Response(JSON.stringify({ error: validated.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await admin.from("integration_secrets").upsert(
        {
          provider: "xendit",
          name: "api_key",
          ciphertext: validated.apiKey,
          iv: "plain",
        },
        { onConflict: "provider,name" },
      );
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "clear") {
      const { error } = await admin.from("integration_secrets").delete().eq("provider", "xendit").eq("name", "api_key");
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
