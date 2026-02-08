import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderLayout } from "@/components/order/OrderLayout";
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard";
import { PaymentConfirmDialog } from "@/components/order/PaymentConfirmDialog";
import { useOrder } from "@/contexts/OrderContext";
import { useOrderPublicSettings } from "@/hooks/useOrderPublicSettings";
import { useOrderAddOns } from "@/hooks/useOrderAddOns";
import { validatePromoCode } from "@/hooks/useOrderPromoCode";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { useMidtransOrderSettings } from "@/hooks/useMidtransOrderSettings";
import { usePaypalOrderSettings } from "@/hooks/usePaypalOrderSettings";
import { PayPalButtonsSection } from "@/components/order/PayPalButtonsSection";
import { usePackageDurations } from "@/hooks/usePackageDurations";
import { computeDiscountedTotal } from "@/lib/packageDurations";

const USD_TO_IDR_RATE = 16000;

function formatIdr(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

declare global {
  interface Window {
    MidtransNew3ds?: {
      getCardToken: (
        cardData: {
          card_number: string;
          card_exp_month: string;
          card_exp_year: string;
          card_cvv: string;
        },
        options: {
          onSuccess: (response: any) => void;
          onFailure: (response: any) => void;
        },
      ) => void;
    };
    paypal?: any;
  }
}

export default function Payment() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const { state, setPromoCode, setAppliedPromo } = useOrder();
  const { pricing, subscriptionPlans } = useOrderPublicSettings(state.domain, state.selectedPackageId);
  const { rows: durationRows } = usePackageDurations(state.selectedPackageId);
  const { total: addOnsTotal } = useOrderAddOns({ packageId: state.selectedPackageId, quantities: state.addOns ?? {} });
  const midtrans = useMidtransOrderSettings();
  const paypal = usePaypalOrderSettings();

  const [gatewayLoading, setGatewayLoading] = useState(true);
  const [gateway, setGateway] = useState<"xendit" | "midtrans" | "paypal" | null>(null);
  const [available, setAvailable] = useState<{ xendit: boolean; midtrans: boolean; paypal: boolean } | null>(null);

  const [method, setMethod] = useState<"card" | "paypal" | "bank">("card");
  const [promo, setPromo] = useState(state.promoCode);
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [paying, setPaying] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setGatewayLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke<{
          ok: boolean;
          provider: "xendit" | "midtrans" | "paypal" | null;
          providers?: { xendit: boolean; midtrans: boolean; paypal: boolean };
          reason?: string;
        }>(
          "order-payment-provider",
          { body: {} },
        );
        if (error) throw error;
        const provider = (data as any)?.provider ?? null;
        const providers = (data as any)?.providers ?? null;
        if (providers && typeof providers === "object") setAvailable(providers);
        // Keep the payment page active even if no provider is configured yet.
        // We'll show a message and disable payment actions until a gateway is available.
        if (provider === "xendit" || provider === "midtrans" || provider === "paypal") {
          setGateway(provider);
          if (provider === "paypal") setMethod("paypal");
        } else {
          setGateway(null);
        }
      } catch {
        // If provider detection fails, still keep the page accessible.
        setGateway(null);
      } finally {
        setGatewayLoading(false);
      }
    })();
  }, [navigate]);

  // Load PayPal JS SDK when PayPal is available.
  useEffect(() => {
    const desiredSrc = paypal.clientId
      ? `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypal.clientId)}&currency=USD&intent=capture`
      : null;

    const existing = document.getElementById("paypal-sdk") as HTMLScriptElement | null;

    // If no client id, ensure SDK is removed so UI doesn't get stuck with an old SDK.
    if (!desiredSrc) {
      if (existing) existing.remove();
      // Best-effort: force re-init when client id comes back.
      if (typeof window !== "undefined") {
        try {
          delete (window as any).paypal;
        } catch {
          // ignore
        }
      }
      return;
    }

    if (existing) {
      // If client-id/env changed, replace the script.
      const currentSrc = existing.getAttribute("src") ?? "";
      if (currentSrc !== desiredSrc) {
        existing.remove();
        try {
          delete (window as any).paypal;
        } catch {
          // ignore
        }
      } else {
        return;
      }
    }

    const s = document.createElement("script");
    s.id = "paypal-sdk";
    s.src = desiredSrc;
    s.async = true;
    document.body.appendChild(s);
  }, [paypal.clientId]);

  // PayPal should be usable whenever it's configured (Ready), even if provider auto-detection fails.
  const paypalButtonsEnabled = Boolean(paypal.ready && paypal.clientId);

  const discountByMonths = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of durationRows || []) {
      if (r?.is_active === false) continue;
      const months = Number((r as any).duration_months ?? 0);
      const discount = Number((r as any).discount_percent ?? 0);
      if (Number.isFinite(months) && months > 0) m.set(months, discount);
    }
    return m;
  }, [durationRows]);

  const baseTotalUsd = useMemo(() => {
    if (!state.subscriptionYears) return null;

    const months = Number(state.subscriptionYears) * 12;
    const discountPercent = discountByMonths.get(months) ?? 0;

    // Prefer Duration & Discount config (package_durations) so it matches /order/subscription.
    if (discountByMonths.size > 0) {
      const domain = pricing.domainPriceUsd ?? null;
      const pkg = pricing.packagePriceUsd ?? null;
      if (domain == null || pkg == null) return null;

      const baseAnnual = domain + pkg;
      const monthly = baseAnnual / 12;
      return computeDiscountedTotal({ monthlyPrice: monthly, months, discountPercent }) + addOnsTotal;
    }

    // Fallback to legacy website_settings.order_subscription_plans price override.
    const selectedPlan = subscriptionPlans.find((p) => p.years === state.subscriptionYears);
    const planOverrideUsd =
      typeof selectedPlan?.price_usd === "number" && Number.isFinite(selectedPlan.price_usd) ? selectedPlan.price_usd : null;
    if (planOverrideUsd != null) return planOverrideUsd + addOnsTotal;

    const domainUsd = pricing.domainPriceUsd ?? null;
    const pkgUsd = pricing.packagePriceUsd ?? null;
    if (domainUsd == null || pkgUsd == null) return null;

    return (domainUsd + pkgUsd) * state.subscriptionYears + addOnsTotal;
  }, [addOnsTotal, discountByMonths, pricing.domainPriceUsd, pricing.packagePriceUsd, state.subscriptionYears, subscriptionPlans]);

  const totalAfterPromoUsd = useMemo(() => {
    if (baseTotalUsd == null) return null;
    const d = state.appliedPromo?.discountUsd ?? 0;
    const discount = Number.isFinite(d) && d > 0 ? d : 0;
    return Math.max(0, baseTotalUsd - discount);
  }, [baseTotalUsd, state.appliedPromo?.discountUsd]);

  const totalAfterPromoIdr = useMemo(() => {
    if (totalAfterPromoUsd == null) return null;
    return Math.max(0, Math.round(totalAfterPromoUsd * USD_TO_IDR_RATE));
  }, [totalAfterPromoUsd]);


  // Auto-apply promo as user types (debounced), so Est. price updates immediately.
  useEffect(() => {
    const code = promo.trim();
    // Avoid update loops: only write to context when value actually changes.
    if (code !== state.promoCode) setPromoCode(code);

    // Clear applied promo while typing / when empty
    if (!code || baseTotalUsd == null) {
      setAppliedPromo(null);
      return;
    }

    const t = window.setTimeout(async () => {
      const res = await validatePromoCode(code, baseTotalUsd);
      if (!res.ok) {
        setAppliedPromo(null);
        return;
      }
      setAppliedPromo({
        id: res.promo.id,
        code: res.promo.code,
        promoName: res.promo.promo_name,
        discountUsd: res.discountUsd,
      });
    }, 450);

    return () => window.clearTimeout(t);
  }, [baseTotalUsd, promo, setAppliedPromo, setPromoCode, state.promoCode]);

  const canComplete = useMemo(() => {
    return Boolean(
      state.domain &&
        state.selectedTemplateId &&
        state.selectedPackageId &&
        state.subscriptionYears &&
        state.details.email &&
        state.details.acceptedTerms,
    );
  }, [
    state.details.acceptedTerms,
    state.details.email,
    state.domain,
    state.selectedPackageId,
    state.selectedTemplateId,
    state.subscriptionYears,
  ]);

  // Load Midtrans 3DS script when card method is selected.
  useEffect(() => {
    if (gateway !== "midtrans") return;
    if (method !== "card") return;
    if (!midtrans.clientKey || !midtrans.env) return;
    if (document.getElementById("midtrans-script")) return;

    const s = document.createElement("script");
    s.id = "midtrans-script";
    s.type = "text/javascript";
    s.src = "https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js";
    s.setAttribute("data-environment", midtrans.env);
    s.setAttribute("data-client-key", midtrans.clientKey);
    s.async = true;
    document.body.appendChild(s);

    return () => {
      // Keep script cached for subsequent visits (do not remove).
    };
  }, [method, midtrans.clientKey, midtrans.env]);

  const isCardFormValid = useMemo(() => {
    const num = cardNumber.replace(/\s+/g, "");
    const mm = expMonth.trim();
    const yy = expYear.trim();
    const c = cvv.trim();
    return Boolean(num.length >= 12 && num.length <= 19 && mm.length === 2 && yy.length === 4 && c.length >= 3 && c.length <= 4);
  }, [cardNumber, cvv, expMonth, expYear]);

  const startCardPayment = async () => {
    if (gateway !== "midtrans") return;
    if (!window.MidtransNew3ds?.getCardToken) {
      toast({ variant: "destructive", title: t("order.midtransNotReadyTitle"), description: t("order.pleaseWaitTryAgain") });
      return;
    }
    if (totalAfterPromoUsd == null) {
      toast({ variant: "destructive", title: t("order.totalNotAvailableTitle") });
      return;
    }

    setPaying(true);
    try {
      const cardData = {
        card_number: cardNumber.replace(/\s+/g, ""),
        card_exp_month: expMonth,
        card_exp_year: expYear,
        card_cvv: cvv,
      };

      const tokenId: string = await new Promise((resolve, reject) => {
        window.MidtransNew3ds!.getCardToken(cardData, {
          onSuccess: (res) => {
            const t = String(res?.token_id ?? "").trim();
            if (!t) return reject(new Error("Token not returned"));
            resolve(t);
          },
          onFailure: (res) => {
            reject(new Error(String(res?.status_message ?? "Failed to tokenize card")));
          },
        });
      });

      const { data, error } = await supabase.functions.invoke<{
        ok: boolean;
        order_id: string;
        redirect_url: string | null;
        transaction_status: string | null;
        error?: string;
      }>("midtrans-order-charge", {
        body: {
          token_id: tokenId,
          env: midtrans.env,
          amount_usd: totalAfterPromoUsd,
          subscription_years: state.subscriptionYears,
          promo_code: state.promoCode,
          domain: state.domain,
          selected_template_id: state.selectedTemplateId,
          selected_template_name: state.selectedTemplateName,
          customer_name: state.details.name,
          customer_email: state.details.email,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Charge failed");

      setLastOrderId(data.order_id);

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }

      toast({ title: t("order.paymentCreatedTitle"), description: `Order: ${data.order_id}` });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: t("order.paymentFailedTitle"),
        description: e?.message ?? t("order.tryAgain"),
      });
    } finally {
      setPaying(false);
      setConfirmOpen(false);
    }
  };

  const startXenditInvoice = async () => {
    if (totalAfterPromoUsd == null) {
      toast({ variant: "destructive", title: t("order.totalNotAvailableTitle") });
      return;
    }

    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        ok: boolean;
        invoice_url: string | null;
        order_db_id: string | null;
        error?: string;
      }>("xendit-invoice-create", {
        body: {
          amount_usd: totalAfterPromoUsd,
          subscription_years: state.subscriptionYears,
          promo_code: state.promoCode,
          domain: state.domain,
          selected_template_id: state.selectedTemplateId,
          selected_template_name: state.selectedTemplateName,
          customer_name: state.details.name,
          customer_email: state.details.email,
        },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error ?? "Failed to create invoice");

      if ((data as any)?.order_db_id) setLastOrderId(String((data as any).order_db_id));

      const url = String((data as any)?.invoice_url ?? "").trim();
      if (!url) throw new Error("Invoice URL not returned");
      window.location.href = url;
    } catch (e: any) {
      toast({ variant: "destructive", title: t("order.paymentFailedTitle"), description: e?.message ?? t("order.tryAgain") });
    } finally {
      setPaying(false);
      setConfirmOpen(false);
    }
  };

  if (gatewayLoading) {
    return (
      <OrderLayout title={t("order.step.payment")} step="payment" sidebar={<OrderSummaryCard />}>
        <div className="text-sm text-muted-foreground">{t("order.loadingPayment")}</div>
      </OrderLayout>
    );
  }

  return (
    <OrderLayout title={t("order.step.payment")} step="payment" sidebar={<OrderSummaryCard />}>
      <div className="space-y-6">
        {gateway == null ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("order.gatewayInactiveTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{t("order.gatewayInactiveBody")}</p>
              {available ? (
                <p className="text-muted-foreground">
                  {t("order.configStatus")}: Xendit {available.xendit ? t("common.ready") : t("common.off")} · PayPal{" "}
                  {available.paypal ? t("common.ready") : t("common.off")} · Midtrans{" "}
                  {available.midtrans ? t("common.ready") : t("common.off")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}


        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("order.paymentMethod")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gateway === "xendit" ? (
              <div className="flex gap-2">
                <Button type="button" variant="default" disabled>
                  Xendit
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button type="button" variant={method === "card" ? "default" : "outline"} onClick={() => setMethod("card")}>
                  {t("order.card")}
                </Button>
                <Button
                  type="button"
                  variant={method === "paypal" ? "default" : "outline"}
                  onClick={() => setMethod("paypal")}
                  disabled={!paypalButtonsEnabled}
                >
                  PayPal
                </Button>
                <Button type="button" variant={method === "bank" ? "default" : "outline"} onClick={() => setMethod("bank")}>
                  {t("order.bankTransfer")}
                </Button>
              </div>
            )}

            {method === "paypal" ? (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">PayPal</p>
                    <p className="text-muted-foreground">Env: {paypal.env}</p>
                  </div>
                  <span className="text-muted-foreground">{paypalButtonsEnabled ? t("common.ready") : t("order.paypalNotConfigured")}</span>
                </div>

                {paypal.error ? <p className="text-sm text-muted-foreground">{paypal.error}</p> : null}

                <PayPalButtonsSection
                  disabled={!canComplete || paying || totalAfterPromoUsd == null || !paypalButtonsEnabled}
                  payload={{
                    amount_usd: totalAfterPromoUsd ?? 0,
                    subscription_years: state.subscriptionYears ?? 0,
                    promo_code: state.promoCode,
                    domain: state.domain,
                    selected_template_id: state.selectedTemplateId,
                    selected_template_name: state.selectedTemplateName,
                    customer_name: state.details.name,
                    customer_email: state.details.email,
                  }}
                  onOrderDbId={(id) => setLastOrderId(id)}
                  onSuccess={() => navigate("/payment/success")}
                  onError={(msg) =>
                    toast({
                      variant: msg === "Canceled" ? "default" : "destructive",
                      title: msg === "Canceled" ? t("order.cancel") : t("order.paymentFailedTitle"),
                      description: msg === "Canceled" ? "" : msg,
                    })
                  }
                />

                {lastOrderId ? (
                  <p className="text-sm text-muted-foreground">
                    Last order id: <span className="font-medium text-foreground">{lastOrderId}</span>
                  </p>
                ) : null}
              </div>
            ) : method === "card" ? (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">
                      {gateway === "xendit" ? "Xendit Invoice" : gateway === "midtrans" ? "Midtrans Card (3DS)" : "Card"}
                    </p>
                    {gateway === "midtrans" ? <p className="text-muted-foreground">Env: {midtrans.env}</p> : null}
                  </div>
                  <span className="text-muted-foreground">{gateway === "xendit" ? t("common.hosted") : midtrans.ready ? t("common.ready") : t("order.paypalNotConfigured")}</span>
                </div>

                {gateway === "midtrans" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder={t("order.cardNumber")}
                        inputMode="numeric"
                        autoComplete="cc-number"
                      />
                    </div>
                    <Input
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      placeholder="MM"
                      inputMode="numeric"
                      autoComplete="cc-exp-month"
                    />
                    <Input
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="YYYY"
                      inputMode="numeric"
                      autoComplete="cc-exp-year"
                    />
                    <Input
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="CVV"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Kamu akan diarahkan ke halaman pembayaran Xendit (Invoice) untuk menyelesaikan pembayaran.</p>
                )}

                {gateway === "midtrans" && midtrans.error ? <p className="text-sm text-muted-foreground">{midtrans.error}</p> : null}
                {lastOrderId ? (
                  <p className="text-sm text-muted-foreground">
                    Last order id: <span className="font-medium text-foreground">{lastOrderId}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Bank transfer flow can be added next. For now, please choose Card.
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder={t("order.promoCode")} />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const code = promo.trim();
                  setPromoCode(code);
                  if (!code) {
                    setAppliedPromo(null);
                    toast({ title: t("order.promoCleared") });
                    return;
                  }
                  if (baseTotalUsd == null) {
                    setAppliedPromo(null);
                    toast({ variant: "destructive", title: t("order.unableApplyPromo"), description: t("order.totalNotAvailableYet") });
                    return;
                  }

                  const res = await validatePromoCode(code, baseTotalUsd);
                  if (!res.ok) {
                    setAppliedPromo(null);
                    toast({ variant: "destructive", title: t("order.invalidPromo"), description: t("order.promoNotFound") });
                    return;
                  }

                  setAppliedPromo({
                    id: res.promo.id,
                    code: res.promo.code,
                    promoName: res.promo.promo_name,
                    discountUsd: res.discountUsd,
                  });
                  toast({ title: t("order.promoApplied"), description: `${res.promo.promo_name} (-$${res.discountUsd.toFixed(2)})` });
                }}
              >
                {t("order.apply")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("order.finalReview")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border p-4">
              <p className="font-medium text-foreground">{t("order.priceBreakdown")}</p>
              <dl className="mt-3 grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{t("order.amount")}</dt>
                  <dd className="font-medium text-foreground">
                    {totalAfterPromoIdr == null ? "—" : formatIdr(totalAfterPromoIdr)}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="text-muted-foreground">{t("order.reviewNote")}</p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/order/subscription")}>
            {t("common.back")}
          </Button>
          {method === "card" ? (
            <PaymentConfirmDialog
              open={confirmOpen}
              onOpenChange={(o) => {
                if (paying) return;
                setConfirmOpen(o);
              }}
              confirming={paying}
              disabled={
                gateway == null ||
                !canComplete ||
                paying ||
                totalAfterPromoUsd == null ||
                (gateway === "midtrans" ? !midtrans.ready || !isCardFormValid : false)
              }
              amountUsdFormatted={totalAfterPromoIdr == null ? "—" : formatIdr(totalAfterPromoIdr)}
              triggerText={gateway === "xendit" ? t("order.payWithXendit") : t("order.payWithCard")}
              confirmText={gateway === "xendit" ? t("order.confirmContinue") : t("order.confirmAndPay")}
              note={gateway === "xendit" ? t("order.redirectXendit") : t("order.midtransIdrNote")}
              onConfirm={gateway === "xendit" ? startXenditInvoice : startCardPayment}
            />
          ) : null}
        </div>
      </div>
    </OrderLayout>
  );
}
