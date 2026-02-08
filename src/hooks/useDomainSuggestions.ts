import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DomainSuggestionStatus = "available" | "unavailable" | "premium" | "blocked" | "unknown";

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

const FAVORITE_TLDS = [".com", ".id", ".co.id"];

function normalizeKeyword(raw: string) {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\s+/g, "");
  if (!v) return "";
  return v.includes(".") ? v.split(".")[0] : v;
}

function buildCandidates(keyword: string) {
  const k = normalizeKeyword(keyword);
  if (!k) return [] as string[];
  return FAVORITE_TLDS.map((tld) => `${k}${tld}`).slice(0, 10);
}

export function useDomainSuggestions(query: string, { enabled = true, debounceMs = 450 } = {}) {
  const [state, setState] = useState<State>({ loading: false, error: null, items: [] });
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const q = normalizeKeyword(query);
    if (!q) {
      setState({ loading: false, error: null, items: [] });
      return;
    }

    if (timer.current) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(async () => {
      const candidates = buildCandidates(q);
      if (candidates.length === 0) {
        setState({ loading: false, error: null, items: [] });
        return;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const results = await Promise.all(
          candidates.map(async (domain) => {
            try {
              const { data, error } = await supabase.functions.invoke("domainduck-check", {
                body: { domain },
              });
              if (error) throw error;
              const availability = String((data as any)?.availability ?? "").toLowerCase();
              return {
                domain,
                availability,
              } as const;
            } catch (e: any) {
              return {
                domain,
                availability: "error",
                error: e?.message ?? "Failed",
              } as const;
            }
          }),
        );

        const statusFromAvailability = (availability: string): DomainSuggestionStatus => {
          switch (availability) {
            case "true":
              return "available";
            case "false":
              return "unavailable";
            case "premium":
              return "premium";
            case "blocked":
              return "blocked";
            default:
              return "unknown";
          }
        };

        const items: DomainSuggestionItem[] = results
          .filter((r) => r.availability !== "error")
          .map((r) => ({
            domain: r.domain,
            status: statusFromAvailability(r.availability),
            price_usd: null,
            currency: null,
          }));

        // If all calls failed, surface one representative error
        const allFailed = results.every((r) => r.availability === "error");
        const firstErr = results.find((r: any) => r.availability === "error") as any;

        setState({
          loading: false,
          error: allFailed ? (firstErr?.error ?? "Gagal cek domain") : null,
          items,
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
