import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { OrderLayout } from "@/components/order/OrderLayout";
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard";
import { OrderSubscriptionAddOns } from "@/components/order/OrderSubscriptionAddOns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOrder } from "@/contexts/OrderContext";
import { useOrderPublicSettings } from "@/hooks/useOrderPublicSettings";
import { computeDiscountedTotal } from "@/lib/packageDurations";

function formatIdr(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

function isMonthlyPackageName(name: string | null) {
  const n = String(name ?? "").toLowerCase().trim();
  return n === "full digital marketing" || n === "blog + social media";
}

export default function Subscribe() {
  const navigate = useNavigate();
  const { state, setSubscriptionYears } = useOrder();
  const { subscriptionPlans, pricing, durationRows } = useOrderPublicSettings(state.domain, state.selectedPackageId);

  const isMonthly = useMemo(() => isMonthlyPackageName(state.selectedPackageName), [state.selectedPackageName]);
  const monthlyBase = pricing.packagePriceUsd ?? null;

  const options = useMemo(() => {
    if (isMonthly && monthlyBase != null) {
      const discountByMonths = new Map<number, number>();
      for (const r of durationRows || []) {
        if ((r as any)?.is_active === false) continue;
        const months = Number((r as any)?.duration_months ?? 0);
        const discount = Number((r as any)?.discount_percent ?? 0);
        if (Number.isFinite(months) && months > 0) discountByMonths.set(months, discount);
      }

      return [1, 2, 3].map((years) => {
        const months = years * 12;
        const discountPercent = discountByMonths.get(months) ?? 0;
        const priceIdr = computeDiscountedTotal({ monthlyPrice: monthlyBase, months, discountPercent });
        return {
          years,
          months,
          discountPercent,
          label: `Durasi ${years} Tahun`,
          priceIdr,
          isActive: true,
          sortOrder: years,
        };
      });
    }

    return (subscriptionPlans || [])
      .map((p: any) => {
        const years = Number(p?.years ?? 0);
        const label = String(p?.label ?? "").trim();
        const priceIdr = Number(p?.price_usd ?? 0);
        const isActive = p?.is_active !== false;
        const sortOrderRaw = (p as any)?.sort_order;
        const sortOrder = Number.isFinite(Number(sortOrderRaw)) ? Number(sortOrderRaw) : years || 0;

        return {
          years,
          label,
          priceIdr,
          isActive,
          sortOrder,
        };
      })
      .filter((opt) => opt.years > 0 && opt.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [durationRows, isMonthly, monthlyBase, subscriptionPlans]);

  const selected = state.subscriptionYears;

  return (
    <OrderLayout title="Subscribe" step="plan" flow="plan" sidebar={<OrderSummaryCard />}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base">Pilih Durasi</CardTitle>
                {state.selectedPackageName ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Plan terpilih: <span className="text-foreground font-medium">{state.selectedPackageName}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Harga sudah termasuk biaya setup & langganan sesuai durasi.</p>

            {options.length ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {options.map((opt) => {
                  const isSelected = selected === opt.years;
                  const raw = (opt.label ?? "").trim();
                  const finalLabel = raw || `Durasi ${opt.years} Tahun`;

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
                          <p className="text-base font-semibold text-foreground">{finalLabel}</p>
                          <p className="mt-1 text-sm text-muted-foreground">All-in</p>
                          {isMonthly && monthlyBase != null && (opt as any)?.months ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Otomatis dihitung: {formatIdr(monthlyBase)} / bulan × {(opt as any).months} bulan (12 × {opt.years} tahun)
                              {(opt as any).discountPercent ? ` lalu diskon ${(opt as any).discountPercent}%` : ""}.
                            </p>
                          ) : null}
                        </div>
                        {isSelected ? <Badge variant="secondary">Dipilih</Badge> : <Badge variant="outline">Plan</Badge>}
                      </div>

                      <div className="mt-4">
                        <p className="text-2xl font-bold text-foreground">{opt.priceIdr > 0 ? formatIdr(opt.priceIdr) : "—"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Total untuk {opt.years} tahun</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada rencana langganan yang tersedia.</p>
            )}
          </CardContent>
        </Card>

        <OrderSubscriptionAddOns />

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/order/checkout")}>
            Kembali
          </Button>
          <Button type="button" size="lg" disabled={!selected} onClick={() => navigate("/order/billing")}>
            Lanjut
          </Button>
        </div>
      </div>
    </OrderLayout>
  );
}
