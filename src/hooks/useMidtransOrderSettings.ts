import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Env = "sandbox" | "production";

export function useMidtransOrderSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [env, setEnv] = useState<Env>("production");
  const [clientKey, setClientKey] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke<{
          ok: boolean;
          enabled?: boolean;
          env: Env;
          merchant_id: string | null;
          client_key: string | null;
          ready: boolean;
        }>("midtrans-order-settings", { body: {} });
        if (fnErr) throw fnErr;
        if (!data?.ok) throw new Error("Midtrans settings not available");
        setEnv(data.env);
        setClientKey(data.client_key ?? null);
        setMerchantId(data.merchant_id ?? null);
        setEnabled(Boolean((data as any)?.enabled ?? true));
        setReady(Boolean(Boolean((data as any)?.enabled ?? true) && data.ready && data.client_key));
      } catch (e: any) {
        setError(e?.message ?? "Failed to load Midtrans settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, error, env, clientKey, merchantId, ready, enabled };
}
