import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, KeyRound } from "lucide-react";
import { DomainDuckIntegrationCard, type DomainDuckTestResult } from "@/components/super-admin/DomainDuckIntegrationCard";
import { Ga4IntegrationCard } from "@/components/super-admin/Ga4IntegrationCard";
import { GscIntegrationCard } from "@/components/super-admin/GscIntegrationCard";
import { SitemapIntegrationCard } from "@/components/super-admin/SitemapIntegrationCard";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { useSitemapIntegration } from "@/pages/dashboard/super-admin/useSitemapIntegration";
import { RobotsTxtIntegrationCard } from "@/components/super-admin/RobotsTxtIntegrationCard";
import { useRobotsTxtIntegration } from "@/pages/dashboard/super-admin/useRobotsTxtIntegration";
import { SchemaIntegrationCard } from "@/components/super-admin/SchemaIntegrationCard";
import { useSchemaIntegration } from "@/pages/dashboard/super-admin/useSchemaIntegration";
import { MidtransIntegrationCard } from "@/components/super-admin/MidtransIntegrationCard";
import { useMidtransIntegration } from "@/pages/dashboard/super-admin/useMidtransIntegration";
import { XenditIntegrationCard } from "@/components/super-admin/XenditIntegrationCard";
import { PaypalIntegrationCard } from "@/components/super-admin/PaypalIntegrationCard";
import { usePaypalIntegration } from "@/pages/dashboard/super-admin/usePaypalIntegration";

const GSC_SETTINGS_FN = "super-admin-gsc-settings";

