import { Link } from "react-router-dom";
import { ArrowRight, Heart, Users, Globe, DollarSign, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PageHero } from "@/components/layout/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { usePageSeo } from "@/hooks/usePageSeo";
import { useI18n } from "@/hooks/useI18n";

export default function About() {
  const { t } = useI18n();

  usePageSeo("about", {
    title: t("about.seoTitle"),
    description: t("about.seoDesc"),
  });

  const values = [
    { icon: Heart, title: t("about.value1t"), description: t("about.value1d") },
    { icon: Users, title: t("about.value2t"), description: t("about.value2d") },
    { icon: Globe, title: t("about.value3t"), description: t("about.value3d") },
    { icon: DollarSign, title: t("about.value4t"), description: t("about.value4d") },
  ];

  const benefits = [t("about.b1"), t("about.b2"), t("about.b3"), t("about.b4"), t("about.b5"), t("about.b6")];

  return (
    <PublicLayout>
      {/* Hero */}
      <PageHero
        backgroundImage={heroAbout}
        title={
          <>
            {t("about.heroTitleA")} <span className="text-primary">{t("about.heroTitleB")}</span>
          </>
        }
        subtitle={t("about.heroSub")}
      />

      {/* Story */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t("about.storyTitle")}</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{t("about.storyP1")}</p>
                <p>{t("about.storyP2")}</p>
                <p>{t("about.storyP3")}</p>
              </div>
            </div>
            <div className="relative animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="aspect-square rounded-2xl overflow-hidden shadow-soft">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=600&fit=crop"
                  alt="Team collaboration"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-primary text-primary-foreground p-6 rounded-xl shadow-lg">
                <p className="text-3xl font-bold">100+</p>
                <p className="text-sm text-primary-foreground/80">Happy Clients</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("about.diffTitle")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("about.diffSub")}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <Card
                key={value.title}
                className="border-0 shadow-soft bg-card text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="pt-8 pb-8">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6">
                    <value.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t("about.whyTitle")}</h2>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-accent flex-shrink-0" />
                    <span className="text-lg text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link to="/packages">
                    {t("about.packagesBtn")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-soft">
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=450&fit=crop"
                  alt="Working together"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-primary">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">{t("about.ctaTitle")}</h2>
            <p className="mt-4 text-lg text-primary-foreground/80">{t("about.ctaSub")}</p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/contact">
                  {t("about.contactBtn")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link to="/packages">{t("about.viewPackagesBtn")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
