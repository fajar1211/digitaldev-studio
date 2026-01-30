import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Env = "sandbox" | "production";

const WS_MERCHANT_ID = "midtrans_merchant_id";
const WS_CLIENT_KEY_SANDBOX = "midtrans_client_key_sandbox";
const WS_CLIENT_KEY_PRODUCTION = "midtrans_client_key_production";
const WS_ACTIVE_ENV = "midtrans_active_env";
const WS_ENABLED = "midtrans_enabled";

async function getWebsiteSettingValue(admin: any, key: string): Promise<unknown> {
  const { data, error } = await admin.from("website_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return (data as any)?.value;
}

async function getWebsiteSettingString(admin: any, key: string): Promise<string | null> {
  const v = await getWebsiteSettingValue(admin, key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function jsonBool(v: unknown, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return fallback;
}

async function hasPlainServerKey(admin: any, env: Env): Promise<boolean> {
  const name = env === "sandbox" ? "server_key_sandbox" : "server_key_production";
  const { data, error } = await admin
    .from("integration_secrets")
    .select("ciphertext,iv")
    .eq("provider", "midtrans")
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

    // Use service role so this endpoint can be public but still read settings.
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const enabledValue = await getWebsiteSettingValue(admin, WS_ENABLED);
    const enabled = jsonBool(enabledValue, true);

    const merchantId = await getWebsiteSettingString(admin, WS_MERCHANT_ID);
    const sandboxClientKey = await getWebsiteSettingString(admin, WS_CLIENT_KEY_SANDBOX);
    const productionClientKey = await getWebsiteSettingString(admin, WS_CLIENT_KEY_PRODUCTION);
    const activeEnvSetting = await getWebsiteSettingString(admin, WS_ACTIVE_ENV);

    const sandboxReady = enabled && Boolean(sandboxClientKey) && (await hasPlainServerKey(admin, "sandbox"));
    const productionReady = enabled && Boolean(productionClientKey) && (await hasPlainServerKey(admin, "production"));

    // Prefer admin-selected env; fallback to production if ready, otherwise sandbox.
    const env: Env =
      activeEnvSetting === "sandbox" || activeEnvSetting === "production"
        ? (activeEnvSetting as Env)
        : productionReady
          ? "production"
          : "sandbox";
    const client_key = enabled ? (env === "production" ? productionClientKey : sandboxClientKey) : null;

    return new Response(
      JSON.stringify({
        ok: true,
        enabled,
        env,
        merchant_id: merchantId,
        client_key,
        ready: enabled ? (env === "production" ? productionReady : sandboxReady) : false,
      }),
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
