import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderLayout } from "@/components/order/OrderLayout";
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard";
import { useOrder } from "@/contexts/OrderContext";
import { useOrderPublicSettings } from "@/hooks/useOrderPublicSettings";
import { validatePromoCode } from "@/hooks/useOrderPromoCode";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMidtransOrderSettings } from "@/hooks/useMidtransOrderSettings";

declare global {
  interface Window {
    MidtransNew3ds?: {
      getCardToken: (
        cardData: {
          card_number: string;
          card_exp_month: string;
          card_exp_year: string;
          card_cvv: string;
        },
        options: {
          onSuccess: (response: any) => void;
          onFailure: (response: any) => void;
        },
      ) => void;
    };
  }
}

export default function Payment() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state, setPromoCode, setAppliedPromo } = useOrder();
  const { pricing, subscriptionPlans } = useOrderPublicSettings(state.domain);
  const midtrans = useMidtransOrderSettings();
  const [method, setMethod] = useState<"card" | "bank">("card");
  const [promo, setPromo] = useState(state.promoCode);
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [paying, setPaying] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const baseTotalUsd = useMemo(() => {
    if (!state.subscriptionYears) return null;
    const selectedPlan = subscriptionPlans.find((p) => p.years === state.subscriptionYears);
    const planOverrideUsd =
      typeof selectedPlan?.price_usd === "number" && Number.isFinite(selectedPlan.price_usd) ? selectedPlan.price_usd : null;
    if (planOverrideUsd != null) return planOverrideUsd;
    const domainUsd = pricing.domainPriceUsd ?? null;
    const pkgUsd = pricing.packagePriceUsd ?? null;
    if (domainUsd == null || pkgUsd == null) return null;
    return (domainUsd + pkgUsd) * state.subscriptionYears;
  }, [pricing.domainPriceUsd, pricing.packagePriceUsd, state.subscriptionYears, subscriptionPlans]);

  const totalAfterPromoUsd = useMemo(() => {
    if (baseTotalUsd == null) return null;
    const d = state.appliedPromo?.discountUsd ?? 0;
    const discount = Number.isFinite(d) && d > 0 ? d : 0;
    return Math.max(0, baseTotalUsd - discount);
  }, [baseTotalUsd, state.appliedPromo?.discountUsd]);

  // Auto-apply promo as user types (debounced), so Est. price updates immediately.
  useEffect(() => {
    const code = promo.trim();
    // Avoid update loops: only write to context when value actually changes.
    if (code !== state.promoCode) setPromoCode(code);

    // Clear applied promo while typing / when empty
    if (!code || baseTotalUsd == null) {
      setAppliedPromo(null);
      return;
    }

    const t = window.setTimeout(async () => {
      const res = await validatePromoCode(code, baseTotalUsd);
      if (!res.ok) {
        setAppliedPromo(null);
        return;
      }
      setAppliedPromo({
        id: res.promo.id,
        code: res.promo.code,
        promoName: res.promo.promo_name,
        discountUsd: res.discountUsd,
      });
    }, 450);

    return () => window.clearTimeout(t);
  }, [baseTotalUsd, promo, setAppliedPromo, setPromoCode, state.promoCode]);

  const canComplete = useMemo(() => {
    return Boolean(
      state.domain &&
        state.selectedTemplateId &&
        state.subscriptionYears &&
        state.details.email &&
        state.details.acceptedTerms,
    );
  }, [state.details.acceptedTerms, state.details.email, state.domain, state.selectedTemplateId, state.subscriptionYears]);

  // Load Midtrans 3DS script when card method is selected.
  useEffect(() => {
    if (method !== "card") return;
    if (!midtrans.clientKey || !midtrans.env) return;
    if (document.getElementById("midtrans-script")) return;

    const s = document.createElement("script");
    s.id = "midtrans-script";
    s.type = "text/javascript";
    s.src = "https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js";
    s.setAttribute("data-environment", midtrans.env);
    s.setAttribute("data-client-key", midtrans.clientKey);
    s.async = true;
    document.body.appendChild(s);

    return () => {
      // Keep script cached for subsequent visits (do not remove).
    };
  }, [method, midtrans.clientKey, midtrans.env]);

  const isCardFormValid = useMemo(() => {
    const num = cardNumber.replace(/\s+/g, "");
    const mm = expMonth.trim();
    const yy = expYear.trim();
    const c = cvv.trim();
    return Boolean(num.length >= 12 && num.length <= 19 && mm.length === 2 && yy.length === 4 && c.length >= 3 && c.length <= 4);
  }, [cardNumber, cvv, expMonth, expYear]);

  return (
    <OrderLayout title="Payment" step="payment" sidebar={<OrderSummaryCard />}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" variant={method === "card" ? "default" : "outline"} onClick={() => setMethod("card")}>
                Card
              </Button>
              <Button type="button" variant={method === "bank" ? "default" : "outline"} onClick={() => setMethod("bank")}>
                Bank transfer
              </Button>
            </div>

            {method === "card" ? (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Midtrans Card (3DS)</p>
                    <p className="text-muted-foreground">Env: {midtrans.env}</p>
                  </div>
                  {midtrans.ready ? (
                    <span className="text-muted-foreground">Ready</span>
                  ) : (
                    <span className="text-muted-foreground">Not configured</span>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="Card number"
                      inputMode="numeric"
                      autoComplete="cc-number"
                    />
                  </div>
                  <Input
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="MM"
                    inputMode="numeric"
                    autoComplete="cc-exp-month"
                  />
                  <Input
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="YYYY"
                    inputMode="numeric"
                    autoComplete="cc-exp-year"
                  />
                  <Input
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="CVV"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                  />
                </div>

                {midtrans.error ? <p className="text-sm text-muted-foreground">{midtrans.error}</p> : null}
                {lastOrderId ? (
                  <p className="text-sm text-muted-foreground">
                    Last order id: <span className="font-medium text-foreground">{lastOrderId}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Bank transfer flow can be added next. For now, please choose Card.
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Promo code" />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const code = promo.trim();
                  setPromoCode(code);
                  if (!code) {
                    setAppliedPromo(null);
                    toast({ title: "Promo cleared" });
                    return;
                  }
                  if (baseTotalUsd == null) {
                    setAppliedPromo(null);
                      toast({ variant: "destructive", title: "Unable to apply promo", description: "The total amount is not available yet." });
                    return;
                  }

                  const res = await validatePromoCode(code, baseTotalUsd);
                  if (!res.ok) {
                    setAppliedPromo(null);
                      toast({ variant: "destructive", title: "Invalid promo code", description: "The promo code was not found or is not active." });
                    return;
                  }

                  setAppliedPromo({
                    id: res.promo.id,
                    code: res.promo.code,
                    promoName: res.promo.promo_name,
                    discountUsd: res.discountUsd,
                  });
                  toast({ title: "Promo applied", description: `${res.promo.promo_name} (-$${res.discountUsd.toFixed(2)})` });
                }}
              >
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Final review</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Please review your domain, chosen design, and details in the Order Summary.
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/order/subscription")}>
            Back
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!canComplete || method !== "card" || !midtrans.ready || !isCardFormValid || paying || totalAfterPromoUsd == null}
            onClick={async () => {
              if (!window.MidtransNew3ds?.getCardToken) {
                toast({ variant: "destructive", title: "Midtrans script not ready", description: "Please wait a moment and try again." });
                return;
              }
              if (totalAfterPromoUsd == null) {
                toast({ variant: "destructive", title: "Total not available" });
                return;
              }

              setPaying(true);
              try {
                const cardData = {
                  card_number: cardNumber.replace(/\s+/g, ""),
                  card_exp_month: expMonth,
                  card_exp_year: expYear,
                  card_cvv: cvv,
                };

                const tokenId: string = await new Promise((resolve, reject) => {
                  window.MidtransNew3ds!.getCardToken(cardData, {
                    onSuccess: (res) => {
                      const t = String(res?.token_id ?? "").trim();
                      if (!t) return reject(new Error("Token not returned"));
                      resolve(t);
                    },
                    onFailure: (res) => {
                      reject(new Error(String(res?.status_message ?? "Failed to tokenize card")));
                    },
                  });
                });

                const { data, error } = await supabase.functions.invoke<{
                  ok: boolean;
                  order_id: string;
                  redirect_url: string | null;
                  transaction_status: string | null;
                  error?: string;
                }>("midtrans-order-charge", {
                  body: {
                    token_id: tokenId,
                    env: midtrans.env,
                    amount_usd: totalAfterPromoUsd,
                    subscription_years: state.subscriptionYears,
                    promo_code: state.promoCode,
                    domain: state.domain,
                    selected_template_id: state.selectedTemplateId,
                    selected_template_name: state.selectedTemplateName,
                    customer_name: state.details.name,
                    customer_email: state.details.email,
                  },
                });
                if (error) throw error;
                if (!data?.ok) throw new Error(data?.error ?? "Charge failed");

                setLastOrderId(data.order_id);

                if (data.redirect_url) {
                  window.location.href = data.redirect_url;
                  return;
                }

                toast({ title: "Payment created", description: `Order: ${data.order_id}` });
              } catch (e: any) {
                toast({
                  variant: "destructive",
                  title: "Payment failed",
                  description: e?.message ?? "Please try again.",
                });
              } finally {
                setPaying(false);
              }
            }}
          >
            {paying ? "Processing..." : "Pay with Card"}
          </Button>
        </div>
      </div>
    </OrderLayout>
  );
}
