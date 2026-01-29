import type { NavigateFunction } from "react-router-dom";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { invokeWithAuth } from "@/lib/invokeWithAuth";

import type { MidtransEnv, MidtransStatus } from "@/components/super-admin/MidtransIntegrationCard";

const SETTINGS_FN = "super-admin-midtrans-settings";

type GetResponse = {
  configured: boolean;
  updated_at: string | null;
  active_env: MidtransEnv | null;
  merchant_id: string | null;
  sandbox: {
    configured: boolean;
    client_key_masked: string | null;
    server_key_masked: string | null;
    updated_at: string | null;
  };
  production: {
    configured: boolean;
    client_key_masked: string | null;
    server_key_masked: string | null;
    updated_at: string | null;
  };
};

type SetActiveEnvResponse = { ok: boolean; active_env: MidtransEnv };
type SetKeysResponse = { ok: boolean };

export function useMidtransIntegration({ navigate }: { navigate: NavigateFunction }) {
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<MidtransStatus>({
    merchantId: null,
    updatedAt: null,
    activeEnv: null,
    sandbox: { configured: false, clientKeyMasked: null, serverKeyMasked: null, updatedAt: null },
    production: { configured: false, clientKeyMasked: null, serverKeyMasked: null, updatedAt: null },
  });

  const [selectedEnv, setSelectedEnv] = useState<MidtransEnv>("production");

  const [apiKeysEnv, setApiKeysEnv] = useState<MidtransEnv>("production");
  const [merchantIdValue, setMerchantIdValue] = useState("");
  const [clientKeyValue, setClientKeyValue] = useState("");
  const [serverKeyValue, setServerKeyValue] = useState("");

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeWithAuth<GetResponse>(SETTINGS_FN, { action: "get" });
      if (error) throw error;

      const sandbox = (data as any)?.sandbox ?? {};
      const production = (data as any)?.production ?? {};

      setStatus({
        merchantId: ((data as any)?.merchant_id ?? null) as any,
        updatedAt: ((data as any)?.updated_at ?? null) as any,
        activeEnv: ((data as any)?.active_env ?? null) as any,
        sandbox: {
          configured: Boolean(sandbox?.configured),
          clientKeyMasked: (sandbox?.client_key_masked ?? null) as any,
          serverKeyMasked: (sandbox?.server_key_masked ?? null) as any,
          updatedAt: (sandbox?.updated_at ?? null) as any,
        },
        production: {
          configured: Boolean(production?.configured),
          clientKeyMasked: (production?.client_key_masked ?? null) as any,
          serverKeyMasked: (production?.server_key_masked ?? null) as any,
          updatedAt: (production?.updated_at ?? null) as any,
        },
      });

      const active = (data as any)?.active_env;
      if (active === "sandbox" || active === "production") {
        setSelectedEnv(active);
      }

      const merchantId = String(((data as any)?.merchant_id ?? "") as any).trim();
      if (merchantId) setMerchantIdValue(merchantId);
    } catch (e: any) {
      console.error(e);
      if (String(e?.message ?? "").toLowerCase().includes("unauthorized")) {
        toast.error("Your session has expired. Please sign in again.");
        navigate("/super-admin/login", { replace: true });
        return;
      }
      toast.error(e?.message || "Unable to load Midtrans status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveSelectedEnv = async () => {
    setLoading(true);
    try {
      const { error } = await invokeWithAuth<SetActiveEnvResponse>(SETTINGS_FN, {
        action: "set_active_env",
        env: selectedEnv,
      });
      if (error) throw error;
      toast.success(`Midtrans environment set to ${selectedEnv}.`);
      await fetchStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to save Midtrans environment.");
    } finally {
      setLoading(false);
    }
  };

  const normalizeMerchantId = (input: string) => {
    const v = String(input ?? "").trim();
    if (!v) throw new Error("Merchant ID wajib diisi.");
    if (!/^[A-Za-z0-9_-]{3,64}$/.test(v)) throw new Error("Format Merchant ID tidak valid.");
    return v;
  };

  const normalizeKey = (input: string, label: string) => {
    const v = String(input ?? "").trim();
    if (!v) throw new Error(`${label} wajib diisi.`);
    if (/\s/.test(v) || v.length < 8) throw new Error(`${label} tidak valid.`);
    return v;
  };

  const onSaveApiKeys = async () => {
    setLoading(true);
    try {
      const merchant_id = normalizeMerchantId(merchantIdValue);
      const client_key = normalizeKey(clientKeyValue, "Client Key");
      const server_key = normalizeKey(serverKeyValue, "Server Key");

      const { error } = await invokeWithAuth<SetKeysResponse>(SETTINGS_FN, {
        action: "set",
        env: apiKeysEnv,
        merchant_id,
        client_key,
        server_key,
      });
      if (error) throw error;

      setClientKeyValue("");
      setServerKeyValue("");
      toast.success(`Midtrans API keys (${apiKeysEnv}) berhasil disimpan.`);
      await fetchStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to save Midtrans API keys.");
    } finally {
      setLoading(false);
    }
  };

  return useMemo(
    () => ({
      loading,
      status,
      selectedEnv,
      setSelectedEnv,
      onSaveSelectedEnv,
      onRefresh: fetchStatus,

      apiKeysEnv,
      setApiKeysEnv,
      merchantIdValue,
      setMerchantIdValue,
      clientKeyValue,
      setClientKeyValue,
      serverKeyValue,
      setServerKeyValue,
      onSaveApiKeys,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, status, selectedEnv, apiKeysEnv, merchantIdValue, clientKeyValue, serverKeyValue],
  );
}
