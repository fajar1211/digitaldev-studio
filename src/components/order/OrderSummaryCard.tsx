import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useOrder } from "@/contexts/OrderContext";
import { useOrderPublicSettings } from "@/hooks/useOrderPublicSettings";
import { useOrderAddOns } from "@/hooks/useOrderAddOns";
import { useSubscriptionAddOns } from "@/hooks/useSubscriptionAddOns";
import { useI18n } from "@/hooks/useI18n";

export function OrderSummaryCard({ showEstPrice = true }: { showEstPrice?: boolean }) {
  const { t, lang } = useI18n();
  const { state } = useOrder();
  const { contact, subscriptionPlans } = useOrderPublicSettings(state.domain, state.selectedPackageId);
  const { total: packageAddOnsTotal } = useOrderAddOns({ packageId: state.selectedPackageId, quantities: state.addOns ?? {} });
  const { total: subscriptionAddOnsTotal } = useSubscriptionAddOns({ selected: state.subscriptionAddOns ?? {} });
  const addOnsTotal = packageAddOnsTotal + subscriptionAddOnsTotal;

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

  const durationLabel = state.subscriptionYears
    ? lang === "id"
      ? `Durasi ${state.subscriptionYears} Tahun`
      : `Duration ${state.subscriptionYears} Year(s)`
    : lang === "id"
      ? "Durasi —"
      : "Duration —";

  const yearsLabel = state.subscriptionYears
    ? lang === "id"
      ? `${state.subscriptionYears} tahun`
      : `${state.subscriptionYears} year(s)`
    : "—";

  const durationPriceIdr = (() => {
    if (!showEstPrice) return null;
    if (!state.subscriptionYears) return null;

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

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("order.summary")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t("order.domain")}</span>
            <span className="text-sm font-medium text-foreground truncate max-w-[220px]">{state.domain || "—"}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{durationLabel}</span>
            <span className="text-sm font-medium text-foreground">{durationPriceIdr == null ? "—" : formatIdr(durationPriceIdr)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t("order.plan")}</span>
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

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t("order.template")}</span>
            <span className="text-sm font-medium text-foreground truncate max-w-[220px]">{state.selectedTemplateName || "—"}</span>
          </div>
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
