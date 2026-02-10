import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PageHero } from "@/components/layout/PageHero";
import { FaqAnswer } from "@/components/faq/FaqAnswer";
import heroPackages from "@/assets/hero-packages.jpg";
import { usePageSeo } from "@/hooks/usePageSeo";
import { useI18n } from "@/hooks/useI18n";

type FaqRow = {
  id: string;
  page: string;
  question: string;
  answer: string;
  sort_order: number | null;
  is_published: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PackageRow = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  price: number | null;
  features: any;
  is_active?: boolean | null;
  show_on_public?: boolean | null;
  is_recommended?: boolean | null;
  created_at?: string | null;
};

type PackageAddOnRow = {
  id: string;
  package_id: string;
  label: string;
  is_active: boolean;
  sort_order: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PackageDurationRow = {
  id?: string;
  package_id: string;
  duration_months: number;
  discount_percent: number;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

type PublicPackageRow = PackageRow & { is_recommended?: boolean };

type PublicPackageWithAddOns = PublicPackageRow & { addOns: PackageAddOnRow[] };

const PUBLIC_PACKAGE_NAME_ORDER = [
  "starter",
  "growth",
  "pro",
  "optimize",
  "scale",
  "dominate",
  "custom",
] as const;

const WEBSITE_ONLY_YEARLY_PACKAGE_ID = "c92521ac-6813-4d62-b78f-13b49f83a8c9";

function sortPackagesForPublic(p1: PublicPackageRow, p2: PublicPackageRow) {
  const a = (p1.name ?? "").trim().toLowerCase();
  const b = (p2.name ?? "").trim().toLowerCase();
  const ai = PUBLIC_PACKAGE_NAME_ORDER.indexOf(a as any);
  const bi = PUBLIC_PACKAGE_NAME_ORDER.indexOf(b as any);

  const aRank = ai === -1 ? Number.POSITIVE_INFINITY : ai;
  const bRank = bi === -1 ? Number.POSITIVE_INFINITY : bi;
  if (aRank !== bRank) return aRank - bRank;
  return a.localeCompare(b);
}

function sortAddOnsForPublic(a: PackageAddOnRow, b: PackageAddOnRow) {
  const ao = a.sort_order ?? Number.POSITIVE_INFINITY;
  const bo = b.sort_order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  return (a.label ?? "").localeCompare(b.label ?? "");
}

export default function Packages() {
  const { t } = useI18n();

  usePageSeo("packages", {
    title: t("packages.seoTitle"),
    description: t("packages.seoDesc"),
  });

  type PackagesCardsAlign = "left" | "center" | "right";
  const LAYOUT_SETTINGS_KEY = "packages_layout";

  const [cardsAlign, setCardsAlign] = useState<PackagesCardsAlign>("center");
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [packages, setPackages] = useState<PublicPackageWithAddOns[]>([]);
  const [startUrlsMap, setStartUrlsMap] = useState<Record<string, string>>({});
  const [durationDiscountByPackageId, setDurationDiscountByPackageId] = useState<Record<string, number>>({});
  const [durationPlanYear1ByPackageId, setDurationPlanYear1ByPackageId] = useState<
    Record<
      string,
      {
        years: number;
        basePriceIdr: number;
        discountPercent: number;
        manualOverride: boolean;
        overridePriceIdr: number | null;
        finalPriceIdr: number | null;
      }
    >
  >({});
  const [loading, setLoading] = useState(true);

  const justifyClass =
    cardsAlign === "left" ? "justify-start" : cardsAlign === "right" ? "justify-end" : "justify-center";

  useEffect(() => {
    (async () => {
      const PACKAGES_START_URLS_FN = "packages-start-urls";

      const [faqRes, pkgRes, addOnsRes, layoutRes, startUrlsRes, legacyDurationPlanRes] = await Promise.all([
        supabase
          .from("website_faqs")
          .select("id,page,question,answer,sort_order,is_published,created_at,updated_at")
          .eq("page", "packages")
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("packages")
          .select("*")
          .eq("is_active", true)
          .eq("show_on_public", true)
          .order("created_at", { ascending: true }),
        supabase
          .from("package_add_ons")
          .select("id,package_id,label,is_active,sort_order,created_at,updated_at")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        (supabase as any).from("website_settings").select("value").eq("key", LAYOUT_SETTINGS_KEY).maybeSingle(),
        supabase.functions.invoke<{ ok: boolean; value?: Record<string, string> }>(PACKAGES_START_URLS_FN, { body: {} }),
        // legacy global key (fallback only)
        (supabase as any).from("website_settings").select("value").eq("key", "order_subscription_plans").maybeSingle(),
      ]);

      type DurationPlanMeta = {
        years: number;
        basePriceIdr: number;
        discountPercent: number;
        manualOverride: boolean;
        overridePriceIdr: number | null;
        finalPriceIdr: number | null;
      };

      const parsePlanMeta = (value: unknown, yearsWanted: number): DurationPlanMeta | null => {
        const list = Array.isArray(value) ? (value as any[]) : [];
        const row = list.find((r) => Number(r?.years) === Number(yearsWanted));
        if (!row) return null;

        const baseRaw = row?.base_price_idr;
        const baseN = typeof baseRaw === "number" ? baseRaw : Number(baseRaw);

        const discRaw = row?.discount_percent;
        const discN = typeof discRaw === "number" ? discRaw : Number(discRaw);

        const manualOverride = typeof row?.manual_override === "boolean" ? row.manual_override : false;
        const overrideRaw = row?.override_price_idr;
        const overrideN =
          overrideRaw === null || overrideRaw === undefined
            ? null
            : typeof overrideRaw === "number"
              ? overrideRaw
              : Number(overrideRaw);

        // NOTE: historically this field name has been inconsistent in settings.
        // We accept either final_price_idr or price_usd (legacy) as a numeric override.
        const finalRaw = row?.final_price_idr ?? row?.price_usd;
        const finalN = typeof finalRaw === "number" ? finalRaw : Number(finalRaw);

        if (!Number.isFinite(baseN)) return null;

        return {
          years: Number(yearsWanted),
          basePriceIdr: Math.max(0, baseN),
          discountPercent: Number.isFinite(discN) ? discN : 0,
          manualOverride,
          overridePriceIdr: Number.isFinite(Number(overrideN)) ? Number(overrideN) : null,
          finalPriceIdr: Number.isFinite(finalN) ? Math.max(0, finalN) : null,
        };
      };

      const legacyYear1 = parsePlanMeta((legacyDurationPlanRes as any)?.data?.value, 1);

      if (!faqRes.error) setFaqs((faqRes.data ?? []) as FaqRow[]);

      const map = (startUrlsRes as any)?.data?.value;
      setStartUrlsMap(map && typeof map === "object" ? (map as any) : {});

      const addOnsByPackageId = new Map<string, PackageAddOnRow[]>();
      if (addOnsRes?.data) {
        for (const row of addOnsRes.data as PackageAddOnRow[]) {
          const key = String(row.package_id);
          const list = addOnsByPackageId.get(key) ?? [];
          list.push(row);
          addOnsByPackageId.set(key, list);
        }
        for (const [key, list] of addOnsByPackageId) {
          addOnsByPackageId.set(key, list.slice().sort(sortAddOnsForPublic));
        }
      }

      if (pkgRes.data) {
        const base = (pkgRes.data as PublicPackageRow[]).slice().sort(sortPackagesForPublic);
        const raw = layoutRes?.data?.value as any;
        const nextAlign = raw?.cardsAlign;
        const order = Array.isArray(raw?.packageOrder) ? (raw.packageOrder as string[]) : null;

        let withAddOns: PublicPackageWithAddOns[] = base.map((p) => ({
          ...p,
          addOns: addOnsByPackageId.get(String(p.id)) ?? [],
        }));

        if (order && order.length) {
          const rank = new Map<string, number>();
          order.forEach((id, idx) => rank.set(String(id), idx));
          withAddOns = withAddOns.slice().sort((a, b) => {
            const ra = rank.has(a.id) ? (rank.get(a.id) as number) : Number.POSITIVE_INFINITY;
            const rb = rank.has(b.id) ? (rank.get(b.id) as number) : Number.POSITIVE_INFINITY;
            if (ra !== rb) return ra - rb;
            return sortPackagesForPublic(a, b);
          });
        }

        setPackages(withAddOns);

        // Duration Plan per package — source of truth for Harga Normal + Diskon% on /packages
        // NOTE: Growth uses the 3-year discount plan (as configured in Duration Packages).
        try {
          const pkgIds = withAddOns.map((p) => String(p.id));
          const pkgYearsWanted: Record<string, number> = {};
          for (const p of withAddOns) {
            const n = String(p.name ?? "").trim().toLowerCase();
            const t = String(p.type ?? "").trim().toLowerCase();
            pkgYearsWanted[String(p.id)] = n === "growth" || t === "growth" ? 3 : 1;
          }

          const keys = pkgIds.map((id) => `order_subscription_plans:${id}`);

          const { data: rows } = await (supabase as any)
            .from("website_settings")
            .select("key,value")
            .in("key", keys);

          const map: Record<
            string,
            {
              years: number;
              basePriceIdr: number;
              discountPercent: number;
              manualOverride: boolean;
              overridePriceIdr: number | null;
              finalPriceIdr: number | null;
            }
          > = {};

          if (Array.isArray(rows)) {
            for (const r of rows as any[]) {
              const key = String(r?.key ?? "");
              const value = r?.value;
              const pkgId = key.split(":")[1];
              if (!pkgId) continue;

              const yearsWanted = Number(pkgYearsWanted[pkgId] ?? 1);
              const meta = parsePlanMeta(value, yearsWanted);
              if (meta) map[pkgId] = meta;
            }
          }

          // fallback: if a package doesn't have its own plans yet, use legacy global config (if present)
          if (legacyYear1) {
            for (const id of pkgIds) {
              if (!map[id]) map[id] = legacyYear1;
            }
          }

          setDurationPlanYear1ByPackageId(map);
        } catch {
          setDurationPlanYear1ByPackageId({});
        }

        // Durations (fallback only, kept for safety)
        try {
          const pkgIds = withAddOns.map((p) => String(p.id));
          if (pkgIds.length) {
            const { data: durationsData } = await supabase
              .from("package_durations")
              .select("package_id,duration_months,discount_percent,is_active,sort_order")
              .in("package_id", pkgIds)
              .eq("is_active", true)
              .order("sort_order", { ascending: true })
              .order("duration_months", { ascending: true });

            const map: Record<string, number> = {};
            if (Array.isArray(durationsData)) {
              for (const row of durationsData as any as PackageDurationRow[]) {
                const pid = String(row.package_id);
                if (Number(row.duration_months) === 12 && Number.isFinite(Number(row.discount_percent))) {
                  map[pid] = Number(row.discount_percent);
                }
              }
            }
            setDurationDiscountByPackageId(map);
          }
        } catch {
          setDurationDiscountByPackageId({});
        }

        if (nextAlign === "left" || nextAlign === "center" || nextAlign === "right") {
          setCardsAlign(nextAlign);
        }
      } else {
        const raw = layoutRes?.data?.value as any;
        const nextAlign = raw?.cardsAlign;
        if (nextAlign === "left" || nextAlign === "center" || nextAlign === "right") {
          setCardsAlign(nextAlign);
        }
      }

      setLoading(false);
    })();
  }, []);

  const fallbackFaqs = useMemo(
    () => [
      { id: "fallback-1", q: t("packages.faq1q"), a: t("packages.faq1a") },
      { id: "fallback-2", q: t("packages.faq2q"), a: t("packages.faq2a") },
      { id: "fallback-3", q: t("packages.faq3q"), a: t("packages.faq3a") },
      { id: "fallback-4", q: t("packages.faq4q"), a: t("packages.faq4a") },
    ],
    [t]
  );

  return (
    <PublicLayout>
      {/* Hero */}
      <PageHero
        backgroundImage={heroPackages}
        title={
          <>
            {t("packages.heroTitleA")} <span className="text-primary">{t("packages.heroTitleB")}</span>
          </>
        }
        subtitle={t("packages.heroSub")}
      />

      {/* Packages */}
      <section className="py-20 md:py-28">
        <div className="container">
          {loading ? (
            <p className="text-center text-muted-foreground">{t("packages.loading")}</p>
          ) : packages.length === 0 ? (
            <p className="text-center text-muted-foreground">{t("packages.empty")}</p>
          ) : (
            <div className="mx-auto max-w-6xl">
              <div className={`flex flex-wrap gap-8 ${justifyClass}`}>
                {packages.map((pkg, i) => {
                  const features = Array.isArray(pkg.features) ? pkg.features : [];
                  const startUrl = (startUrlsMap as any)?.[String(pkg.id)] as string | undefined;

                  const n = (pkg.name ?? "").trim().toLowerCase();
                  const type = (pkg.type ?? "").trim().toLowerCase();
                  const isCheckoutPlan = n === "growth" || n === "pro" || type === "growth" || type === "pro";
                  const isGrowth = n === "growth" || type === "growth";

                  const to = isCheckoutPlan
                    ? `/order/select-plan?packageId=${encodeURIComponent(String(pkg.id))}`
                    : startUrl && String(startUrl).trim()
                      ? String(startUrl).trim()
                      : "/auth";

                  return (
                    <Card
                      key={pkg.id}
                      className="relative flex w-full max-w-sm flex-col shadow-soft animate-fade-in sm:basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-1.34rem)]"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      {!!pkg.is_recommended && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3.5 w-3.5" />
                            {t("packages.recommended")}
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="text-center pb-4">
                        <CardDescription className="text-primary font-medium uppercase text-xs">{pkg.type}</CardDescription>
                        <CardTitle className="text-xl">{pkg.name}</CardTitle>
                        <div className="mt-4">
                          {(() => {
                            const planMeta = durationPlanYear1ByPackageId[String(pkg.id)];

                            const baseFromPlan = Number(planMeta?.basePriceIdr ?? NaN);
                            const baseFallback = Number(pkg.price ?? 0);

                            // Growth & Pro packages are monthly-based in Duration Plan.
                            const isMonthlyBase = isCheckoutPlan;

                            // base = price per month (monthly) OR price per year (yearly)
                            const base = Number.isFinite(baseFromPlan) && baseFromPlan > 0 ? baseFromPlan : baseFallback;
                            const years = Math.max(1, Number(planMeta?.years ?? 1));

                            const discountPercent = Number.isFinite(Number(planMeta?.discountPercent))
                              ? Number(planMeta?.discountPercent)
                              : Number(durationDiscountByPackageId[String(pkg.id)] ?? 0);

                            const hasPlan = Boolean(planMeta) && base > 0;
                            if (!hasPlan) {
                              return (
                                <span className="text-4xl font-bold text-foreground">
                                  Rp {Number(pkg.price ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                                </span>
                              );
                            }

                            // Manual override: treat as the final display price (per period)
                            const manualFinal = planMeta?.manualOverride ? (planMeta.overridePriceIdr ?? planMeta.finalPriceIdr) : null;

                            const normalDisplay = isMonthlyBase ? Math.max(0, base) : Math.max(0, base * years);

                            const discountedDisplay =
                              typeof manualFinal === "number" && Number.isFinite(manualFinal)
                                ? Math.max(0, manualFinal)
                                : isMonthlyBase
                                  ? Math.max(0, base * (1 - discountPercent / 100))
                                  : Math.max(0, normalDisplay * (1 - discountPercent / 100));

                            const suffix = isMonthlyBase ? "/ bulan" : isGrowth && years === 3 ? "/ 3 tahun" : "/ tahun";
                            const afterLabel = isMonthlyBase
                              ? "Harga / bulan setelah diskon"
                              : isGrowth && years === 3
                                ? "Harga / 3 tahun setelah diskon"
                                : "Harga / tahun setelah diskon";

                            const normalLabel = isMonthlyBase
                              ? `Harga Normal / bulan: Rp ${normalDisplay.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`
                              : `Harga Normal / tahun: Rp ${normalDisplay.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

                            return (
                              <div className="space-y-2">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-sm font-semibold text-primary">Diskon</span>
                                  <span className="text-3xl md:text-4xl font-extrabold text-primary">{Math.round(discountPercent)}%</span>
                                </div>

                                <div className={isGrowth ? "text-sm text-muted-foreground" : "text-sm text-muted-foreground line-through"}>
                                  {isGrowth ? "Harga Dapat berubah sewaktu waktu" : normalLabel}
                                </div>

                                <div className="text-4xl font-bold text-foreground">
                                  Rp {discountedDisplay.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                                  <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">{suffix}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">{afterLabel}</div>
                              </div>
                            );
                          })()}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1">
                        {pkg.description && <p className="text-sm text-muted-foreground text-center mb-6">{pkg.description}</p>}
                        <ul className="space-y-3">
                          {features.map((f: any, j: number) => (
                            <li key={j} className="flex items-start gap-3 text-sm">
                              <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                              <span className="text-foreground">{String(f)}</span>
                            </li>
                          ))}
                        </ul>

                        {pkg.addOns.length > 0 && (
                          <div className="mt-6 border-t border-border pt-5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add-ons</p>
                            <ul className="mt-3 space-y-2">
                              {pkg.addOns.map((a) => (
                                <li key={a.id} className="text-sm text-foreground">
                                  {a.label}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="pt-6">
                        <Button className="w-full" variant="default" asChild>
                          <Link to={to}>
                            {t("packages.getStarted")}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("packages.faqTitle")}</h2>
          </div>
          <div className="mx-auto max-w-3xl space-y-6">
            {(faqs.length
              ? faqs.map((f) => ({ q: f.question, a: f.answer, id: f.id }))
              : fallbackFaqs
            ).map((faq) => (
              <Card key={faq.id} className="shadow-soft">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                  <FaqAnswer text={faq.a} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-primary">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">{t("packages.ctaTitle")}</h2>
            <p className="mt-4 text-lg text-primary-foreground/80">{t("packages.ctaSub")}</p>
            <div className="mt-10">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/order/select-plan">
                  {t("packages.ctaButton")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
