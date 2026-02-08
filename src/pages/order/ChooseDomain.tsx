import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DomainSearchBar } from "@/components/order/DomainSearchBar";
import { OrderLayout } from "@/components/order/OrderLayout";
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard";
import { useOrder } from "@/contexts/OrderContext";
import { useOrderPublicSettings } from "@/hooks/useOrderPublicSettings";
import { useI18n } from "@/hooks/useI18n";
import { useDomainSuggestions } from "@/hooks/useDomainSuggestions";

type DomainStatus = "available" | "unavailable" | "premium" | "blocked" | "unknown";

function badgeVariant(_status: DomainStatus) {
  return "secondary" as const;
}

function formatIdr(value: number) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
  }
}

function tldKeyFromDomain(domain: string): string | null {
  const d = String(domain ?? "").trim().toLowerCase();
  if (!d) return null;
  // Support the 3 TLDs we check, including the multi-part ".co.id"
  if (d.endsWith(".co.id")) return "co-id";
  if (d.endsWith(".com")) return "com";
  if (d.endsWith(".id")) return "id";
  return d.includes(".") ? d.split(".").pop() ?? null : null;
}

function normalizeKeyword(raw: string) {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\s+/g, "");
  if (!v) return "";
  return v.includes(".") ? v.split(".")[0] : v;
}

export default function ChooseDomain() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [params] = useSearchParams();
  const initial = params.get("domain") ?? "";
  const { state, setDomain, setDomainStatus } = useOrder();

  const [lastChecked, setLastChecked] = useState<string>(state.domain || initial);
  const keyword = useMemo(() => normalizeKeyword(lastChecked), [lastChecked]);

  const { loading, error, items } = useDomainSuggestions(keyword, { enabled: Boolean(keyword) });
  const visibleItems = useMemo(() => items.filter((it) => it.domain).slice(0, 10), [items]);

  const [selectedDomain, setSelectedDomain] = useState<string>(state.domain || "");

  // Reset selection when user searches new keyword
  useEffect(() => {
    setSelectedDomain("");
    setDomainStatus(null);
  }, [keyword, setDomainStatus]);

  // Pricing depends on selected domain
  const { pricing } = useOrderPublicSettings(selectedDomain || lastChecked);

  const tldPriceMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of pricing.tldPrices ?? []) {
      const key = String((row as any)?.tld ?? "").trim().toLowerCase();
      const price = Number((row as any)?.price_usd ?? NaN);
      if (key && Number.isFinite(price)) m.set(key, price);
    }
    return m;
  }, [pricing.tldPrices]);

  const selectedPriceUsd = useMemo(() => {
    if (!selectedDomain) return null;
    const key = tldKeyFromDomain(selectedDomain);
    if (!key) return null;
    return tldPriceMap.get(key) ?? null;
  }, [selectedDomain, tldPriceMap]);

  const canContinue = Boolean(selectedDomain);

  return (
    <OrderLayout title={t("order.step.domain")} step="domain" sidebar={<OrderSummaryCard showEstPrice={false} />}>
      <div className="space-y-6">
        <DomainSearchBar
          initialValue={initial}
          onSubmit={(domain) => {
            setDomain(domain);
            setLastChecked(domain);
          }}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("order.domainResult")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!lastChecked ? (
              <p className="text-sm text-muted-foreground">{t("order.searchToCheck")}</p>
            ) : (
              <> 
                <p className="text-xs text-muted-foreground">Hasil untuk: <span className="font-medium text-foreground">{lastChecked}</span></p>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-foreground">{t("order.table.domain")}</th>
                        <th className="px-3 py-2 text-left font-medium text-foreground">{t("order.table.status")}</th>
                        <th className="px-3 py-2 text-left font-medium text-foreground">{t("order.table.price")}</th>
                        <th className="px-3 py-2 text-right font-medium text-foreground">&nbsp;</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr className="border-t">
                          <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                            Checking…
                          </td>
                        </tr>
                      ) : visibleItems.length === 0 ? (
                        <tr className="border-t">
                          <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                            Tidak ada domain yang tersedia untuk keyword ini dari 3 TLD favorit yang dicek.
                          </td>
                        </tr>
                      ) : (
                        visibleItems.map((it) => {
                          const isSelected = selectedDomain === it.domain;
                          const isAvailable = it.status === "available";
                          const statusLabel =
                            it.status === "available"
                              ? "Available"
                              : it.status === "unavailable"
                                ? "Unavailable"
                                : it.status === "premium"
                                  ? "Premium"
                                  : it.status === "blocked"
                                    ? "Blocked"
                                    : "Unknown";

                          const tldKey = tldKeyFromDomain(it.domain);
                          const rowPriceUsd = isAvailable && tldKey ? (tldPriceMap.get(tldKey) ?? null) : null;

                          return (
                            <tr key={it.domain} className="border-t">
                              <td className="px-3 py-2 font-medium text-foreground">{it.domain}</td>
                              <td className="px-3 py-2">
                                <Badge variant={badgeVariant(it.status as DomainStatus)}>{statusLabel}</Badge>
                              </td>
                              <td className="px-3 py-2">
                                {rowPriceUsd == null ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  <div className="flex flex-col items-start">
                                    <span className="text-base font-semibold text-foreground">{formatIdr(rowPriceUsd)}</span>
                                    <span className="text-xs text-muted-foreground line-through">{formatIdr(rowPriceUsd * 1.25)}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  type="button"
                                  variant={isSelected ? "secondary" : "outline"}
                                  disabled={!isAvailable}
                                  onClick={() => {
                                    if (!isAvailable) return;
                                    setSelectedDomain(it.domain);
                                    setDomain(it.domain);
                                    setDomainStatus("available");
                                  }}
                                >
                                  {!isAvailable ? "Tidak tersedia" : isSelected ? "Dipilih" : "Pilih"}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Dicek: 3 TLD favorit (.com, .id, .co.id). Status ditampilkan (Available/Unavailable/Premium/Blocked).
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hasil available: {visibleItems.filter((it) => it.status === "available").length} dari {visibleItems.length}.
                    </p>
                  </div>

                  {selectedPriceUsd == null || !selectedDomain ? null : (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Estimasi harga domain terpilih</div>
                      <div className="text-base font-semibold text-foreground">{formatIdr(selectedPriceUsd)}</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            size="lg"
            disabled={!canContinue}
            onClick={() => {
              if (selectedDomain) setDomain(selectedDomain);
              navigate("/order/choose-design");
            }}
          >
            {t("order.continueDesign")}
          </Button>
        </div>
      </div>
    </OrderLayout>
  );
}
