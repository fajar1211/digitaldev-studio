import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DomainSuggestionStatus = "available" | "unavailable" | "premium" | "unknown";

export type DomainSuggestionItem = {
  domain: string;
  status: DomainSuggestionStatus;
  price_usd: number | null;
  currency: string | null;
};

type State = {
  loading: boolean;
  error: string | null;
  items: DomainSuggestionItem[];
};

export function useDomainSuggestions(query: string, { enabled = true, debounceMs = 450 } = {}) {
  const [state, setState] = useState<State>({ loading: false, error: null, items: [] });
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const q = String(query ?? "").trim();
    if (!q) {
      setState({ loading: false, error: null, items: [] });
      return;
    }

    if (timer.current) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { data, error } = await supabase.functions.invoke("domainr-check", {
          body: { query: q },
        });
        if (error) throw error;

        const items = Array.isArray((data as any)?.items) ? ((data as any).items as any[]) : [];
        setState({
          loading: false,
          error: null,
          items: items.map((it) => ({
            domain: String(it?.domain ?? ""),
            status: (it?.status ?? "unknown") as DomainSuggestionStatus,
            price_usd: typeof it?.price_usd === "number" ? it.price_usd : null,
            currency: it?.currency ? String(it.currency) : null,
          })),
        });
      } catch (e: any) {
        setState({ loading: false, error: e?.message ?? "Failed to fetch domain suggestions", items: [] });
      }
    }, debounceMs);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [debounceMs, enabled, query]);

  return state;
}
