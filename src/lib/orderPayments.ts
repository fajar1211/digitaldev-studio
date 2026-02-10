import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const xenditInvoicePayloadSchema = z.object({
  amount_idr: z.number().finite().positive(),
  subscription_years: z.number().int().positive(),
  promo_code: z.string().trim().max(64).optional().default(""),
  domain: z.string().trim().min(1).max(253),
  selected_template_id: z.string().trim().min(1).max(128),
  selected_template_name: z.string().trim().max(200).optional().default(""),
  customer_name: z.string().trim().min(1).max(120),
  customer_email: z.string().trim().email().max(255),
});

export async function createXenditInvoice(raw: z.input<typeof xenditInvoicePayloadSchema>) {
  const payload = xenditInvoicePayloadSchema.parse(raw);

  const { data, error } = await supabase.functions.invoke<{
    ok: boolean;
    invoice_url: string | null;
    order_db_id: string | null;
    error?: string;
    xendit?: any;
  }>("xendit-invoice-create", {
    body: {
      // Edge function uses legacy key name `amount_usd` but it is IDR in our app.
      amount_usd: payload.amount_idr,
      subscription_years: payload.subscription_years,
      promo_code: payload.promo_code,
      domain: payload.domain,
      selected_template_id: payload.selected_template_id,
      selected_template_name: payload.selected_template_name,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
    },
  });

  if (error) {
    const rawMsg = String((error as any)?.message ?? "");
    const looksForbidden = /forbidden|REQUEST_FORBIDDEN_ERROR/i.test(rawMsg);
    const friendly = looksForbidden
      ? "Xendit menolak request karena API Key tidak punya izin untuk membuat Invoice. Silakan atur permission API Key (akses Invoices/v2) atau buat Secret Key baru di Xendit Dashboard, lalu update di Super Admin → Integrations → Xendit."
      : rawMsg || "Gagal membuat invoice";
    throw new Error(friendly);
  }

  if (!(data as any)?.ok) {
    const msg = String((data as any)?.error ?? "").trim() || "Failed to create invoice";
    throw new Error(msg);
  }

  const invoiceUrl = String((data as any)?.invoice_url ?? "").trim();
  if (!invoiceUrl) throw new Error("Invoice URL not returned");

  return {
    invoiceUrl,
    orderDbId: (data as any)?.order_db_id ? String((data as any)?.order_db_id) : null,
  };
}
