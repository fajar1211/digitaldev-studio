import type { FormEvent } from "react";
import type { NavigateFunction } from "react-router-dom";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { invokeWithAuth } from "@/lib/invokeWithAuth";

import type { MidtransEnv, MidtransFormValue, MidtransStatus } from "@/components/super-admin/MidtransIntegrationCard";

const SETTINGS_FN = "super-admin-midtrans-settings";

type GetResponse = {
  configured: boolean;
  updated_at: string | null;
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

export function useMidtransIntegration({ navigate }: { navigate: NavigateFunction }) {
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<MidtransStatus>({
    merchantId: null,
    updatedAt: null,
    sandbox: { configured: false, clientKeyMasked: null, serverKeyMasked: null, updatedAt: null },
    production: { configured: false, clientKeyMasked: null, serverKeyMasked: null, updatedAt: null },
  });

  const [revealedServerKey, setRevealedServerKey] = useState<{ sandbox: string | null; production: string | null }>({
    sandbox: null,
    production: null,
  });

  const [value, setValue] = useState<MidtransFormValue>({
    merchantId: "",
    sandboxClientKey: "",
    sandboxServerKey: "",
    productionClientKey: "",
    productionServerKey: "",
  });

  const onChange = (patch: Partial<MidtransFormValue>) => setValue((v) => ({ ...v, ...patch }));

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

      setValue((prev) => ({
        ...prev,
        merchantId: String((data as any)?.merchant_id ?? prev.merchantId ?? ""),
      }));

      setRevealedServerKey({ sandbox: null, production: null });
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

  const onSave = (env: MidtransEnv) => async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const merchantId = value.merchantId.trim();
      if (!merchantId) throw new Error("Merchant ID wajib diisi.");
      if (!/^[A-Za-z0-9_-]{3,64}$/.test(merchantId)) throw new Error("Format Merchant ID tidak valid.");

      const clientKey = (env === "sandbox" ? value.sandboxClientKey : value.productionClientKey).trim();
      const serverKey = (env === "sandbox" ? value.sandboxServerKey : value.productionServerKey).trim();

      if (!clientKey) throw new Error("Client Key wajib diisi.");
      if (!serverKey) throw new Error("Server Key wajib diisi.");
      if (/\s/.test(clientKey) || clientKey.length < 8) throw new Error("Client Key tidak valid.");
      if (/\s/.test(serverKey) || serverKey.length < 8) throw new Error("Server Key tidak valid.");

      const { error } = await invokeWithAuth<any>(SETTINGS_FN, {
        action: "set",
        env,
        merchant_id: merchantId,
        client_key: clientKey,
        server_key: serverKey,
      });
      if (error) throw error;

      toast.success(`Midtrans ${env} saved.`);
      onChange({
        ...(env === "sandbox"
          ? { sandboxClientKey: "", sandboxServerKey: "" }
          : { productionClientKey: "", productionServerKey: "" }),
      });
      await fetchStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to save Midtrans settings.");
    } finally {
      setLoading(false);
    }
  };

  const onClear = async (env: MidtransEnv) => {
    setLoading(true);
    try {
      const { error } = await invokeWithAuth<any>(SETTINGS_FN, { action: "clear", env });
      if (error) throw error;
      toast.success(`Midtrans ${env} has been reset.`);
      await fetchStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to reset Midtrans settings.");
    } finally {
      setLoading(false);
    }
  };

  const onRevealServerKey = async (env: MidtransEnv) => {
    setLoading(true);
    try {
      const { data, error } = await invokeWithAuth<any>(SETTINGS_FN, { action: "reveal", env });
      if (error) throw error;
      const key = String((data as any)?.server_key ?? "") || null;
      setRevealedServerKey((prev) => ({ ...prev, [env]: key }));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to reveal server key.");
    } finally {
      setLoading(false);
    }
  };

  const onHideServerKey = (env: MidtransEnv) => {
    setRevealedServerKey((prev) => ({ ...prev, [env]: null }));
  };

  return useMemo(
    () => ({
      loading,
      status,
      value,
      onChange,
      onSave,
      onRefresh: fetchStatus,
      onClear,
      onRevealServerKey,
      onHideServerKey,
      revealedServerKey,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, status, value, revealedServerKey],
  );
}
