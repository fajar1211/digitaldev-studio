import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PageHero } from "@/components/layout/PageHero";
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

type PublicPackageRow = PackageRow & { is_recommended?: boolean };

const PUBLIC_PACKAGE_NAME_ORDER = [
  "starter",
  "growth",
  "pro",
  "optimize",
  "scale",
  "dominate",
  "custom",
] as const;

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

export default function Packages() {
  const { t } = useI18n();

  usePageSeo("packages", {
    title: t("packages.seoTitle"),
    description: t("packages.seoDesc"),
  });

  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [packages, setPackages] = useState<PublicPackageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Fetch FAQs
      const { data, error } = await supabase
        .from("website_faqs")
        .select("id,page,question,answer,sort_order,is_published,created_at,updated_at")
        .eq("page", "packages")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!error) setFaqs((data ?? []) as FaqRow[]);

      // Fetch public packages
      const { data: pkgData } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_public", true)
        .order("created_at", { ascending: true });

      if (pkgData) setPackages((pkgData as PublicPackageRow[]).slice().sort(sortPackagesForPublic));
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
              <div className="flex flex-wrap justify-center gap-8">
                {packages.map((pkg, i) => {
                  const features = Array.isArray(pkg.features) ? pkg.features : [];
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
                          <span className="text-4xl font-bold text-foreground">${Number(pkg.price ?? 0).toFixed(0)}</span>
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
                      </CardContent>
                      <CardFooter className="pt-6">
                        <Button className="w-full" variant="default" asChild>
                          <Link to="/auth">
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
                  <p className="text-muted-foreground">{faq.a}</p>
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
                <Link to="/auth">
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
