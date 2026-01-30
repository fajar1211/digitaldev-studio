import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

// Keep consistent with Midtrans flow.
const USD_TO_IDR_RATE = 16000;

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

async function getPlainXenditKey(admin: any): Promise<string> {
  const { data, error } = await admin
    .from("integration_secrets")
    .select("ciphertext,iv")
    .eq("provider", "xendit")
    .eq("name", "api_key")
    .maybeSingle();
  if (error) throw error;
  const iv = String((data as any)?.iv ?? "");
  const key = iv === "plain" ? String((data as any)?.ciphertext ?? "") : "";
  if (!key.trim()) throw new Error("Xendit API key not configured");
  return key.trim();
}

function xenditBasicAuth(apiKey: string) {
  // Xendit uses Basic auth with API key as username.
  return `Basic ${btoa(`${apiKey}:`)}`;
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
    const apiKey = await getPlainXenditKey(admin);

    const amount_idr = Math.max(1, Math.round(amount_usd * USD_TO_IDR_RATE));
    const external_id = `ema-xendit-${crypto.randomUUID()}`;

    // Create DB order first (reuse existing schema; store provider as xendit).
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
        payment_provider: "xendit",
        payment_env: null,
      })
      .select("id")
      .maybeSingle();
    if (orderErr) throw orderErr;

    // Create Xendit invoice.
    const invoiceRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: xenditBasicAuth(apiKey),
      },
      body: JSON.stringify({
        external_id,
        amount: amount_idr,
        currency: "IDR",
        description: `Order ${domain} (${subscription_years} year) – USD ${amount_usd.toFixed(2)} (charged in IDR)`,
        payer_email: customer_email,
        customer: {
          given_names: customer_name,
          email: customer_email,
        },
        should_send_email: true,
        metadata: {
          order_db_id: (orderRow as any)?.id ?? null,
          domain,
          selected_template_id,
        },
      }),
    });

    const invoiceText = await invoiceRes.text();
    const invoiceJson = (() => {
      try {
        return JSON.parse(invoiceText);
      } catch {
        return { raw: invoiceText };
      }
    })();

    if (!invoiceRes.ok) {
      // Best-effort mark failed.
      if ((orderRow as any)?.id) {
        await admin.from("orders").update({ status: "failed" }).eq("id", (orderRow as any).id);
      }

      return new Response(JSON.stringify({ ok: false, error: "Xendit invoice create failed", xendit: invoiceJson }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoice_url = typeof (invoiceJson as any)?.invoice_url === "string" ? (invoiceJson as any).invoice_url : null;

    return new Response(
      JSON.stringify({ ok: true, order_db_id: (orderRow as any)?.id ?? null, invoice_url, xendit: { id: (invoiceJson as any)?.id ?? null } }),
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
