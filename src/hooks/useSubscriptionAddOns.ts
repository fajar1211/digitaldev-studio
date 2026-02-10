import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type SubscriptionAddOn = {
  id: string;
  label: string;
  description: string | null;
  price_idr: number;
  is_active: boolean;
  sort_order: number;
};

export function useSubscriptionAddOns(params: { selected: Record<string, boolean>; packageId: string | null }) {
  const { selected, packageId } = params;

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SubscriptionAddOn[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (!packageId) {
          if (mounted) setItems([]);
          return;
        }

        let nextItems: SubscriptionAddOn[] = [];

        try {
          // Prefer edge function to avoid RLS blocking public/order pages.
          const { data, error } = await supabase.functions.invoke<{ items: SubscriptionAddOn[] }>("order-subscription-addons", {
            body: { packageId },
          });
          if (error) throw error;
          nextItems = ((data as any)?.items ?? []) as any;
        } catch {
          // Fallback: if edge function is not reachable (e.g., not deployed yet / CORS),
          // try direct query using the current authenticated session.
          const { data, error } = await (supabase as any)
            .from("subscription_add_ons")
            .select("id,label,description,price_idr,is_active,sort_order")
            .eq("package_id", packageId)
            .or("is_active.eq.true,is_active.is.null")
            .order("sort_order", { ascending: true });
          if (!error) nextItems = (data ?? []) as any;
        }

        if (!mounted) return;
        setItems(nextItems);
      } catch {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [packageId]);

  const total = useMemo(() => {
    if (!items.length) return 0;
    return items.reduce((sum, a) => {
      if (!selected?.[a.id]) return sum;
      return sum + Number(a.price_idr ?? 0);
    }, 0);
  }, [items, selected]);

  return { loading, items, total };
}
