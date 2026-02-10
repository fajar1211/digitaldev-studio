import { useMemo } from "react";

import { useOrder } from "@/contexts/OrderContext";
import { useOrderAddOns } from "@/hooks/useOrderAddOns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatIdr(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function OrderPackageAddOns() {
  const { state, setAddOnQuantity } = useOrder();

  const pkgId = state.selectedPackageId;
  const quantities = state.addOns ?? {};

  const { loading, items, total } = useOrderAddOns({ packageId: pkgId, quantities });

  const durationMonths = state.subscriptionYears ? Number(state.subscriptionYears) * 12 : 1;

  const hasAnySelection = useMemo(() => Object.values(quantities).some((q) => (Number(q) ?? 0) > 0), [quantities]);

  if (!pkgId) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add-ons (Onboarding)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat add-ons…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada add-ons untuk paket ini.</p>
        ) : (
          <div className="grid gap-3">
            {items.map((a) => {
              const step = Math.max(1, Number(a.unit_step ?? 1));
              const max = a.max_quantity == null ? 9999 : Math.max(0, Number(a.max_quantity));
              const current = clamp(Number(quantities?.[a.id] ?? 0), 0, max);

              const dec = () => setAddOnQuantity(a.id, clamp(current - step, 0, max));
              const inc = () => setAddOnQuantity(a.id, clamp(current + step, 0, max));
              const clear = () => setAddOnQuantity(a.id, 0);

              return (
                <div key={a.id} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground break-words">{a.label}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{a.unit}</Badge>
                        <Badge variant="secondary">
                          {formatIdr(Number(a.price_per_unit ?? 0))} / {a.unit}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={dec} disabled={current <= 0}>
                        -
                      </Button>
                      <span className="min-w-[44px] text-center text-sm font-medium text-foreground tabular-nums">{current}</span>
                      <Button type="button" variant="outline" size="sm" onClick={inc} disabled={current >= max}>
                        +
                      </Button>
                    </div>
                  </div>

                  {current > 0 ? (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        Subtotal: <span className="font-medium text-foreground">{formatIdr(Number(a.price_per_unit ?? 0) * current * durationMonths)}</span>
                      </p>
                      <Button type="button" variant="link" className="px-0" onClick={clear}>
                        Hapus
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {items.length ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3">
            <span className="text-sm text-muted-foreground">Total add-ons</span>
            <span className="text-sm font-semibold text-foreground">{formatIdr(total * durationMonths)}</span>
          </div>
        ) : null}

        {hasAnySelection ? (
          <p className="text-xs text-muted-foreground">Total add-ons akan ditambahkan ke estimasi total order.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Opsional — pilih add-ons jika diperlukan.</p>
        )}
      </CardContent>
    </Card>
  );
}
