import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useOrder } from "@/contexts/OrderContext";

import { OrderLayout } from "@/components/order/OrderLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PackageRow = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  price: number | null;
  features: any;
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

function formatIdr(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
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
          .select("id,name,type,description,price,features,is_active,show_on_public")
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
            <CardDescription>Pilih plan yang sesuai kebutuhan kamu.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Memuat plan…</p>
            ) : rows.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {rows.map((pkg, i) => {
                  const isSelected = selectedId === pkg.id;
                  const price = Number(pkg.price ?? 0);
                  const features = Array.isArray(pkg.features) ? (pkg.features as any[]) : [];

                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setPackage({ id: pkg.id, name: pkg.name })}
                      className={cn(
                        "group relative w-full overflow-hidden rounded-2xl border bg-card p-5 text-left shadow-soft transition will-change-transform",
                        "hover:-translate-y-0.5 hover:shadow-lg",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isSelected ? "ring-2 ring-primary" : "",
                        "animate-fade-in",
                      )}
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      {/* subtle top glow bar */}
                      <div
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute inset-x-0 top-0 h-1",
                          isSelected ? "bg-primary" : "bg-muted",
                        )}
                      />

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Badge variant="outline" className="w-fit uppercase">
                            {pkg.type}
                          </Badge>
                          <p className="mt-2 text-lg font-semibold text-foreground truncate">{pkg.name}</p>
                        </div>
                        {isSelected ? <Badge variant="secondary">Dipilih</Badge> : <Badge variant="outline">Pilih</Badge>}
                      </div>

                      <div className="mt-4">
                        <p className="text-3xl font-bold text-foreground">{formatIdr(price)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Harga dasar (belum termasuk durasi).</p>
                      </div>

                      {pkg.description ? (
                        <p className="mt-4 text-sm text-muted-foreground">{pkg.description}</p>
                      ) : null}

                      {features.length > 0 ? (
                        <div className="mt-5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Features</p>
                          <ul className="mt-3 space-y-2">
                            {features.slice(0, 6).map((f, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-sm">
                                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
                                  <Check className="h-3.5 w-3.5 text-accent" />
                                </span>
                                <span className="text-foreground">{String(f)}</span>
                              </li>
                            ))}
                          </ul>
                          {features.length > 6 ? (
                            <p className="mt-3 text-xs text-muted-foreground">+{features.length - 6} fitur lainnya</p>
                          ) : null}
                        </div>
                      ) : null}
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
