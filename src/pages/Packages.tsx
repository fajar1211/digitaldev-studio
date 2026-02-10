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
  const [websiteOnlyYearBasePriceIdr, setWebsiteOnlyYearBasePriceIdr] = useState<number | null>(null);
  const [websiteOnlyYearDiscountPercent, setWebsiteOnlyYearDiscountPercent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const justifyClass =
    cardsAlign === "left" ? "justify-start" : cardsAlign === "right" ? "justify-end" : "justify-center";

  useEffect(() => {
    (async () => {
      const PACKAGES_START_URLS_FN = "packages-start-urls";

      const [faqRes, pkgRes, addOnsRes, layoutRes, startUrlsRes, durationPlanRes] = await Promise.all([
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
        (supabase as any).from("website_settings").select("value").eq("key", "order_subscription_plans").maybeSingle(),
      ]);

      // Duration Plan base+discount (Years=1) — source of truth for Website Only / Tahun
      try {
        const v = (durationPlanRes as any)?.data?.value;
        const list = Array.isArray(v) ? (v as any[]) : [];
        const years1 = list.find((r) => Number(r?.years) === 1);

        // Backward compatible: some rows may only have price_usd (legacy)
        const baseRaw = years1?.base_price_idr ?? years1?.override_price_idr ?? years1?.price_usd;
        const baseN = typeof baseRaw === "number" ? baseRaw : Number(baseRaw);
        setWebsiteOnlyYearBasePriceIdr(Number.isFinite(baseN) ? baseN : null);

        const discRaw = years1?.discount_percent;
        const discN = typeof discRaw === "number" ? discRaw : Number(discRaw);
        setWebsiteOnlyYearDiscountPercent(Number.isFinite(discN) ? discN : 0);
      } catch {
        setWebsiteOnlyYearBasePriceIdr(null);
        setWebsiteOnlyYearDiscountPercent(null);
      }

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

        // Durations (for public price display)
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
                          {String(pkg.id) === WEBSITE_ONLY_YEARLY_PACKAGE_ID && durationDiscountByPackageId[String(pkg.id)] != null ? (
                            (() => {
                              const baseFromDurationPlan = websiteOnlyYearBasePriceIdr;
                              const base = Number.isFinite(Number(baseFromDurationPlan)) && Number(baseFromDurationPlan) > 0
                                ? Number(baseFromDurationPlan)
                                : Number(pkg.price ?? 0);

                              const discountPercent = Number(
                                websiteOnlyYearDiscountPercent != null ? websiteOnlyYearDiscountPercent : durationDiscountByPackageId[String(pkg.id)] ?? 0,
                              );
                              const discounted = Math.max(0, base * (1 - discountPercent / 100));
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-sm font-semibold text-primary">Diskon</span>
                                    <span className="text-3xl md:text-4xl font-extrabold text-primary">
                                      {Math.round(discountPercent)}%
                                    </span>
                                  </div>

                                  <div className="text-sm text-muted-foreground line-through">
                                    Harga Normal / tahun: Rp {base.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                                  </div>

                                  <div className="text-4xl font-bold text-foreground">
                                    Rp {discounted.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                                    <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">/ tahun</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">Harga / tahun setelah diskon</div>
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-4xl font-bold text-foreground">
                              Rp {Number(pkg.price ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                            </span>
                          )}
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
