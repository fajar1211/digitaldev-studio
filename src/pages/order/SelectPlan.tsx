import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useOrder } from "@/contexts/OrderContext";

import { OrderLayout } from "@/components/order/OrderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PackageRow = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  features: any | null;
  price: number | null;
  is_recommended?: boolean | null;
  is_active?: boolean | null;
  show_on_public?: boolean | null;
};

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function isGrowthOrPro(pkg: Pick<PackageRow, "name" | "type">) {
  const name = (pkg.name ?? "").trim().toLowerCase();
  const type = (pkg.type ?? "").trim().toLowerCase();

  const isGrowth = name.includes("growth") || type.includes("growth");
  const isPro = name.includes("pro") || type.includes("pro");
  return isGrowth || isPro;
}

export default function SelectPlan() {
  const navigate = useNavigate();
  const query = useQuery();
  const { state, setPackage } = useOrder();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PackageRow[]>([]);

  const preselectId = (query.get("packageId") ?? "").trim();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("packages")
          .select("id,name,type,description,features,price,is_recommended,is_active,show_on_public")
          .eq("is_active", true)
          .eq("show_on_public", true);

        if (error) throw error;
        const all = (data ?? []) as PackageRow[];
        const filtered = all.filter(isGrowthOrPro).sort((a, b) => {
          const an = (a.name ?? "").toLowerCase();
          const bn = (b.name ?? "").toLowerCase();
          if (an === bn) return 0;
          if (an === "growth") return -1;
          if (bn === "growth") return 1;
          return an.localeCompare(bn);
        });

        if (!mounted) return;
        setRows(filtered);

        // If coming from /packages card click, preselect without forcing navigation.
        if (preselectId && !state.selectedPackageId && filtered.some((p) => p.id === preselectId)) {
          const p = filtered.find((x) => x.id === preselectId) as PackageRow;
          setPackage({ id: p.id, name: p.name });
        }
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // intentionally exclude state/setPackage to avoid re-fetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectId]);

  const selectedId = state.selectedPackageId;

  return (
    <OrderLayout title="Pilih Plan" step="domain" flow="plan" sidebar={null}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Growth atau Pro</CardTitle>
            <p className="text-sm text-muted-foreground">Pilih plan yang sesuai kebutuhan kamu.</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Memuat plan…</p>
            ) : rows.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {rows.map((pkg) => {
                  const isSelected = selectedId === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setPackage({ id: pkg.id, name: pkg.name })}
                      className={cn(
                        "w-full rounded-xl border bg-card p-4 text-left shadow-soft transition",
                        isSelected ? "ring-2 ring-ring bg-accent/30" : "hover:bg-muted/30",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-foreground truncate">{pkg.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{pkg.description || pkg.type}</p>

                          {Array.isArray(pkg.features) && pkg.features.length ? (
                            <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc pl-5">
                              {pkg.features.map((f: any, i: number) => (
                                <li key={i}>{String(f)}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        {pkg.is_recommended ? (
                          <Badge variant="secondary">Rekomendasi</Badge>
                        ) : (
                          <Badge variant="outline">Plan</Badge>
                        )}
                      </div>
                      <div className="mt-4">
                        <p className="text-2xl font-bold text-foreground">
                          Rp {Number(pkg.price ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Harga dasar (belum termasuk durasi).</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Plan Growth/Pro belum tersedia.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" asChild>
            <Link to="/packages">Kembali</Link>
          </Button>
          <Button type="button" size="lg" disabled={!selectedId} onClick={() => navigate("/order/checkout")}>
            Lanjut
          </Button>
        </div>
      </div>
    </OrderLayout>
  );
}
