import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Env = "sandbox" | "production";

const WS_MIDTRANS_ENABLED = "midtrans_enabled";
const WS_MIDTRANS_MERCHANT_ID = "midtrans_merchant_id";
const WS_MIDTRANS_CLIENT_KEY_SANDBOX = "midtrans_client_key_sandbox";
const WS_MIDTRANS_CLIENT_KEY_PRODUCTION = "midtrans_client_key_production";
const WS_MIDTRANS_ACTIVE_ENV = "midtrans_active_env";

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

async function hasPlainSecret(admin: any, provider: string, name: string): Promise<boolean> {
  const { data, error } = await admin
    .from("integration_secrets")
    .select("ciphertext,iv")
    .eq("provider", provider)
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  return String((data as any).iv ?? "") === "plain" && Boolean(String((data as any).ciphertext ?? "").trim());
}

async function hasMidtransServerKey(admin: any, env: Env) {
  return hasPlainSecret(admin, "midtrans", env === "sandbox" ? "server_key_sandbox" : "server_key_production");
}

async function getMidtransClientKey(admin: any, env: Env): Promise<string | null> {
  const v = await getWebsiteSetting(admin, env === "sandbox" ? WS_MIDTRANS_CLIENT_KEY_SANDBOX : WS_MIDTRANS_CLIENT_KEY_PRODUCTION);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

async function hasPaypalClientSecret(admin: any, env: Env): Promise<boolean> {
  return hasPlainSecret(admin, "paypal", env === "sandbox" ? "client_secret_sandbox" : "client_secret_production");
}

async function getPaypalClientId(admin: any, env: Env): Promise<string | null> {
  const v = await getWebsiteSetting(admin, env === "sandbox" ? WS_PAYPAL_CLIENT_ID_SANDBOX : WS_PAYPAL_CLIENT_ID_PRODUCTION);
  return typeof v === "string" && v.trim() ? v.trim() : null;
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

    // Compute readiness for all gateways.
    const xenditReady = await hasPlainSecret(admin, "xendit", "api_key");

    const paypalEnvRaw = await getWebsiteSetting(admin, WS_PAYPAL_ACTIVE_ENV);
    const paypalEnv: Env = paypalEnvRaw === "sandbox" || paypalEnvRaw === "production" ? paypalEnvRaw : "sandbox";

    const paypalEnabledValue = await getWebsiteSetting(admin, WS_PAYPAL_ENABLED);
    const paypalEnabled = jsonBool(paypalEnabledValue, true);
    const paypalClientId = await getPaypalClientId(admin, paypalEnv);
    const paypalSecretOk = await hasPaypalClientSecret(admin, paypalEnv);
    const paypalReady = paypalEnabled && Boolean(paypalClientId && paypalSecretOk);

    // Midtrans only if enabled AND ready.
    const enabledValue = await getWebsiteSetting(admin, WS_MIDTRANS_ENABLED);
    const midtransEnabled = jsonBool(enabledValue, true);

    const activeEnvRaw = await getWebsiteSetting(admin, WS_MIDTRANS_ACTIVE_ENV);
    const activeEnv: Env = activeEnvRaw === "sandbox" || activeEnvRaw === "production" ? activeEnvRaw : "production";

    const merchantIdRaw = await getWebsiteSetting(admin, WS_MIDTRANS_MERCHANT_ID);
    const merchantId = typeof merchantIdRaw === "string" && merchantIdRaw.trim() ? merchantIdRaw.trim() : null;
    const clientKey = await getMidtransClientKey(admin, activeEnv);
    const serverKeyOk = await hasMidtransServerKey(admin, activeEnv);
    const midtransReady = midtransEnabled && Boolean(merchantId && clientKey && serverKeyOk);

    const providers = {
      xendit: xenditReady,
      paypal: paypalReady,
      midtrans: midtransReady,
    };

    const preferred = xenditReady ? ("xendit" as const) : paypalReady ? ("paypal" as const) : midtransReady ? ("midtrans" as const) : null;

    return new Response(
      JSON.stringify({ ok: true, provider: preferred, providers }),
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
