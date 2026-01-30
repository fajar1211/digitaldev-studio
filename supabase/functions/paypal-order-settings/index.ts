import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Env = "sandbox" | "production";

const WS_PAYPAL_CLIENT_ID_SANDBOX = "paypal_client_id_sandbox";
const WS_PAYPAL_CLIENT_ID_PRODUCTION = "paypal_client_id_production";
const WS_PAYPAL_ACTIVE_ENV = "paypal_active_env";
const WS_PAYPAL_ENABLED = "paypal_enabled";

function jsonBool(v: unknown, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return fallback;
}

async function getWebsiteSetting(admin: any, key: string): Promise<unknown> {
  const { data, error } = await admin.from("website_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return (data as any)?.value;
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const activeEnvRaw = await getWebsiteSetting(admin, WS_PAYPAL_ACTIVE_ENV);
    const env: Env = activeEnvRaw === "sandbox" || activeEnvRaw === "production" ? activeEnvRaw : "sandbox";

    const enabledRaw = await getWebsiteSetting(admin, WS_PAYPAL_ENABLED);
    const enabled = jsonBool(enabledRaw, true);

    const clientIdRaw = await getWebsiteSetting(admin, env === "sandbox" ? WS_PAYPAL_CLIENT_ID_SANDBOX : WS_PAYPAL_CLIENT_ID_PRODUCTION);
    const client_id = typeof clientIdRaw === "string" && clientIdRaw.trim() ? clientIdRaw.trim() : null;
    const secret_ok = await hasPlainSecret(admin, env);

    return new Response(
      JSON.stringify({ ok: true, env, enabled, client_id, ready: enabled && Boolean(client_id && secret_ok) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
