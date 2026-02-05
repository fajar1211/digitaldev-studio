import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { HomePromoBanner } from "@/components/home/HomePromoBanner";
import { DomainSearchBar } from "@/components/order/DomainSearchBar";
import heroHome from "@/assets/hero-home.jpg";
import { usePageSeo } from "@/hooks/usePageSeo";
import { useI18n } from "@/hooks/useI18n";
import { getHomeContent } from "@/pages/home/homeContent";

export default function Home() {
  const navigate = useNavigate();
  const { lang, t } = useI18n();
  const { steps, whoItsFor, services } = getHomeContent(lang);

  usePageSeo("home", {
    title: t("home.seoTitle"),
    description: t("home.seoDesc"),
  });

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32 min-h-[calc(100vh-5rem)] flex items-center">
        <div className="absolute inset-0 -z-10">
          <img
            src={heroHome}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="h-full w-full object-cover blur-[1px] scale-105"
          />
          <div className="absolute inset-0 bg-navy/55" />
          <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_50%_60%,hsl(var(--primary)/0.14),transparent)]" />
        </div>

        {/* Promo banner overlays the hero (does not push content down) */}
        <div className="absolute inset-x-0 top-6 z-20">
          <HomePromoBanner />
        </div>

        <div className="container relative z-10">
          {/* Offset hero content by banner height so nothing is covered on any breakpoint */}
          <div
            className="mx-auto max-w-3xl text-center"
            style={{ paddingTop: "calc(var(--homepage-promo-height, 0px) + clamp(3rem, 8vh, 5rem))" }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary-foreground animate-fade-in">
              {t("home.h1a")} <span className="text-primary">{t("home.h1b")}</span>
            </h1>

            <p
              className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              {t("home.heroSub")}
            </p>

            <div className="mt-10 mx-auto max-w-2xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <DomainSearchBar
                onSubmit={(domain) => {
                  navigate(`/order/choose-domain?domain=${encodeURIComponent(domain)}`);
                }}
              />
            </div>

            <div
              className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-primary-foreground/80 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              {[t("home.heroPill1"), t("home.heroPill2"), t("home.heroPill3")].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("home.howItWorks")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("home.howItWorksSub")}</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((item, index) => (
              <div
                key={item.step}
                className="relative text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("home.whoItsFor")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("home.whoItsForSub")}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {whoItsFor.map((item, index) => (
              <Card
                key={item.title}
                className="border-0 shadow-soft bg-card animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="pt-8 pb-8 text-center">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent mb-6">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("home.helpWith")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("home.helpWithSub")}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service, index) => (
              <Card
                key={service.title}
                className="group hover:shadow-glow transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="pt-8 pb-8">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <service.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{service.title}</h3>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button size="lg" variant="outline" asChild>
              <Link to="/services">
                {t("home.viewAllServices")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-primary">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">{t("home.ctaTitle")}</h2>
            <p className="mt-4 text-lg text-primary-foreground/80">{t("home.ctaSub")}</p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/packages">
                  {t("home.ctaPackages")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link to="/contact">{t("home.ctaContact")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
