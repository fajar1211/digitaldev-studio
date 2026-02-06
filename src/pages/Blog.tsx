import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PageHero } from "@/components/layout/PageHero";
import heroBlog from "@/assets/hero-blog.jpg";
import { supabase } from "@/integrations/supabase/client";
import { usePageSeo } from "@/hooks/usePageSeo";
import { useI18n } from "@/hooks/useI18n";

type BlogListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  created_at: string;
  publish_at: string | null;
  reading_time_minutes: number | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  author: string;
  categories: string[];
  tags: string[];
};

export default function Blog() {
  const { t } = useI18n();

  usePageSeo("blog", {
    title: t("blog.seoTitle"),
    description: t("blog.seoDesc"),
  });

  const [posts, setPosts] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          "id,slug,title,excerpt,created_at,publish_at,reading_time_minutes,featured_image_url,featured_image_alt,blog_authors(name),blog_post_categories(blog_categories(name)),blog_post_tags(blog_tags(name))"
        )
        .eq("status", "published")
        .eq("visibility", "public")
        .is("deleted_at", null)
        .eq("no_index", false)
        .order("publish_at", { ascending: false, nullsFirst: false });

      if (cancelled) return;

      if (error) {
        console.error("Failed to load blog posts", error);
        setPosts([]);
      } else {
        const mapped: BlogListItem[] = ((data as any[]) ?? []).map((row) => {
          const author = row?.blog_authors?.name ?? "-";
          const categories = (row?.blog_post_categories ?? [])
            .map((x: any) => x?.blog_categories?.name)
            .filter(Boolean);
          const tags = (row?.blog_post_tags ?? [])
            .map((x: any) => x?.blog_tags?.name)
            .filter(Boolean);

          return {
            id: row.id,
            slug: row.slug,
            title: row.title,
            excerpt: row.excerpt,
            created_at: row.created_at,
            publish_at: row.publish_at,
            reading_time_minutes: row.reading_time_minutes,
            featured_image_url: row.featured_image_url,
            featured_image_alt: row.featured_image_alt,
            author,
            categories,
            tags,
          };
        });

        setPosts(mapped);
      }
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => posts, [posts]);

  return (
    <PublicLayout>
      {/* Hero */}
      <PageHero
        backgroundImage={heroBlog}
        title={
          <>
            {t("blog.heroTitleA")} <span className="text-primary">{t("blog.heroTitleB")}</span>
          </>
        }
        subtitle={t("blog.heroSub")}
      />

      {/* Blog Posts */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={`skeleton-${index}`} className="overflow-hidden shadow-soft animate-pulse">
                  <div className="aspect-video bg-muted" />
                  <CardHeader className="pb-2">
                    <div className="h-5 w-24 rounded bg-muted" />
                    <div className="mt-3 h-6 w-4/5 rounded bg-muted" />
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="mt-2 h-4 w-2/3 rounded bg-muted" />
                  </CardContent>
                  <CardFooter className="pt-0">
                    <div className="h-4 w-40 rounded bg-muted" />
                  </CardFooter>
                </Card>
              ))
            ) : (
              cards.map((post, index) => {
                const publishedDate = post.publish_at ?? post.created_at;
                const dateLabel = format(new Date(publishedDate), "MMM d, yyyy");
                const readTimeLabel = post.reading_time_minutes ? `${post.reading_time_minutes} min read` : "";

                return (
                  <Card
                    key={post.id}
                    className="overflow-hidden shadow-soft hover:shadow-glow transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={post.featured_image_url ?? "/placeholder.svg"}
                        alt={post.featured_image_alt ?? post.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap gap-2">
                        {(post.categories.length ? post.categories : [t("blog.uncategorized")]).slice(0, 2).map((c) => (
                          <Badge key={c} variant="secondary" className="w-fit text-xs">
                            {c}
                          </Badge>
                        ))}
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mt-2 line-clamp-2">{post.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("blog.by")} {post.author}
                      </p>
                    </CardHeader>
                    <CardContent className="pb-4">
                      {post.tags.length ? (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {post.tags.slice(0, 6).map((tt) => (
                            <Badge key={tt} variant="outline" className="text-xs">
                              {tt}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                    <CardFooter className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dateLabel}
                        </span>
                        {readTimeLabel ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {readTimeLabel}
                          </span>
                        ) : null}
                      </div>
                      <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary/80 p-0">
                        <Link to={`/blog/${post.slug}`} aria-label={`${t("blog.readMore")}: ${post.title}`}>
                          {t("blog.readMore")}
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 md:py-28 bg-primary">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">{t("blog.newsletterTitle")}</h2>
            <p className="mt-4 text-lg text-primary-foreground/80">{t("blog.newsletterSub")}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder={t("blog.emailPlaceholder")}
                className="flex-1 px-4 py-3 rounded-lg border border-primary-foreground/20 bg-background/10 text-primary-foreground placeholder:text-primary-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary-foreground"
              />
              <Button variant="secondary">{t("blog.subscribe")}</Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
