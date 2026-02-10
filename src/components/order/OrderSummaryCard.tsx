import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useOrder } from "@/contexts/OrderContext";
import { useOrderPublicSettings } from "@/hooks/useOrderPublicSettings";
import { useOrderAddOns } from "@/hooks/useOrderAddOns";
import { useSubscriptionAddOns } from "@/hooks/useSubscriptionAddOns";
import { usePackageDurations } from "@/hooks/usePackageDurations";
import { useI18n } from "@/hooks/useI18n";
import { computeDiscountedTotal } from "@/lib/packageDurations";

function isMonthlyPackageName(name: string | null) {
  const n = String(name ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return n.includes("full digital marketing") || n.includes("blog + social media") || n.includes("blog+social media");
}

export function OrderSummaryCard({
  showEstPrice = true,
  hideDomain = false,
  hideStatus = false,
  hideTemplate = false,
  planLabelOverride,
  planValueOverride,
  variant = "default",
}: {
  showEstPrice?: boolean;
  hideDomain?: boolean;
  hideStatus?: boolean;
  hideTemplate?: boolean;
  planLabelOverride?: string;
  planValueOverride?: string;
  variant?: "default" | "compact";
}) {
  const { t, lang } = useI18n();
  const { state } = useOrder();
  const { contact, subscriptionPlans, pricing } = useOrderPublicSettings(state.domain, state.selectedPackageId);

  const effectivePackageId = state.selectedPackageId ?? pricing.defaultPackageId ?? null;
  const { rows: durationRows } = usePackageDurations(effectivePackageId);

  const { items: packageAddOnItems, total: packageAddOnsTotal } = useOrderAddOns({
    packageId: effectivePackageId,
    quantities: state.addOns ?? {},
  });
  const { items: subscriptionAddOnItems, total: subscriptionAddOnsTotal } = useSubscriptionAddOns({
    selected: state.subscriptionAddOns ?? {},
    packageId: effectivePackageId,
  });

  const addOnsMultiplier = isMonthlyPackageName(state.selectedPackageName) && state.subscriptionYears ? Number(state.subscriptionYears) * 12 : 1;
  const addOnsTotal = (packageAddOnsTotal + subscriptionAddOnsTotal) * addOnsMultiplier;

  const formatIdr = (value: number) => {
    return `Rp ${Math.round(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
  };

  const whatsappHref = (() => {
    const phone = (contact.whatsapp_phone ?? "").replace(/\D/g, "");
    if (!phone) return null;
    const text = encodeURIComponent(
      contact.whatsapp_message || (lang === "id" ? "Halo, saya mau tanya order..." : "Hi, I have a question about my order..."),
    );
    return `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
  })();

  const emailHref = (() => {
    const to = (contact.email ?? "").trim();
    if (!to) return null;
    return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}`;
  })();

  const yearsLabel = state.subscriptionYears
    ? lang === "id"
      ? `${state.subscriptionYears} tahun`
      : `${state.subscriptionYears} year(s)`
    : "—";

  const isMonthly = isMonthlyPackageName(state.selectedPackageName);

  const discountByMonths = (() => {
    const m = new Map<number, number>();
    for (const r of durationRows || []) {
      if ((r as any)?.is_active === false) continue;
      const months = Number((r as any)?.duration_months ?? 0);
      const discount = Number((r as any)?.discount_percent ?? 0);
      if (Number.isFinite(months) && months > 0) m.set(months, discount);
    }
    return m;
  })();

  const durationPriceIdr = (() => {
    if (!showEstPrice) return null;
    if (!state.subscriptionYears) return null;

    // Paket bulanan (marketing): total mengikuti perhitungan /order/subscribe (harga /bulan × bulan, lalu diskon)
    if (isMonthly) {
      const monthlyBase = Number(pricing?.packagePriceUsd ?? 0);
      if (!Number.isFinite(monthlyBase) || monthlyBase <= 0) return null;

      const months = Number(state.subscriptionYears) * 12;
      const discountPercent = discountByMonths.get(months) ?? 0;
      return computeDiscountedTotal({ monthlyPrice: monthlyBase, months, discountPercent });
    }

    // Paket non-bulanan: ambil dari website_settings.order_subscription_plans
    const selectedPlan = (subscriptionPlans || []).find((p: any) => Number(p?.years) === Number(state.subscriptionYears));
    const v = Number((selectedPlan as any)?.price_usd ?? 0);
    return Number.isFinite(v) && v > 0 ? v : null;
  })();

  const baseTotalUsd = (() => {
    if (!showEstPrice) return null;
    if (!state.subscriptionYears) return null;

    const durationOnly = durationPriceIdr;
    if (durationOnly == null) return null;

    return durationOnly + addOnsTotal;
  })();

  const promoDiscountUsd = (() => {
    const d = state.appliedPromo?.discountUsd ?? 0;
    if (!Number.isFinite(d) || d <= 0) return 0;
    return d;
  })();

  const totalAfterPromoUsd = (() => {
    if (baseTotalUsd == null) return null;
    return Math.max(0, baseTotalUsd - promoDiscountUsd);
  })();

  const estTotalLabel = (() => {
    if (!showEstPrice) return null;
    if (totalAfterPromoUsd == null) return "—";
    return formatIdr(totalAfterPromoUsd);
  })();

  const effectiveEstTotalLabel = estTotalLabel ?? "—";

  const perMonthLabel = lang === "id" ? "Harga /Bulan" : "Price /Month";
  const totalLabel = lang === "id" ? "Total Harga" : "Total";
  const perMonthValue = (() => {
    const v = Number(pricing?.packagePriceUsd ?? 0);
    return Number.isFinite(v) && v > 0 ? formatIdr(v) : "—";
  })();

  if (variant === "compact") {
    const packageName = planValueOverride ?? state.selectedPackageName ?? "—";
    const durationValue = yearsLabel;

    const addOnLines = (() => {
      const lines: Array<{ key: string; label: string; price: number }> = [];

      for (const a of packageAddOnItems || []) {
        const qty = Number(state.addOns?.[a.id] ?? 0);
        if (!Number.isFinite(qty) || qty <= 0) continue;
        const subtotal = Number(a.price_per_unit ?? 0) * qty * addOnsMultiplier;
        lines.push({
          key: `pkg-${a.id}`,
          label: `${a.label}${qty > 1 ? ` × ${qty}` : ""}`,
          price: subtotal,
        });
      }

      for (const a of subscriptionAddOnItems || []) {
        if (!state.subscriptionAddOns?.[a.id]) continue;
        lines.push({
          key: `sub-${a.id}`,
          label: a.label,
          price: Number(a.price_idr ?? 0) * addOnsMultiplier,
        });
      }

      return lines.filter((l) => Number.isFinite(l.price) && l.price > 0);
    })();

    return (
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("order.summary")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{planLabelOverride ?? "Paket"}</span>
              <span className="text-sm font-medium text-foreground truncate max-w-[220px]">{packageName}</span>
            </div>

            {isMonthly ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{perMonthLabel}</span>
                <span className="text-sm font-semibold text-foreground">{perMonthValue}</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Durasi</span>
              <span className="text-sm font-medium text-foreground">{durationValue}</span>
            </div>

            {addOnLines.length ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Add-ons</span>
                  <span className="text-sm font-medium text-foreground">{formatIdr(addOnsTotal)}</span>
                </div>
                <ul className="space-y-1">
                  {addOnLines.map((l) => (
                    <li key={l.key} className="flex items-start justify-between gap-3">
                      <span className="text-xs text-muted-foreground break-words">{l.label}</span>
                      <span className="text-xs font-medium text-foreground tabular-nums">{formatIdr(l.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-xl bg-muted/30 p-3">
              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{totalLabel}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{effectiveEstTotalLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("order.summary")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {!hideDomain ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{t("order.domain")}</span>
              <span className="text-sm font-medium text-foreground truncate max-w-[220px]">{state.domain || "—"}</span>
            </div>
          ) : null}

          {!hideStatus ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{t("order.status")}</span>
              <span className="text-sm">
                {state.domainStatus ? (
                  <Badge variant={state.domainStatus === "available" ? "secondary" : "outline"}>{state.domainStatus}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            </div>
          ) : null}

          {!hideTemplate ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{t("order.template")}</span>
              <span className="text-sm font-medium text-foreground truncate max-w-[220px]">{state.selectedTemplateName || "—"}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Harga</span>
            <span className="text-sm font-medium text-foreground">{durationPriceIdr == null ? "—" : formatIdr(durationPriceIdr)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Paket</span>
            <span className="text-sm font-medium text-foreground">{yearsLabel}</span>
          </div>

          {showEstPrice ? (
            <>
              {addOnsTotal > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Add-ons</span>
                  <span className="text-sm font-medium text-foreground">{formatIdr(addOnsTotal)}</span>
                </div>
              ) : null}

              <div className="rounded-xl bg-muted/30 p-3">
                <h1 className="text-base font-bold text-foreground">Total Harga</h1>
                <p className="mt-1 text-2xl font-bold text-foreground">{baseTotalUsd == null ? "—" : formatIdr(baseTotalUsd)}</p>
              </div>

              {state.appliedPromo ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{t("order.promo")}</span>
                  <span className="text-sm font-medium text-foreground truncate max-w-[220px]">
                    {state.appliedPromo.code} (-{formatIdr(promoDiscountUsd)})
                  </span>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t("order.included")}</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>{lang === "id" ? "Desain website profesional" : "Professional website design"}</li>
            <li>{lang === "id" ? "Layout responsif mobile" : "Mobile responsive layout"}</li>
            <li>{lang === "id" ? "Setup SEO dasar" : "Basic SEO setup"}</li>
          </ul>
        </div>

        {(whatsappHref || emailHref) && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{contact.heading}</p>
              {contact.description ? <p className="text-sm text-muted-foreground">{contact.description}</p> : null}
              <div className="flex flex-wrap gap-2">
                {whatsappHref ? (
                  <a className="text-sm underline text-foreground" href={whatsappHref} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                ) : null}
                {emailHref ? (
                  <a className="text-sm underline text-foreground" href={emailHref} target="_blank" rel="noreferrer">
                    Email
                  </a>
                ) : null}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
