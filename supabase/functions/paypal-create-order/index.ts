import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Env = "sandbox" | "production";

type Payload = {
  amount_usd: number;
  subscription_years: number;
  promo_code?: string;
  domain: string;
  selected_template_id: string;
  selected_template_name?: string;
  customer_name: string;
  customer_email: string;
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

function asTrimmedString(v: unknown, max = 255): string {
  const s = String(v ?? "").trim();
  if (!s) throw new Error("Missing required field");
  return s.slice(0, max);
}

function asEmail(v: unknown): string {
  const s = asTrimmedString(v, 255);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error("Invalid email");
  return s;
}

function asPositiveNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid amount");
  return n;
}

function asPositiveInt(v: unknown, max = 120): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0 || n > max) throw new Error("Invalid value");
  return n;
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
    const amount_usd = asPositiveNumber(body.amount_usd);
    const subscription_years = asPositiveInt(body.subscription_years, 10);
    const promo_code = String(body.promo_code ?? "").trim().slice(0, 64) || null;
    const domain = asTrimmedString(body.domain, 253);
    const selected_template_id = asTrimmedString(body.selected_template_id, 80);
    const selected_template_name = String(body.selected_template_name ?? "").trim().slice(0, 120) || null;
    const customer_name = asTrimmedString(body.customer_name, 120);
    const customer_email = asEmail(body.customer_email);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const creds = await getPaypalCredentials(admin);
    const { base, token } = await getAccessToken({ env: creds.env, clientId: creds.client_id, clientSecret: creds.client_secret });

    // Create DB order (pending) first.
    const { data: orderRow, error: orderErr } = await admin
      .from("orders")
      .insert({
        domain,
        design: selected_template_name,
        customer_email,
        customer_name,
        status: "pending",
        billing_cycle: `${subscription_years}y`,
        subscription_years,
        promo_code,
        amount_usd,
        amount: amount_usd,
        payment_provider: "paypal",
        payment_env: creds.env,
      })
      .select("id")
      .maybeSingle();
    if (orderErr) throw orderErr;

    const createRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "PayPal-Request-Id": `ema-paypal-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: (orderRow as any)?.id ?? undefined,
            description: `Order ${domain} (${subscription_years} year)`,
            custom_id: (orderRow as any)?.id ?? undefined,
            amount: {
              currency_code: "USD",
              value: amount_usd.toFixed(2),
            },
          },
        ],
        application_context: {
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      }),
    });

    const createText = await createRes.text();
    const createJson = (() => {
      try {
        return JSON.parse(createText);
      } catch {
        return { raw: createText };
      }
    })();

    if (!createRes.ok) {
      if ((orderRow as any)?.id) {
        await admin.from("orders").update({ status: "failed" }).eq("id", (orderRow as any).id);
      }
      return new Response(JSON.stringify({ ok: false, error: "PayPal create order failed", paypal: createJson }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paypal_order_id = String((createJson as any)?.id ?? "").trim();
    if (!paypal_order_id) throw new Error("PayPal order id missing");

    return new Response(
      JSON.stringify({ ok: true, paypal_order_id, order_db_id: (orderRow as any)?.id ?? null, env: creds.env, meta: { selected_template_id } }),
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
