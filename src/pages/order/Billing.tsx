import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { OrderLayout } from "@/components/order/OrderLayout";
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard";
import { XenditPaymentMethodCard } from "@/components/order/XenditPaymentMethodCard";
import { PaymentConfirmDialog } from "@/components/order/PaymentConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/contexts/OrderContext";
import { useOrderPublicSettings } from "@/hooks/useOrderPublicSettings";
import { useOrderAddOns } from "@/hooks/useOrderAddOns";
import { useSubscriptionAddOns } from "@/hooks/useSubscriptionAddOns";
import { validatePromoCode } from "@/hooks/useOrderPromoCode";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/useI18n";
import { usePackageDurations } from "@/hooks/usePackageDurations";
import { computeDiscountedTotal } from "@/lib/packageDurations";
import { createXenditInvoice } from "@/lib/orderPayments";

function formatIdr(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

export default function Billing() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const { state, setPromoCode, setAppliedPromo } = useOrder();
  const { pricing, subscriptionPlans } = useOrderPublicSettings(state.domain, state.selectedPackageId);

  const effectivePackageId = state.selectedPackageId ?? pricing.defaultPackageId ?? null;
  const { rows: durationRows } = usePackageDurations(effectivePackageId);
  const { total: packageAddOnsTotal } = useOrderAddOns({ packageId: effectivePackageId, quantities: state.addOns ?? {} });
  const { total: subscriptionAddOnsTotal } = useSubscriptionAddOns({ selected: state.subscriptionAddOns ?? {}, packageId: effectivePackageId });
  const addOnsTotal = packageAddOnsTotal + subscriptionAddOnsTotal;

  const [promo, setPromo] = useState(state.promoCode);
  const [paying, setPaying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

    // Prefer Duration & Discount config (package_durations)
    if (discountByMonths.size > 0) {
      const domain = pricing.domainPriceUsd ?? null;
      const pkg = pricing.packagePriceUsd ?? null;
      if (domain == null || pkg == null) return null;

      const baseAnnual = domain + pkg;
      const monthly = baseAnnual / 12;
      return computeDiscountedTotal({ monthlyPrice: monthly, months, discountPercent }) + addOnsTotal;
    }

    // Fallback to website_settings.order_subscription_plans
    const selectedPlan = (subscriptionPlans || []).find((p: any) => Number(p?.years) === Number(state.subscriptionYears));
    const planOverrideUsd = (() => {
      const v = Number((selectedPlan as any)?.price_usd);
      return Number.isFinite(v) ? v : null;
    })();
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
    return Math.max(0, Math.round(totalAfterPromoUsd));
  }, [totalAfterPromoUsd]);

  useEffect(() => {
    const code = promo.trim();
    if (code !== state.promoCode) setPromoCode(code);

    if (!code || baseTotalUsd == null) {
      setAppliedPromo(null);
      return;
    }

    const tt = window.setTimeout(async () => {
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

    return () => window.clearTimeout(tt);
  }, [baseTotalUsd, promo, setAppliedPromo, setPromoCode, state.promoCode]);

  const canComplete = useMemo(() => {
    const email = String(state.details.email ?? "").trim();
    return Boolean(state.domain && state.selectedTemplateId && effectivePackageId && state.subscriptionYears && email && state.details.acceptedTerms);
  }, [effectivePackageId, state.details.acceptedTerms, state.details.email, state.domain, state.selectedTemplateId, state.subscriptionYears]);

  const startXenditInvoice = async () => {
    if (totalAfterPromoIdr == null) {
      toast({ variant: "destructive", title: t("order.totalNotAvailableTitle") });
      return;
    }

    setPaying(true);
    try {
      const res = await createXenditInvoice({
        amount_idr: totalAfterPromoIdr,
        subscription_years: state.subscriptionYears ?? 0,
        promo_code: state.promoCode,
        domain: state.domain,
        selected_template_id: state.selectedTemplateId ?? "",
        selected_template_name: state.selectedTemplateName ?? "",
        customer_name: state.details.name,
        customer_email: state.details.email,
      });
      window.location.href = res.invoiceUrl;
    } catch (e: any) {
      toast({ variant: "destructive", title: t("order.paymentFailedTitle"), description: e?.message ?? t("order.tryAgain") });
    } finally {
      setPaying(false);
      setConfirmOpen(false);
    }
  };

  return (
    <OrderLayout title="Billing" step="payment" flow="plan" sidebar={<OrderSummaryCard />}>
      <div className="space-y-6">
        <XenditPaymentMethodCard
          title={t("order.paymentMethod")}
          promo={promo}
          onPromoChange={setPromo}
          applyingDisabled={paying}
          onApplyPromo={async () => {
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
        />

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
                  <dd className="font-medium text-foreground">{totalAfterPromoIdr == null ? "—" : formatIdr(totalAfterPromoIdr)}</dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/order/subscribe")}
          >
            Kembali
          </Button>
          <PaymentConfirmDialog
            open={confirmOpen}
            onOpenChange={(o) => {
              if (paying) return;
              setConfirmOpen(o);
            }}
            confirming={paying}
            disabled={paying || totalAfterPromoIdr == null}
            amountUsdFormatted={totalAfterPromoIdr == null ? "—" : formatIdr(totalAfterPromoIdr)}
            triggerText={t("order.payWithXendit")}
            confirmText={t("order.confirmContinue")}
            note={t("order.redirectXendit")}
            onConfirm={async () => {
              if (!canComplete) {
                toast({ variant: "destructive", title: t("order.completeOrderTitle"), description: t("order.completeOrderBody") });
                setConfirmOpen(false);
                return;
              }
              return await startXenditInvoice();
            }}
          />
        </div>
      </div>
    </OrderLayout>
  );
}
