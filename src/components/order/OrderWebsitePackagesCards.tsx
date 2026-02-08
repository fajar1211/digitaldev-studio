import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useOrder } from "@/contexts/OrderContext";
import { useI18n } from "@/hooks/useI18n";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PackageRow = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  price: number | null;
  features?: unknown;
  is_recommended?: boolean;
};

const TARGET_NAMES = ["Website Only", "Website + Content Growth", "Website + Full Digital Marketing"] as const;

type TargetName = (typeof TARGET_NAMES)[number];

function formatIdr(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function getFeatureSnippet(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);
}

function resolveTargetName(name: string): TargetName | null {
  const n = normalizeName(name);
  const found = TARGET_NAMES.find((t) => normalizeName(t) === n);
  return found ?? null;
}

function targetRank(name: string): number {
  const tn = resolveTargetName(name);
  if (!tn) return Number.POSITIVE_INFINITY;
  return TARGET_NAMES.indexOf(tn);
}

function WebsitePackageFlipCard({ pkg }: { pkg: PackageRow }) {
  const { t } = useI18n();
  const { state, setPackage, setSubscriptionYears } = useOrder();

  const [isFlipped, setIsFlipped] = useState(false);

  const isSelected = state.selectedPackageId === pkg.id;
  const price = formatIdr(Number(pkg.price ?? 0));
  const snippet = useMemo(() => getFeatureSnippet(pkg.features), [pkg.features]);

  const choose = () => {
    setPackage({ id: pkg.id, name: pkg.name });
    // Force user to re-confirm duration when package changes.
    setSubscriptionYears(null);
  };

  return (
    <div className="[perspective:1200px]">
      <div
        className={
          "relative h-full min-h-[240px] rounded-2xl transition-transform duration-500 [transform-style:preserve-3d]"
        }
        style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div className="absolute inset-0 rounded-2xl border bg-card p-5 shadow-soft [backface-visibility:hidden]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground truncate">{pkg.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="uppercase">{pkg.type}</Badge>
                {isSelected ? <Badge variant="secondary">{t("order.selected")}</Badge> : null}
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground shrink-0">{price}</p>
          </div>

          {pkg.description ? <p className="mt-3 text-sm text-muted-foreground">{pkg.description}</p> : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="link" className="px-0" onClick={() => setIsFlipped(true)}>
              {t("order.viewDetail")}
            </Button>

            <Button type="button" variant={isSelected ? "secondary" : "default"} disabled={isSelected} onClick={choose}>
              {isSelected ? t("order.selected") : t("order.select")}
            </Button>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl border bg-card p-5 shadow-soft [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground truncate">{pkg.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("order.step.plan")}</p>
            </div>
            <p className="text-sm font-semibold text-foreground shrink-0">{price}</p>
          </div>

          <div className="mt-3 space-y-3">
            {pkg.description ? <p className="text-sm text-muted-foreground">{pkg.description}</p> : null}

            {snippet.length ? (
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-xs font-medium text-foreground">Highlight</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {snippet.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span aria-hidden className="mt-1.5 size-1.5 rounded-full bg-foreground/40" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => setIsFlipped(false)}>
              {t("common.back")}
            </Button>
            <Button type="button" variant={isSelected ? "secondary" : "default"} disabled={isSelected} onClick={choose}>
              {isSelected ? t("order.selected") : "Pilih Paket Ini"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderWebsitePackagesCards() {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageRow[]>([]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);

        const res = await supabase
          .from("packages")
          .select("id,name,type,description,price,features,is_recommended")
          .eq("is_active", true)
          .eq("show_on_public", true);

        if (!isMounted) return;

        const base = (res.data ?? []) as PackageRow[];
        const filtered = base
          .filter((p) => resolveTargetName(p.name) != null)
          .slice()
          .sort((a, b) => targetRank(a.name) - targetRank(b.name));

        setPackages(filtered);
      } catch {
        if (isMounted) setPackages([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section aria-label={t("nav.packages")} className="space-y-3">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{t("nav.packages")}</h2>
        <p className="text-sm text-muted-foreground">Pilih paket dulu, lalu baru pilih durasi.</p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("packages.loading")}</p>
      ) : packages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Paket Website belum ditemukan. Pastikan ada paket bernama: {TARGET_NAMES.join(", ")}.
        </p>
      ) : (
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <WebsitePackageFlipCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </section>
  );
}
