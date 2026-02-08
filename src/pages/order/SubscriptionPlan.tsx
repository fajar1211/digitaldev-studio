import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { OrderLayout } from "@/components/order/OrderLayout";
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard";
import { OrderWebsitePackagesCards } from "@/components/order/OrderWebsitePackagesCards";
import { OrderPackageAddOns } from "@/components/order/OrderPackageAddOns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOrder } from "@/contexts/OrderContext";
import { useOrderPublicSettings } from "@/hooks/useOrderPublicSettings";
import { useI18n } from "@/hooks/useI18n";

function formatIdr(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

export default function SubscriptionPlan() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { state, setSubscriptionYears } = useOrder();
  const { pricing, subscriptionPlans } = useOrderPublicSettings(state.domain, state.selectedPackageId);

  const baseAnnualUsd = useMemo(() => {
    const domain = pricing.domainPriceUsd ?? 0;
    const pkg = pricing.packagePriceUsd ?? 0;
    return domain + pkg;
  }, [pricing.domainPriceUsd, pricing.packagePriceUsd]);

  const options = useMemo(
    () =>
      subscriptionPlans.map((p) => ({
        years: p.years,
        label: p.label,
        totalUsd:
          typeof (p as any)?.price_usd === "number" && Number.isFinite((p as any).price_usd)
            ? Number((p as any).price_usd)
            : baseAnnualUsd > 0
              ? baseAnnualUsd * p.years
              : null,
      })),
    [baseAnnualUsd, subscriptionPlans],
  );

  const selected = state.subscriptionYears;

  return (
    <OrderLayout title={t("order.step.plan")} step="plan" sidebar={<OrderSummaryCard />}>
      <div className="space-y-6">
        <OrderWebsitePackagesCards />

        {state.selectedPackageId ? <OrderPackageAddOns /> : null}

        <div id="order-duration" />

        {state.selectedPackageId ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{t("order.chooseDuration")}</CardTitle>
                    {state.selectedPackageName ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Paket terpilih: <span className="text-foreground font-medium">{state.selectedPackageName}</span>
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("order-packages")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    Ganti paket
                  </Button>
                </div>
              </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("order.includesCosts")}</p>

              <div className="grid gap-3 sm:grid-cols-3">
                {options.map((opt) => {
                  const isSelected = selected === opt.years;
                  return (
                    <button
                      key={opt.years}
                      type="button"
                      onClick={() => setSubscriptionYears(opt.years)}
                      className={cn(
                        "w-full rounded-xl border bg-card p-4 text-left shadow-soft transition will-change-transform",
                        isSelected ? "ring-2 ring-ring bg-accent/30 shadow-lg scale-[1.01]" : "hover:bg-muted/30 hover:shadow",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-foreground">{opt.label ?? `${opt.years} Years`}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{t("order.allIn")}</p>
                        </div>
                        {isSelected ? (
                          <Badge variant="secondary">{t("order.selected")}</Badge>
                        ) : (
                          <Badge variant="outline">Plan</Badge>
                        )}
                      </div>

                      <div className="mt-4">
                        <p className="text-2xl font-bold text-foreground">{opt.totalUsd == null ? "—" : formatIdr(opt.totalUsd)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t("order.totalFor", { years: opt.years })}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {pricing.packagePriceUsd == null ? <p className="text-xs text-muted-foreground">{t("order.noteDefaultPackage")}</p> : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">Silakan pilih paket terlebih dulu untuk melihat pilihan durasi.</p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/order/details")}>
            {t("common.back")}
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!state.selectedPackageId || !selected}
            onClick={() => navigate("/order/payment")}
          >
            {t("order.continuePayment")}
          </Button>
        </div>
      </div>
    </OrderLayout>
  );
}
