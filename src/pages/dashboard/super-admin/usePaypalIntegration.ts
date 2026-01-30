import type { NavigateFunction } from "react-router-dom";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { invokeWithAuth } from "@/lib/invokeWithAuth";

import type { PaypalEnv, PaypalStatus } from "@/components/super-admin/PaypalIntegrationCard";

const SETTINGS_FN = "super-admin-paypal-settings";
const SECRET_FN = "super-admin-paypal-secret";

type GetResponse = {
  enabled?: boolean;
  active_env: PaypalEnv | null;
  sandbox: { ready: boolean };
  production: { ready: boolean };
};

export function usePaypalIntegration({ navigate }: { navigate: NavigateFunction }) {
  const [loading, setLoading] = useState(false);

  const [enabled, setEnabled] = useState(true);

  const [status, setStatus] = useState<PaypalStatus>({ activeEnv: null, sandboxReady: false, productionReady: false });
  const [activeEnv, setActiveEnv] = useState<PaypalEnv>("sandbox");
  const [clientIdValue, setClientIdValue] = useState("");
  const [secretValue, setSecretValue] = useState("");

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeWithAuth<GetResponse>(SETTINGS_FN, { action: "get" });
      if (error) throw error;

      // Default to enabled when setting is missing (backward-compatible)
      const en = (data as any)?.enabled;
      if (typeof en === "boolean") setEnabled(en);

      const active = (data as any)?.active_env;
      if (active === "sandbox" || active === "production") setActiveEnv(active);

      setStatus({
        activeEnv: (active === "sandbox" || active === "production" ? active : null) as any,
        sandboxReady: Boolean((data as any)?.sandbox?.ready),
        productionReady: Boolean((data as any)?.production?.ready),
      });
    } catch (e: any) {
      console.error(e);
      if (String(e?.message ?? "").toLowerCase().includes("unauthorized")) {
        toast.error("Your session has expired. Please sign in again.");
        navigate("/super-admin/login", { replace: true });
        return;
      }
      toast.error(e?.message || "Unable to load PayPal status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveActiveEnv = async () => {
    setLoading(true);
    try {
      const { error } = await invokeWithAuth(SETTINGS_FN, { action: "set_active_env", env: activeEnv });
      if (error) throw error;
      toast.success(`PayPal environment set to ${activeEnv}.`);
      await fetchStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to save PayPal environment.");
    } finally {
      setLoading(false);
    }
  };

  const onSaveEnabled = async () => {
    setLoading(true);
    try {
      const { error } = await invokeWithAuth(SETTINGS_FN, { action: "set_enabled", enabled });
      if (error) throw error;
      toast.success(`PayPal ${enabled ? "enabled" : "disabled"}.`);
      await fetchStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to save PayPal enabled status.");
    } finally {
      setLoading(false);
    }
  };

  const onSaveClientId = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const v = clientIdValue.trim();
      if (!v) throw new Error("Client ID wajib diisi.");
      if (/\s/.test(v) || v.length < 8) throw new Error("Client ID tidak valid.");

      // Use the single env dropdown (activeEnv) for Client ID & Secret.
      const { error } = await invokeWithAuth(SETTINGS_FN, { action: "set_client_id", env: activeEnv, client_id: v });
      if (error) throw error;

      setClientIdValue("");
      toast.success(`PayPal Client ID (${activeEnv}) tersimpan.`);
      await fetchStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to save PayPal Client ID.");
    } finally {
      setLoading(false);
    }
  };

  const onSaveSecret = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const v = secretValue.trim();
      if (!v) throw new Error("Client Secret wajib diisi.");
      if (/\s/.test(v) || v.length < 8) throw new Error("Client Secret tidak valid.");

      const { error } = await invokeWithAuth(SECRET_FN, { action: "set", env: activeEnv, client_secret: v });
      if (error) throw error;

      setSecretValue("");
      toast.success(`PayPal Client Secret (${activeEnv}) tersimpan.`);
      await fetchStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to save PayPal Client Secret.");
    } finally {
      setLoading(false);
    }
  };

  const onResetEnv = async (env: PaypalEnv) => {
    setLoading(true);
    try {
      // Clear Client ID (website_settings)
      const { error: idErr } = await invokeWithAuth(SETTINGS_FN, { action: "clear_client_id", env });
      if (idErr) throw idErr;

      // Clear Client Secret (integration_secrets)
      const { error: secErr } = await invokeWithAuth(SECRET_FN, { action: "clear", env });
      if (secErr) throw secErr;

      toast.success(`PayPal env (${env}) di-reset.`);
      await fetchStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to reset PayPal env.");
    } finally {
      setLoading(false);
    }
  };

  return useMemo(
    () => ({
      loading,
      status,

      enabled,
      setEnabled,
      onSaveEnabled,

      activeEnv,
      setActiveEnv,
      onSaveActiveEnv,
      onResetEnv,
      clientIdValue,
      setClientIdValue,
      onSaveClientId,
      secretValue,
      setSecretValue,
      onSaveSecret,
      onRefresh: fetchStatus,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, status, enabled, activeEnv, clientIdValue, secretValue],
  );
}
