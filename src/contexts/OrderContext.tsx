import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type DomainStatus = "available" | "unavailable" | "premium";

export type OrderDetails = {
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  provinceCode: string;
  provinceName: string;
  city: string;
  acceptedTerms: boolean;
};

export type OrderState = {
  domain: string;
  domainStatus: DomainStatus | null;
  selectedTemplateId: string | null;
  selectedTemplateName: string | null;
  selectedPackageId: string | null;
  selectedPackageName: string | null;
  /** key: package_add_ons.id */
  addOns: Record<string, number>;
  /** key: subscription_add_ons.id */
  subscriptionAddOns: Record<string, boolean>;
  subscriptionYears: number | null;
  details: OrderDetails;
  promoCode: string;
  appliedPromo: {
    id: string;
    code: string;
    promoName: string;
    discountUsd: number;
  } | null;
};

type OrderContextValue = {
  state: OrderState;
  setDomain: (domain: string) => void;
  setDomainStatus: (status: DomainStatus | null) => void;
  setTemplate: (template: { id: string; name: string } | null) => void;
  setPackage: (pkg: { id: string; name: string } | null) => void;
  setAddOnQuantity: (addOnId: string, quantity: number) => void;
  setSubscriptionAddOnSelected: (addOnId: string, selected: boolean) => void;
  setSubscriptionYears: (years: number | null) => void;
  setDetails: (patch: Partial<OrderDetails>) => void;
  setPromoCode: (code: string) => void;
  setAppliedPromo: (promo: OrderState["appliedPromo"]) => void;
  reset: () => void;
};

const STORAGE_KEY = "ema_order_v1";

const defaultState: OrderState = {
  domain: "",
  domainStatus: null,
  selectedTemplateId: null,
  selectedTemplateName: null,
  selectedPackageId: null,
  selectedPackageName: null,
  addOns: {},
  subscriptionAddOns: {},
  subscriptionYears: null,
  details: {
    name: "",
    email: "",
    phone: "",
    businessName: "",
    provinceCode: "",
    provinceName: "",
    city: "",
    acceptedTerms: false,
  },
  promoCode: "",
  appliedPromo: null,
};

const OrderContext = createContext<OrderContextValue | null>(null);

function safeParse(json: string | null): OrderState | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Partial<OrderState>;
    return {
      ...defaultState,
      ...parsed,
      details: { ...defaultState.details, ...(parsed.details ?? {}) },
    };
  } catch {
    return null;
  }
}

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OrderState>(() => safeParse(localStorage.getItem(STORAGE_KEY)) ?? defaultState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Keep action functions stable to avoid effect dependency loops in consumers.
  const setDomain = useCallback((domain: string) => setState((s) => ({ ...s, domain })), []);
  const setDomainStatus = useCallback((domainStatus: DomainStatus | null) => setState((s) => ({ ...s, domainStatus })), []);
  const setTemplate = useCallback((template: { id: string; name: string } | null) => {
    setState((s) => ({
      ...s,
      selectedTemplateId: template?.id ?? null,
      selectedTemplateName: template?.name ?? null,
    }));
  }, []);

  const setPackage = useCallback((pkg: { id: string; name: string } | null) => {
    setState((s) => ({
      ...s,
      selectedPackageId: pkg?.id ?? null,
      selectedPackageName: pkg?.name ?? null,
      // Reset add-ons when package changes.
      addOns: {},
    }));
  }, []);

  const setAddOnQuantity = useCallback((addOnId: string, quantity: number) => {
    setState((s) => {
      const q = Number.isFinite(Number(quantity)) ? Math.max(0, Math.floor(Number(quantity))) : 0;
      const next = { ...(s.addOns ?? {}) };
      if (q <= 0) delete next[addOnId];
      else next[addOnId] = q;
      return { ...s, addOns: next };
    });
  }, []);

  const setSubscriptionAddOnSelected = useCallback((addOnId: string, selected: boolean) => {
    setState((s) => {
      const next = { ...(s.subscriptionAddOns ?? {}) };
      if (!selected) delete next[addOnId];
      else next[addOnId] = true;
      return { ...s, subscriptionAddOns: next };
    });
  }, []);

  const setSubscriptionYears = useCallback((subscriptionYears: number | null) => setState((s) => ({ ...s, subscriptionYears })), []);
  const setDetails = useCallback((patch: Partial<OrderDetails>) => setState((s) => ({ ...s, details: { ...s.details, ...patch } })), []);
  const setPromoCode = useCallback((promoCode: string) => setState((s) => ({ ...s, promoCode })), []);
  const setAppliedPromo = useCallback((appliedPromo: OrderState["appliedPromo"]) => setState((s) => ({ ...s, appliedPromo })), []);
  const reset = useCallback(() => setState(defaultState), []);

  const value = useMemo<OrderContextValue>(() => {
    return {
      state,
      setDomain,
      setDomainStatus,
      setTemplate,
      setPackage,
      setAddOnQuantity,
      setSubscriptionAddOnSelected,
      setSubscriptionYears,
      setDetails,
      setPromoCode,
      setAppliedPromo,
      reset,
    };
  }, [reset, setAddOnQuantity, setAppliedPromo, setDetails, setDomain, setDomainStatus, setPackage, setPromoCode, setSubscriptionAddOnSelected, setSubscriptionYears, setTemplate, state]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
}
