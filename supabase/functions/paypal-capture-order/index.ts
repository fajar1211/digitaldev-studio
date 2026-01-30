import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Env = "sandbox" | "production";

type Payload = {
  paypal_order_id: string;
  order_db_id: string;
};

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

function asId(v: unknown, label: string, max = 128) {
  const s = String(v ?? "").trim();
  if (!s) throw new Error(`${label} is required`);
  if (/\s/.test(s) || s.length > max) throw new Error(`Invalid ${label}`);
  return s;
}

async function getWebsiteSetting(admin: any, key: string): Promise<unknown> {
  const { data, error } = await admin.from("website_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return (data as any)?.value;
}

async function getPaypalCredentials(admin: any) {
  const enabledRaw = await getWebsiteSetting(admin, WS_PAYPAL_ENABLED);
  const enabled = jsonBool(enabledRaw, true);
  if (!enabled) throw new Error("PayPal is disabled");

  const envRaw = await getWebsiteSetting(admin, WS_PAYPAL_ACTIVE_ENV);
  const env: Env = envRaw === "sandbox" || envRaw === "production" ? envRaw : "sandbox";

  const clientIdRaw = await getWebsiteSetting(admin, env === "sandbox" ? WS_PAYPAL_CLIENT_ID_SANDBOX : WS_PAYPAL_CLIENT_ID_PRODUCTION);
  const client_id = typeof clientIdRaw === "string" && clientIdRaw.trim() ? clientIdRaw.trim() : null;

  const secretName = env === "sandbox" ? "client_secret_sandbox" : "client_secret_production";
  const { data, error } = await admin
    .from("integration_secrets")
    .select("ciphertext,iv")
    .eq("provider", "paypal")
    .eq("name", secretName)
    .maybeSingle();
  if (error) throw error;
  const secret = data && String((data as any).iv ?? "") === "plain" ? String((data as any).ciphertext ?? "").trim() : "";

  if (!client_id || !secret) throw new Error("PayPal is not configured");
  return { env, client_id, client_secret: secret };
}

async function getAccessToken(params: { env: Env; clientId: string; clientSecret: string }) {
  const base = params.env === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
  const auth = `Basic ${btoa(`${params.clientId}:${params.clientSecret}`)}`;
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Accept-Language": "en_US",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const text = await res.text();
  const json = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  })();
  if (!res.ok) throw new Error(String((json as any)?.error_description ?? (json as any)?.message ?? "Failed to get PayPal token"));
  const token = String((json as any)?.access_token ?? "").trim();
  if (!token) throw new Error("PayPal access token missing");
  return { base, token };
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

    const body = (await req.json()) as Partial<Payload>;
    const paypal_order_id = asId(body.paypal_order_id, "paypal_order_id");
    const order_db_id = asId(body.order_db_id, "order_db_id");

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const creds = await getPaypalCredentials(admin);
    const { base, token } = await getAccessToken({ env: creds.env, clientId: creds.client_id, clientSecret: creds.client_secret });

    const captureRes = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(paypal_order_id)}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const captureText = await captureRes.text();
    const captureJson = (() => {
      try {
        return JSON.parse(captureText);
      } catch {
        return { raw: captureText };
      }
    })();

    if (!captureRes.ok) {
      await admin.from("orders").update({ status: "failed" }).eq("id", order_db_id);
      return new Response(JSON.stringify({ ok: false, error: "PayPal capture failed", paypal: captureJson }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("orders").update({ status: "paid" }).eq("id", order_db_id);

    return new Response(JSON.stringify({ ok: true, paypal: { id: paypal_order_id, status: (captureJson as any)?.status ?? null } }), {
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
