import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { OrderLayout } from "@/components/order/OrderLayout";
import { useOrder } from "@/contexts/OrderContext";
import { useOrderPublicSettings, type OrderTemplate } from "@/hooks/useOrderPublicSettings";
import { useI18n } from "@/hooks/useI18n";

export default function ChooseDesign() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { state, setTemplate } = useOrder();
  const { templates } = useOrderPublicSettings();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<OrderTemplate["category"] | "all">("all");
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now());

  // Keep UI simple: 6 templates per page (matches the current perceived limit).
  const pageSize = 6;
  const [page, setPage] = useState(1);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const tmplt of templates) {
      const c = String(tmplt.category ?? "").trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = templates.filter((tmplt) => {
      const byCategory = category === "all" ? true : tmplt.category === category;
      const byQuery = !q ? true : tmplt.name.toLowerCase().includes(q);
      return byCategory && byQuery;
    });

    // If user is browsing "all" templates without search, show them in random order each time.
    if (category === "all" && !q) {
      const seededRand = (s: number) => {
        // LCG pseudo random [0,1)
        const x = (s * 1664525 + 1013904223) % 4294967296;
        return x / 4294967296;
      };
      const hashId = (id: string) => {
        let h = 2166136261;
        for (let i = 0; i < id.length; i++) {
          h ^= id.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      };

      return [...list].sort((a, b) => {
        const ra = seededRand((shuffleSeed + hashId(a.id)) >>> 0);
        const rb = seededRand((shuffleSeed + hashId(b.id)) >>> 0);
        return ra - rb;
      });
    }

    // Keep list stable and consistent with admin `sort_order` (no user-facing sort choices).
    return [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [category, query, templates, shuffleSeed]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    // Reset to page 1 when filters change.
    setPage(1);

    // New shuffle when browsing all templates without search.
    const q = query.trim();
    if (category === "all" && !q) setShuffleSeed(Date.now());
  }, [query, category]);

  useEffect(() => {
    // Clamp in case templates list changes while user is on a later page.
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const selected = state.selectedTemplateId;

  const pageItems = useMemo(() => {
    if (pageCount <= 1) return [] as Array<number | "ellipsis">;

    const items: Array<number | "ellipsis"> = [];
    const add = (v: number | "ellipsis") => items.push(v);

    const maxNumbers = 5; // show up to 5 page numbers

    if (pageCount <= maxNumbers + 2) {
      for (let i = 1; i <= pageCount; i++) add(i);
      return items;
    }

    add(1);

    const left = Math.max(2, page - 1);
    const right = Math.min(pageCount - 1, page + 1);

    if (left > 2) add("ellipsis");
    for (let i = left; i <= right; i++) add(i);
    if (right < pageCount - 1) add("ellipsis");

    add(pageCount);
    return items;
  }, [page, pageCount]);

  return (
    <OrderLayout title={t("order.step.design")} step="design" sidebar={null}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("order.filterTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              className="md:flex-1"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("order.searchTemplates")}
            />
            <div className="md:w-[220px]">
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("order.category")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("order.all")}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((tmplt) => {
            const isSelected = selected === tmplt.id;
            const previewImg = String((tmplt as any)?.preview_image_url ?? "").trim();
            const demoUrl = String(tmplt.preview_url ?? "").trim();
            return (
              <Card
                key={tmplt.id}
                className={
                  isSelected ? "border-primary/50 bg-primary/5 shadow-lg ring-2 ring-primary" : ""
                }
              >
                <CardContent className="p-5">
                  <div className="mb-4 overflow-hidden rounded-md border bg-muted">
                    <AspectRatio ratio={16 / 9}>
                      {previewImg ? (
                        <img
                          src={previewImg}
                          alt={`Preview ${tmplt.name}`}
                          className="h-full w-full object-contain bg-background"
                          loading="lazy"
                        />
                      ) : (
                        <img
                          src="/placeholder.svg"
                          alt="Template preview placeholder"
                          className="h-full w-full object-contain bg-background"
                          loading="lazy"
                        />
                      )}
                    </AspectRatio>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{tmplt.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Template category</p>
                    </div>
                    <Badge variant="outline">{tmplt.category}</Badge>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const url = String(tmplt.preview_url ?? "").trim();
                        if (!url) return;
                        window.open(url, "_blank", "noopener,noreferrer");
                      }}
                      disabled={!demoUrl}
                    >
                      {t("order.preview")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setTemplate({ id: tmplt.id, name: tmplt.name })}
                      variant={isSelected ? "secondary" : "default"}
                    >
                      {isSelected ? t("order.selected") : t("order.select")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {pageCount > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  size="default"
                  aria-label={t("order.pagination.previous")}
                  className="gap-1 pl-2.5"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                >
                  <span>{t("order.pagination.previous")}</span>
                </PaginationLink>
              </PaginationItem>

              {pageItems.map((it, idx) =>
                it === "ellipsis" ? (
                  <PaginationItem key={`e-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={it}>
                    <PaginationLink
                      href="#"
                      size="icon"
                      isActive={it === page}
                      aria-label={`Page ${it}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(it);
                      }}
                    >
                      {it}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}

              <PaginationItem>
                <PaginationLink
                  href="#"
                  size="default"
                  aria-label={t("order.pagination.next")}
                  className="gap-1 pr-2.5"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(pageCount, p + 1));
                  }}
                >
                  <span>{t("order.pagination.next")}</span>
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/order/choose-domain")}> 
            {t("common.back")}
          </Button>
          <Button type="button" size="lg" disabled={!selected} onClick={() => navigate("/order/details")}>
            {t("order.continueDetails")}
          </Button>
        </div>
      </div>
    </OrderLayout>
  );
}