export default function SuperAdminCms() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const sitemap = useSitemapIntegration({ navigate });
  const robots = useRobotsTxtIntegration({ navigate });
  const schema = useSchemaIntegration({ navigate });
  const midtrans = useMidtransIntegration({ navigate });
  const paypal = usePaypalIntegration({ navigate });

  const [domainduckKey, setDomainduckKey] = useState("");
  const [domainduckConfigured, setDomainduckConfigured] = useState(false);
  const [domainduckUpdatedAt, setDomainduckUpdatedAt] = useState<string | null>(null);
  const [domainduckApiKeyMasked, setDomainduckApiKeyMasked] = useState<string | null>(null);
  const [domainduckRevealedApiKey, setDomainduckRevealedApiKey] = useState<string | null>(null);
  const [domainduckUsage, setDomainduckUsage] = useState<{ used: number; limit: number; exhausted: boolean } | null>(null);
  const [domainduckTestDomain, setDomainduckTestDomain] = useState("example.com");
  const [domainduckTestResult, setDomainduckTestResult] = useState<DomainDuckTestResult | null>(null);

  const [ga4MeasurementId, setGa4MeasurementId] = useState("");
  const [ga4Configured, setGa4Configured] = useState(false);
  const [ga4UpdatedAt, setGa4UpdatedAt] = useState<string | null>(null);
  const [ga4Masked, setGa4Masked] = useState<string | null>(null);

  const [gscToken, setGscToken] = useState("");
  const [gscConfigured, setGscConfigured] = useState(false);
  const [gscUpdatedAt, setGscUpdatedAt] = useState<string | null>(null);
  const [gscMasked, setGscMasked] = useState<string | null>(null);

  const [xenditApiKey, setXenditApiKey] = useState("");
  const [xenditConfigured, setXenditConfigured] = useState(false);
  const [xenditUpdatedAt, setXenditUpdatedAt] = useState<string | null>(null);

  const fetchXenditStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeWithAuth<any>("super-admin-xendit-secret", { action: "get" });
      if (error) throw error;
      setXenditConfigured(Boolean((data as any)?.configured));
      setXenditUpdatedAt(((data as any)?.updated_at ?? null) as string | null);
    } catch (e: any) {
      console.error(e);
      if (String(e?.message ?? "").toLowerCase().includes("unauthorized")) {
        toast.error("Your session has expired. Please sign in again.");
        navigate("/super-admin/login", { replace: true });
        return;
      }
      toast.error(e?.message || "Unable to load Xendit status.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGa4Status = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeWithAuth<any>("super-admin-ga4-settings", { action: "get" });
      if (error) throw error;
      setGa4Configured(Boolean((data as any)?.configured));
      setGa4UpdatedAt(((data as any)?.updated_at ?? null) as string | null);
      setGa4Masked(((data as any)?.measurement_id_masked ?? null) as any);
    } catch (e: any) {
      console.error(e);
      if (String(e?.message ?? "").toLowerCase().includes("unauthorized")) {
        toast.error("Your session has expired. Please sign in again.");
        navigate("/super-admin/login", { replace: true });
        return;
      }
      toast.error(e?.message || "Unable to load GA4 status.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGscStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeWithAuth<any>(GSC_SETTINGS_FN, { action: "get" });
      if (error) throw error;
      setGscConfigured(Boolean((data as any)?.configured));
      setGscUpdatedAt(((data as any)?.updated_at ?? null) as string | null);
      setGscMasked(((data as any)?.token_masked ?? null) as any);
    } catch (e: any) {
      console.error(e);
      if (String(e?.message ?? "").toLowerCase().includes("unauthorized")) {
        toast.error("Your session has expired. Please sign in again.");
        navigate("/super-admin/login", { replace: true });
        return;
      }
      toast.error(e?.message || "Unable to load Search Console status.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDomainDuckStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeWithAuth<any>("super-admin-domainduck-secret", { action: "get" });
      if (error) throw error;
      setDomainduckConfigured(Boolean((data as any)?.configured));
      setDomainduckUpdatedAt(((data as any)?.updated_at ?? null) as string | null);
      setDomainduckUsage(((data as any)?.usage ?? null) as any);
      setDomainduckApiKeyMasked(((data as any)?.api_key_masked ?? null) as any);
      setDomainduckRevealedApiKey(null);
    } catch (e: any) {
      console.error(e);
      if (String(e?.message ?? "").toLowerCase().includes("unauthorized")) {
        toast.error("Your session has expired. Please sign in again.");
        navigate("/super-admin/login", { replace: true });
        return;
      }
      toast.error(e?.message || "Unable to load DomainDuck status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomainDuckStatus();
    fetchGa4Status();
    fetchGscStatus();
    fetchXenditStatus();
  }, []);

  const onSaveXenditApiKey = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const v = xenditApiKey.trim();
      if (!v) throw new Error("API key is required.");
      if (/\s/.test(v) || v.length < 8) throw new Error("Invalid API key.");

      const { error } = await invokeWithAuth<any>("super-admin-xendit-secret", { action: "set", api_key: v });
      if (error) throw error;

      setXenditApiKey("");
      toast.success("Xendit API key has been saved.");
      await fetchXenditStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to save Xendit API key.");
    } finally {
      setLoading(false);
    }
  };

  const onClearXenditApiKey = async () => {
    setLoading(true);
    try {
      const { error } = await invokeWithAuth<any>("super-admin-xendit-secret", { action: "clear" });
      if (error) throw error;
      toast.success("Xendit API key has been reset.");
      await fetchXenditStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to reset Xendit API key.");
    } finally {
      setLoading(false);
    }
  };

  const onSaveGa4 = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const v = ga4MeasurementId.trim();
      if (!v) throw new Error("Measurement ID is required.");
      if (!/^G-[A-Z0-9]{6,}$/i.test(v)) throw new Error("Invalid Measurement ID format (example: G-CTS53JM1RF).");

      const { error } = await invokeWithAuth<any>("super-admin-ga4-settings", { action: "set", measurement_id: v });
      if (error) throw error;

      setGa4MeasurementId("");
      toast.success("GA4 has been enabled.");
      await fetchGa4Status();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to save GA4 settings.");
    } finally {
      setLoading(false);
    }
  };

  const onClearGa4 = async () => {
    setLoading(true);
    try {
      const { error } = await invokeWithAuth<any>("super-admin-ga4-settings", { action: "clear" });
      if (error) throw error;
      toast.success("GA4 has been disabled.");
      await fetchGa4Status();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to disable GA4.");
    } finally {
      setLoading(false);
    }
  };

  const parseGscVerificationToken = (input: string): string => {
    const raw = String(input ?? "").trim();
    if (!raw) throw new Error("Verification token / meta tag is required.");

    // Allow direct token.
    if (/^[A-Za-z0-9._-]{10,256}$/.test(raw)) return raw;

    // Allow a full meta tag: <meta name="google-site-verification" content="..." />
    // We keep parsing strict (only accept URL-safe-ish token chars) to prevent injection.
    const meta = raw.replace(/\s+/g, " ").trim();
    const match = meta.match(
      /<meta\s+[^>]*name=(?:"|')google-site-verification(?:"|')[^>]*content=(?:"|')([^"']{10,256})(?:"|')[^>]*\/?\s*>/i,
    );
    const token = match?.[1]?.trim();
    if (token && /^[A-Za-z0-9._-]{10,256}$/.test(token)) return token;

    throw new Error(
      "Format tidak valid. Masukkan token saja, atau meta tag seperti: <meta name=\"google-site-verification\" content=\"...\" />",
    );
  };

  const onSaveGsc = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const v = parseGscVerificationToken(gscToken);

      const { error } = await invokeWithAuth<any>(GSC_SETTINGS_FN, { action: "set", token: v });
      if (error) throw error;

      setGscToken("");
      toast.success("Google Search Console verification has been enabled.");
      await fetchGscStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to save Search Console settings.");
    } finally {
      setLoading(false);
    }
  };

  const onClearGsc = async () => {
    setLoading(true);
    try {
      const { error } = await invokeWithAuth<any>(GSC_SETTINGS_FN, { action: "clear" });
      if (error) throw error;
      toast.success("Google Search Console verification has been disabled.");
      await fetchGscStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to disable Search Console verification.");
    } finally {
      setLoading(false);
    }
  };

  const onSaveDomainDuckKey = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const v = domainduckKey.trim();
      if (!v) throw new Error("API key is required.");
      if (/\s/.test(v) || v.length < 8) throw new Error("Invalid API key.");

      const { error } = await invokeWithAuth<any>("super-admin-domainduck-secret", { action: "set", api_key: v });
      if (error) throw error;

      setDomainduckKey("");
      toast.success("API key has been saved.");
      await fetchDomainDuckStatus();

      // Ensure Test + Search Domain become immediately usable with the new key.
      // Auto-run a quick test using the current test domain (if any).
      if (domainduckTestDomain.trim()) {
        await onTestDomainDuck();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to save API key.");
    } finally {
      setLoading(false);
    }
  };

  const onClearDomainDuckKey = async () => {
    setLoading(true);
    try {
      const { error } = await invokeWithAuth<any>("super-admin-domainduck-secret", { action: "clear" });
      if (error) throw error;
      toast.success("API key has been reset.");
      setDomainduckTestResult(null);
      setDomainduckUsage(null);
      setDomainduckApiKeyMasked(null);
      setDomainduckRevealedApiKey(null);
      await fetchDomainDuckStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to reset API key.");
    } finally {
      setLoading(false);
    }
  };

  const onRevealDomainDuckKey = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeWithAuth<any>("super-admin-domainduck-secret", { action: "reveal" });
      if (error) throw error;
      setDomainduckRevealedApiKey(String((data as any)?.api_key ?? "") || null);
      setDomainduckApiKeyMasked(String((data as any)?.api_key_masked ?? "") || null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to reveal the API key.");
    } finally {
      setLoading(false);
    }
  };

  const onHideDomainDuckKey = () => {
    setDomainduckRevealedApiKey(null);
  };

  const onTestDomainDuck = async () => {
    setLoading(true);
    setDomainduckTestResult(null);
    try {
      const d = domainduckTestDomain.trim();
      if (!d) throw new Error("Test domain is required.");

      const { data, error } = await supabase.functions.invoke<any>("domainduck-check", { body: { domain: d } });
      if (error) {
        const resp = (error as any)?.context?.response;
        if (resp) {
          const payload = await resp.json().catch(() => null);
          throw new Error(payload?.error || error.message);
        }
        throw error;
      }

      const availability = String((data as any)?.availability ?? "blocked") as any;
      const result: DomainDuckTestResult = { domain: d, availability };
      setDomainduckTestResult(result);

      const usage = (data as any)?.usage;
      if (usage && typeof usage === "object") {
        const used = Number((usage as any)?.used ?? 0);
        const limit = Number((usage as any)?.limit ?? 250);
        setDomainduckUsage({ used, limit, exhausted: used >= limit });
      }

      if (availability === "true") toast.success("Available");
      else if (availability === "false") toast.error("Unavailable");
      else if (availability === "premium") toast.message("Premium Domain");
      else toast.message("Not Available");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "DomainDuck test failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground">Connect external services needed by the platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DomainDuckIntegrationCard
          loading={loading}
          status={{ configured: domainduckConfigured, updatedAt: domainduckUpdatedAt, usage: domainduckUsage, apiKeyMasked: domainduckApiKeyMasked }}
          revealedApiKey={domainduckRevealedApiKey}
          onRevealApiKey={onRevealDomainDuckKey}
          onHideApiKey={onHideDomainDuckKey}
          apiKeyValue={domainduckKey}
          onApiKeyChange={setDomainduckKey}
          onSave={onSaveDomainDuckKey}
          onRefresh={fetchDomainDuckStatus}
          onClear={onClearDomainDuckKey}
          testDomainValue={domainduckTestDomain}
          onTestDomainChange={setDomainduckTestDomain}
          onTest={onTestDomainDuck}
          testResult={domainduckTestResult}
        />

        <Ga4IntegrationCard
          loading={loading}
          status={{ configured: ga4Configured, updatedAt: ga4UpdatedAt, measurementIdMasked: ga4Masked }}
          value={ga4MeasurementId}
          onChange={setGa4MeasurementId}
          onSave={onSaveGa4}
          onRefresh={fetchGa4Status}
          onClear={onClearGa4}
        />

        <GscIntegrationCard
          loading={loading}
          status={{ configured: gscConfigured, updatedAt: gscUpdatedAt, tokenMasked: gscMasked }}
          value={gscToken}
          onChange={setGscToken}
          onSave={onSaveGsc}
          onRefresh={fetchGscStatus}
          onClear={onClearGsc}
        />

        <SitemapIntegrationCard
          loading={sitemap.loading}
          status={sitemap.status}
          value={sitemap.value}
          onChange={sitemap.onChange}
          onSave={sitemap.onSave}
          onRefresh={sitemap.onRefresh}
          onClear={sitemap.onClear}
          onOpenSitemap={sitemap.onOpenSitemap}
        />

        <RobotsTxtIntegrationCard
          loading={robots.loading}
          status={robots.status}
          value={robots.value}
          onChange={robots.onChange}
          onSave={robots.onSave}
          onRefresh={robots.onRefresh}
          onClear={robots.onClear}
          onOpenRobots={robots.onOpenRobots}
          showDisallowAllWarning={robots.showDisallowAllWarning}
        />

        <SchemaIntegrationCard
          loading={schema.loading}
          status={schema.status}
          value={schema.value}
          onChange={schema.onChange}
          onSave={schema.onSave}
          onRefresh={schema.onRefresh}
          onClear={schema.onClear}
        />

        {/* Domain Lookup configured above (DomainDuck) */}

        <MidtransIntegrationCard
          loading={midtrans.loading}
          status={midtrans.status}
          enabled={midtrans.enabled}
          onEnabledChange={midtrans.setEnabled}
          onSaveEnabled={midtrans.onSaveEnabled}
          selectedEnv={midtrans.selectedEnv}
          onSelectedEnvChange={midtrans.setSelectedEnv}
          onSaveSelectedEnv={midtrans.onSaveSelectedEnv}
          onRefresh={midtrans.onRefresh}

          apiKeysEnv={midtrans.apiKeysEnv}
          onApiKeysEnvChange={midtrans.setApiKeysEnv}
          merchantIdValue={midtrans.merchantIdValue}
          onMerchantIdChange={midtrans.setMerchantIdValue}
          clientKeyValue={midtrans.clientKeyValue}
          onClientKeyChange={midtrans.setClientKeyValue}
          serverKeyValue={midtrans.serverKeyValue}
          onServerKeyChange={midtrans.setServerKeyValue}
          onSaveApiKeys={midtrans.onSaveApiKeys}
        />

        <PaypalIntegrationCard
          loading={paypal.loading}
          status={paypal.status}
          enabled={paypal.enabled}
          onEnabledChange={paypal.setEnabled}
          onSaveEnabled={paypal.onSaveEnabled}
          activeEnv={paypal.activeEnv}
          onActiveEnvChange={paypal.setActiveEnv}
          onSaveActiveEnv={paypal.onSaveActiveEnv}
          onResetEnv={paypal.onResetEnv}
          clientIdValue={paypal.clientIdValue}
          onClientIdValueChange={paypal.setClientIdValue}
          onSaveClientId={paypal.onSaveClientId}
          secretValue={paypal.secretValue}
          onSecretValueChange={paypal.setSecretValue}
          onSaveSecret={paypal.onSaveSecret}
          onRefresh={paypal.onRefresh}
        />

        <XenditIntegrationCard
          loading={loading}
          status={{ configured: xenditConfigured, updatedAt: xenditUpdatedAt }}
          apiKeyValue={xenditApiKey}
          onApiKeyChange={setXenditApiKey}
          onSave={onSaveXenditApiKey}
          onRefresh={fetchXenditStatus}
          onClear={onClearXenditApiKey}
        />

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email / Notifications
              </CardTitle>
              <Badge variant="secondary">Ready</Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Resend is already configured; we can add templates, test sends, and activity logs.
            <div className="mt-4">
              <Button variant="outline" disabled>
                <KeyRound className="h-4 w-4 mr-2" /> Configure
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
