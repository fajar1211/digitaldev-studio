import { useMemo } from "react";

import { useOrder } from "@/contexts/OrderContext";
import { useSubscriptionAddOns } from "@/hooks/useSubscriptionAddOns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

function formatIdr(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

export function OrderSubscriptionAddOns({ title = "Add-ons" }: { title?: string }) {
  const { state, setSubscriptionAddOnSelected } = useOrder();
  const { loading, items, total } = useSubscriptionAddOns({
    selected: state.subscriptionAddOns ?? {},
    packageId: state.selectedPackageId,
  });

  const hasAny = useMemo(() => Object.values(state.subscriptionAddOns ?? {}).some(Boolean), [state.subscriptionAddOns]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat add-ons…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada add-ons yang tersedia.</p>
        ) : (
          <div className="grid gap-3">
            {items.map((a) => {
              const checked = Boolean(state.subscriptionAddOns?.[a.id]);
              const descLines = String(a.description ?? "")
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean);

              return (
                <label key={a.id} className="flex items-start gap-3 rounded-xl border bg-card p-4 cursor-pointer">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => setSubscriptionAddOnSelected(a.id, Boolean(v))}
                    className="mt-1"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground break-words">{a.label}</p>
                        {descLines.length ? (
                          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                            {descLines.map((line, i) => (
                              <li key={i} className="break-words">
                                {line}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <Badge variant="secondary">{formatIdr(Number(a.price_idr ?? 0))}</Badge>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {items.length ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3">
            <span className="text-sm text-muted-foreground">Total add-ons</span>
            <span className="text-sm font-semibold text-foreground">{formatIdr(total)}</span>
          </div>
        ) : null}

        {hasAny ? (
          <p className="text-xs text-muted-foreground">Biaya add-ons akan ditambahkan ke total pembayaran.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Opsional — centang jika diperlukan.</p>
        )}
      </CardContent>
    </Card>
  );
}
