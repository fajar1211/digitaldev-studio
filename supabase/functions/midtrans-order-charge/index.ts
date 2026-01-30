import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Env = "sandbox" | "production";

type Payload = {
  token_id: string;
  env?: Env;
  amount_usd: number;
  subscription_years: number;
  promo_code?: string;
  domain: string;
  selected_template_id: string;
  selected_template_name?: string;
  customer_name: string;
  customer_email: string;
};

// Fixed exchange rate for US-facing checkout.
// IMPORTANT: Keep in sync with frontend display.
const USD_TO_IDR_RATE = 16000;

const WS_MIDTRANS_ENABLED = "midtrans_enabled";

async function getWebsiteSettingValue(admin: any, key: string): Promise<unknown> {
  const { data, error } = await admin.from("website_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return (data as any)?.value;
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

function isEnv(v: unknown): v is Env {
  return v === "sandbox" || v === "production";
}

function asTrimmedString(v: unknown, max = 255): string {
  const s = String(v ?? "").trim();
  if (!s) throw new Error("Missing required field");
  return s.slice(0, max);
}

function asEmail(v: unknown): string {
  const s = asTrimmedString(v, 255);
  // Minimal email validation; do not over-restrict.
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

function midtransBaseUrl(env: Env) {
  return env === "sandbox" ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com";
}

async function getPlainServerKey(admin: any, env: Env): Promise<string> {
  const name = env === "sandbox" ? "server_key_sandbox" : "server_key_production";
  const { data, error } = await admin
    .from("integration_secrets")
    .select("ciphertext,iv")
    .eq("provider", "midtrans")
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  const iv = String((data as any)?.iv ?? "");
  const key = iv === "plain" ? String((data as any)?.ciphertext ?? "") : "";
  if (!key.trim()) throw new Error("Midtrans server key not configured");
  return key.trim();
}

function formatUsdCompact(amount: number): string {
  // $2,000 (no decimals) for clear item naming.
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback
    const rounded = Math.round(amount);
    return `$${rounded.toLocaleString("en-US")}`;
  }
}

async function inferEnv(admin: any): Promise<Env> {
  // Prefer production if production server key exists.
  const prodOk = await getPlainServerKey(admin, "production").then(
    () => true,
    () => false,
  );
  return prodOk ? "production" : "sandbox";
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

    const token_id = asTrimmedString(body.token_id, 200);
    const amount_usd = asPositiveNumber(body.amount_usd);
    const subscription_years = asPositiveInt(body.subscription_years, 10);
    const promo_code = String(body.promo_code ?? "").trim().slice(0, 64) || null;
    const domain = asTrimmedString(body.domain, 253);
    const selected_template_id = asTrimmedString(body.selected_template_id, 80);
    const selected_template_name = String(body.selected_template_name ?? "").trim().slice(0, 120) || null;
    const customer_name = asTrimmedString(body.customer_name, 120);
    const customer_email = asEmail(body.customer_email);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const enabledValue = await getWebsiteSettingValue(admin, WS_MIDTRANS_ENABLED);
    const enabled = jsonBool(enabledValue, true);
    if (!enabled) {
      return new Response(JSON.stringify({ ok: false, error: "Midtrans is disabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env: Env = isEnv(body.env) ? body.env : await inferEnv(admin);
    const serverKey = await getPlainServerKey(admin, env);
    const amount_idr = Math.max(1, Math.round(amount_usd * USD_TO_IDR_RATE));

    const order_id = `ema-${crypto.randomUUID()}`;

    // Create DB order (public orders table) first.
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
        amount_idr,
        payment_provider: "midtrans",
        payment_env: env,
        midtrans_order_id: order_id,
      })
      .select("id,user_id")
      .maybeSingle();
    if (orderErr) throw orderErr;

    const auth = btoa(`${serverKey}:`);
    const usdLabel = formatUsdCompact(amount_usd);
    const chargeRes = await fetch(`${midtransBaseUrl(env)}/v2/charge`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        // Midtrans must receive only IDR values.
        currency: "IDR",
        payment_type: "credit_card",
        transaction_details: {
          order_id,
          gross_amount: amount_idr,
        },
        item_details: [
          {
            id: selected_template_id,
            price: amount_idr,
            quantity: 1,
            name: `Service Package – ${usdLabel} USD (charged in IDR)`,
          },
        ],
        credit_card: {
          token_id,
          authentication: true,
        },
        customer_details: {
          first_name: customer_name,
          email: customer_email,
        },
      }),
    });

    const chargeText = await chargeRes.text();
    const chargeJson = (() => {
      try {
        return JSON.parse(chargeText);
      } catch {
        return { raw: chargeText };
      }
    })();

    if (!chargeRes.ok) {
      // Best-effort update order status.
      await admin
        .from("orders")
        .update({
          status: "failed",
          midtrans_transaction_status: "failed",
        })
        .eq("midtrans_order_id", order_id);

      return new Response(
        JSON.stringify({
          ok: false,
          order_id,
          error: "Midtrans charge failed",
          midtrans: chargeJson,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const redirect_url = typeof (chargeJson as any)?.redirect_url === "string" ? (chargeJson as any).redirect_url : null;
    const transaction_id = typeof (chargeJson as any)?.transaction_id === "string" ? (chargeJson as any).transaction_id : null;
    const payment_type = typeof (chargeJson as any)?.payment_type === "string" ? (chargeJson as any).payment_type : null;
    const transaction_status = typeof (chargeJson as any)?.transaction_status === "string" ? (chargeJson as any).transaction_status : null;
    const fraud_status = typeof (chargeJson as any)?.fraud_status === "string" ? (chargeJson as any).fraud_status : null;

    await admin
      .from("orders")
      .update({
        midtrans_transaction_id: transaction_id,
        midtrans_payment_type: payment_type,
        midtrans_transaction_status: transaction_status,
        midtrans_fraud_status: fraud_status,
        midtrans_redirect_url: redirect_url,
      })
      .eq("midtrans_order_id", order_id);

    return new Response(
      JSON.stringify({
        ok: true,
        order_id,
        order_db_id: (orderRow as any)?.id ?? null,
        user_id: (orderRow as any)?.user_id ?? null,
        env,
        amount_idr,
        redirect_url,
        transaction_status,
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
