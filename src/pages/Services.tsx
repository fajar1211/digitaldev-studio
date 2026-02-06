import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Code,
  FileText,
  Globe,
  HeartHandshake,
  MessageCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PageHero } from "@/components/layout/PageHero";
import heroServices from "@/assets/hero-services.jpg";
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

type ServiceIconKey = "globe" | "message" | "code" | "file" | "handshake";

type ServiceItem = {
  icon: ServiceIconKey;
  title: string;
  description: string;
  features: string[];
};

type ServicesPageSettings = {
  heroTitle: string;
  heroSubtitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  services: ServiceItem[];
};

const SETTINGS_KEY = "services_page";

const iconMap = {
  globe: Globe,
  message: MessageCircle,
  code: Code,
  file: FileText,
  handshake: HeartHandshake,
} as const;

function getFallbackSettings(lang: "id" | "en"): ServicesPageSettings {
  if (lang === "id") {
    return {
      heroTitle: "Layanan Marketing yang Benar-Benar Membantu",
      heroSubtitle: "Tanpa ribet, tanpa jargon. Dukungan marketing praktis dari assist khusus kamu.",
      ctaTitle: "Siap Mulai?",
      ctaSubtitle: "Lihat paket kami untuk menemukan dukungan yang pas untuk bisnismu.",
      services: [
        {
          icon: "globe",
          title: "Setup Google Business Profile (GBP)",
          description: "Biar bisnismu mudah ditemukan pelanggan lokal.",
          features: [
            "Setup & optimasi profil lengkap",
            "Foto dan informasi bisnis",
            "Manajemen respons ulasan",
            "Posting & update rutin",
            "Insight dan pelacakan performa",
          ],
        },
        {
          icon: "message",
          title: "Posting Media Sosial",
          description: "Bangun brand dengan konten sosial yang konsisten dan engaging.",
          features: [
            "Perencanaan kalender konten",
            "Desain visual dan grafis",
            "Optimasi sesuai platform",
            "Strategi hashtag",
            "Engagement & community",
          ],
        },
        {
          icon: "code",
          title: "Pembuatan Website",
          description: "Website modern yang cepat dan membantu konversi.",
          features: [
            "Desain modern & responsif",
            "Mobile-first",
            "Struktur ramah SEO",
            "Loading cepat",
            "Mudah dikelola",
          ],
        },
        {
          icon: "file",
          title: "Blog & Konten SEO",
          description: "Tarik traffic organik lewat konten berkualitas yang bisa ranking.",
          features: [
            "Riset keyword & strategi",
            "Artikel blog SEO",
            "Konten yang membangun authority",
            "Jadwal publikasi rutin",
            "Analitik performa",
          ],
        },
        {
          icon: "handshake",
          title: "Bantuan Marketing Berkelanjutan",
          description: "Assist khusus kamu untuk berbagai kebutuhan marketing.",
          features: [
            "Sesi strategi rutin",
            "Manajemen & eksekusi tugas",
            "Laporan performa",
            "Respons cepat",
            "Prioritas fleksibel",
          ],
        },
      ],
    };
  }

  return {
    heroTitle: "Marketing Services That Actually Help",
    heroSubtitle: "No fluff, no jargon. Just practical marketing support from your dedicated assist.",
    ctaTitle: "Ready to Get Started?",
    ctaSubtitle: "Check out our packages to find the right level of support for your business.",
    services: [
      {
        icon: "globe",
        title: "Google Business Profile (GMB) Setup",
        description: "Get found by local customers searching for your services.",
        features: [
          "Complete profile setup and optimization",
          "Photos and business information",
          "Review response management",
          "Regular posts and updates",
          "Insights and performance tracking",
        ],
      },
      {
        icon: "message",
        title: "Social Media Posting",
        description: "Build your brand with consistent, engaging social content.",
        features: [
          "Content calendar planning",
          "Custom graphics and visuals",
          "Platform-specific optimization",
          "Hashtag strategy",
          "Engagement and community building",
        ],
      },
      {
        icon: "code",
        title: "Website Development",
        description: "Beautiful, fast websites that convert visitors into customers.",
        features: [
          "Modern, responsive design",
          "Mobile-first approach",
          "SEO-friendly structure",
          "Fast loading speeds",
          "Easy content management",
        ],
      },
      {
        icon: "file",
        title: "Blog & SEO Content",
        description: "Attract organic traffic with quality content that ranks.",
        features: [
          "Keyword research and strategy",
          "SEO-optimized blog posts",
          "Content that builds authority",
          "Regular publishing schedule",
          "Performance analytics",
        ],
      },
      {
        icon: "handshake",
        title: "Ongoing Marketing Assistance",
        description: "Your dedicated assist for all marketing needs.",
        features: [
          "Weekly strategy calls",
          "Task management and execution",
          "Performance reporting",
          "Quick response times",
          "Flexible task prioritization",
        ],
      },
    ],
  };
}

function sanitizeServices(value: unknown, fallback: ServicesPageSettings): ServicesPageSettings {
  if (!value || typeof value !== "object") return fallback;
  const v = value as any;

  const services: ServiceItem[] = Array.isArray(v.services)
    ? (v.services as any[])
        .map((raw) => {
          if (!raw || typeof raw !== "object") return null;
          const r = raw as any;
          const icon = (r.icon as ServiceIconKey) in iconMap ? (r.icon as ServiceIconKey) : "globe";
          const title = typeof r.title === "string" ? r.title : "";
          if (!title) return null;
          return {
            icon,
            title,
            description: typeof r.description === "string" ? r.description : "",
            features: Array.isArray(r.features)
              ? (r.features.filter((x: any) => typeof x === "string") as string[])
              : [],
          } satisfies ServiceItem;
        })
        .filter(Boolean) as ServiceItem[]
    : [];

  return {
    heroTitle: typeof v.heroTitle === "string" ? v.heroTitle : fallback.heroTitle,
    heroSubtitle: typeof v.heroSubtitle === "string" ? v.heroSubtitle : fallback.heroSubtitle,
    ctaTitle: typeof v.ctaTitle === "string" ? v.ctaTitle : fallback.ctaTitle,
    ctaSubtitle: typeof v.ctaSubtitle === "string" ? v.ctaSubtitle : fallback.ctaSubtitle,
    services: services.length ? services : fallback.services,
  };
}

function renderTitleLastWordPrimary(title: string) {
  const trimmed = (title ?? "").trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return <span className="text-primary">{trimmed}</span>;
  const last = parts.pop();
  return (
    <>
      {parts.join(" ")}{" "}
      <span className="text-primary">{last}</span>
    </>
  );
}

export default function Services() {
  const { lang, t } = useI18n();

  usePageSeo("services", {
    title: t("services.seoTitle"),
    description: t("services.seoDesc"),
  });

  const fallback = useMemo(() => getFallbackSettings(lang), [lang]);

  const [content, setContent] = useState<ServicesPageSettings>(fallback);
  const [faqs, setFaqs] = useState<FaqRow[]>([]);

  useEffect(() => {
    setContent(fallback);
  }, [fallback]);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("website_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();

      if (!error) setContent(sanitizeServices(data?.value, fallback));
    })();
  }, [fallback]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("website_faqs")
        .select("id,page,question,answer,sort_order,is_published,created_at,updated_at")
        .eq("page", "services")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!error) setFaqs((data ?? []) as FaqRow[]);
    })();
  }, []);

  const services = useMemo(
    () =>
      content.services.map((s) => ({
        ...s,
        Icon: iconMap[s.icon] ?? Globe,
      })),
    [content.services]
  );

  return (
    <PublicLayout>
      {/* Hero */}
      <PageHero
        backgroundImage={heroServices}
        title={renderTitleLastWordPrimary(content.heroTitle) ?? content.heroTitle}
        subtitle={content.heroSubtitle}
      />

      {/* Services */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="space-y-12">
            {services.map((service, index) => (
              <Card
                key={service.title}
                className="overflow-hidden border shadow-soft animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="grid md:grid-cols-5 gap-6">
                  <CardHeader className="md:col-span-2 bg-muted/30 flex flex-col justify-center p-8">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6">
                      <service.Icon className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-2xl">{service.title}</CardTitle>
                    <p className="mt-3 text-muted-foreground">{service.description}</p>
                  </CardHeader>
                  <CardContent className="md:col-span-3 p-8 flex items-center">
                    <ul className="grid sm:grid-cols-2 gap-3 w-full">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="py-20 md:py-28 bg-muted/50">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("services.faqTitle")}</h2>
            </div>
            <div className="mx-auto max-w-3xl space-y-6">
              {faqs.map((faq) => (
                <Card key={faq.id} className="shadow-soft">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 md:py-28 bg-primary">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">{content.ctaTitle}</h2>
            <p className="mt-4 text-lg text-primary-foreground/80">{content.ctaSubtitle}</p>
            <div className="mt-10">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/packages">
                  {t("services.ctaButton")}
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
