import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";



import { Plus, Save, Trash2 } from "lucide-react";
import PackageOnboardingSettingsPanel from "@/components/super-admin/PackageOnboardingSettingsPanel";

type PackageOption = {
  id: string;
  name: string;
  type: string;
};

type TldPriceRow = {
  tld: string;
  price_usd: number;
};

type PlanRow = {
  years: number;
  label: string;
  price_usd: number;
  is_active: boolean;
  sort_order: number;
};

type SubscriptionAddOnRow = {
  id?: string;
  label: string;
  description: string;
  price_idr: number;
  is_active: boolean;
  sort_order: number;
};

type WebsitePlanKey = "website_only" | "blog_social" | "full_digital";

type WebsitePlanDurationDraft = {
  discount_percent: number;
  manual_price_per_year: number | null;
  is_manual_locked: boolean;
};

type WebsitePlanPricingDraft = {
  key: WebsitePlanKey;
  label: string;
  // price basis for annual calculation
  base_mode: "monthly" | "yearly";
  base_price: number; // IDR
  durations: Record<number, WebsitePlanDurationDraft>; // years => config
};


const SETTINGS_SUBSCRIPTION_PLANS_KEY = "order_subscription_plans";

// Keep ordering consistent with /dashboard/super-admin/all-packages
const PACKAGE_TYPE_ORDER = ["starter", "growth", "pro", "optimize", "scale", "dominate"] as const;

function asNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTld(input: unknown): string {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\.+/, "")
    // support multi-part tld like "co.id" by converting to DB-friendly form "co-id"
    .replace(/\./g, "-");
}

function safeNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatIdr(n: number): string {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return new Intl.NumberFormat("id-ID").format(v);
}

export default function SuperAdminSubscriptions() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isEditingPlans, setIsEditingPlans] = useState(false);
  const [isEditingPricing, setIsEditingPricing] = useState(false);

  // Domain pricing (copied from Admin Domain Tools > Domain tab)
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [pricingPackageId, setPricingPackageId] = useState<string>("");
  const [tldPrices, setTldPrices] = useState<TldPriceRow[]>([]);

  const defaultTldRows: TldPriceRow[] = useMemo(() => ["com", "net", "org", "id"].map((tld) => ({ tld, price_usd: 0 })), []);

  const [plansLoading, setPlansLoading] = useState(true);
  const [plansSaving, setPlansSaving] = useState(false);
  const [plans, setPlans] = useState<PlanRow[]>([]);

  const defaultWebsitePlansDraft: Record<WebsitePlanKey, WebsitePlanPricingDraft> = useMemo(
    () => ({
      website_only: {
        key: "website_only",
        label: "Website Only",
        base_mode: "yearly",
        base_price: 0,
        durations: {},
      },
      blog_social: {
        key: "blog_social",
        label: "Blog + Social Media",
        base_mode: "monthly",
        base_price: 0,
        durations: {},
      },
      full_digital: {
        key: "full_digital",
        label: "Full Digital Marketing",
        base_mode: "monthly",
        base_price: 0,
        durations: {},
      },
    }),
    [],
  );

  // UI-only: draft per selected package id
  const [websitePlansPricingDraftByPackage, setWebsitePlansPricingDraftByPackage] = useState<
    Record<string, Record<WebsitePlanKey, WebsitePlanPricingDraft>>
  >({});

  const selectedPackageDraftKey = String(pricingPackageId || "__no_package_selected");
  const websitePlansPricingDraft = websitePlansPricingDraftByPackage[selectedPackageDraftKey] ?? defaultWebsitePlansDraft;

  const setWebsitePlansPricingDraft = (
    updater: (prev: Record<WebsitePlanKey, WebsitePlanPricingDraft>) => Record<WebsitePlanKey, WebsitePlanPricingDraft>,
  ) => {
    setWebsitePlansPricingDraftByPackage((prev) => {
      const current = prev[selectedPackageDraftKey] ?? defaultWebsitePlansDraft;
      return { ...prev, [selectedPackageDraftKey]: updater(current) };
    });
  };

  const [addOnsLoading, setAddOnsLoading] = useState(true);
  const [addOnsSaving, setAddOnsSaving] = useState(false);
  const [isEditingAddOns, setIsEditingAddOns] = useState(false);
  const [addOns, setAddOns] = useState<SubscriptionAddOnRow[]>([]);

  const fetchDomainPricing = async () => {
    setPricingLoading(true);
    try {
      const [{ data: pkgRows, error: pkgErr }, pricingRes] = await Promise.all([
        (supabase as any).from("packages").select("id,name,type,created_at"),
        (supabase as any).functions.invoke("admin-order-domain-pricing", { body: { action: "get" } }),
      ]);
      if (pkgErr) throw pkgErr;

      const mapped = Array.isArray(pkgRows)
        ? (pkgRows as any[]).map((p: any) => ({ id: String(p.id), name: String(p.name ?? ""), type: String(p.type ?? ""), created_at: p.created_at }))
        : [];

      const rank = (pkgType: string) => {
        const i = PACKAGE_TYPE_ORDER.indexOf(String(pkgType ?? "").toLowerCase().trim() as any);
        return i === -1 ? 999 : i;
      };

      mapped.sort((a, b) => {
        const ra = rank(a.type);
        const rb = rank(b.type);
        if (ra !== rb) return ra - rb;
        const an = a.name.toLowerCase();
        const bn = b.name.toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        // fallback: created_at
        return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
      });

      const pkgOptions: PackageOption[] = mapped.map((p) => ({ id: p.id, name: p.name, type: p.type }));
      setPackages(pkgOptions);

      const payload = (pricingRes as any)?.data ?? {};
      const defaultPackageId = String(payload?.default_package_id ?? "");
      const priceRows = Array.isArray(payload?.tld_prices) ? (payload.tld_prices as any[]) : [];

      const isDefaultPkgValid = defaultPackageId && pkgOptions.some((p) => p.id === defaultPackageId);

      if (isDefaultPkgValid) {
        setPricingPackageId(defaultPackageId);
      } else if (pkgOptions.length) {
        setPricingPackageId(pkgOptions[0].id);
      } else {
        setPricingPackageId("");
      }

      const normalized = priceRows
        .map((r) => ({ tld: normalizeTld(r?.tld), price_usd: safeNumber(r?.price_usd) }))
        .filter((r) => r.tld);

      setTldPrices(normalized.length ? normalized : defaultTldRows);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "Failed to load Domain Pricing";
      if (String(msg).toLowerCase().includes("unauthorized")) {
        navigate("/super-admin/login", { replace: true });
        return;
      }
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setPricingLoading(false);
    }
  };

  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const { data: row } = await (supabase as any)
        .from("website_settings")
        .select("value")
        .eq("key", SETTINGS_SUBSCRIPTION_PLANS_KEY)
        .maybeSingle();

      const v = row?.value;
      const parsed = Array.isArray(v)
        ? (v as any[])
            .map((r) => ({
              years: asNumber(r?.years),
              label: String(r?.label ?? "").trim(),
              price_usd: asNumber(r?.price_usd, 0),
              is_active: typeof r?.is_active === "boolean" ? r.is_active : true,
              sort_order: asNumber(r?.sort_order),
            }))
            .filter((r) => r.years > 0)
        : [];

      setPlans(
        parsed.length
          ? parsed.map((p) => ({
              ...p,
              label: p.label || `${p.years} Year${p.years > 1 ? "s" : ""}`,
              sort_order: p.sort_order || p.years,
            }))
          : [
              { years: 1, label: "1 Year", price_usd: 0, is_active: true, sort_order: 1 },
              { years: 2, label: "2 Years", price_usd: 0, is_active: true, sort_order: 2 },
              { years: 3, label: "3 Years", price_usd: 0, is_active: true, sort_order: 3 },
            ],
      );
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "Failed to load Subscription Plans";
      if (String(msg).toLowerCase().includes("unauthorized")) {
        navigate("/super-admin/login", { replace: true });
        return;
      }
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchAddOns = async () => {
    setAddOnsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("subscription_add_ons")
        .select("id,label,description,price_idr,is_active,sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;

      const rows = Array.isArray(data)
        ? (data as any[]).map((r) => ({
            id: String(r.id),
            label: String(r.label ?? ""),
            description: String(r.description ?? ""),
            price_idr: safeNumber(r.price_idr),
            is_active: r.is_active !== false,
            sort_order: asNumber(r.sort_order, 0),
          }))
        : [];

      setAddOns(rows);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "Failed to load Subscription Add-ons";
      if (String(msg).toLowerCase().includes("unauthorized")) {
        navigate("/super-admin/login", { replace: true });
        return;
      }
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setAddOnsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomainPricing();
    fetchPlans();
    fetchAddOns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDurationYears = useMemo(() => {
    return plans
      .slice()
      .filter((p) => p.is_active !== false && asNumber(p.years) > 0)
      .sort((a, b) => asNumber(a.sort_order) - asNumber(b.sort_order) || asNumber(a.years) - asNumber(b.years))
      .map((p) => asNumber(p.years));
  }, [plans]);

  useEffect(() => {
    // Ensure selected package draft always has duration rows for current plans.
    if (!activeDurationYears.length) return;

    setWebsitePlansPricingDraft((current) => {
      const next: Record<WebsitePlanKey, WebsitePlanPricingDraft> = { ...current };
      (Object.keys(next) as WebsitePlanKey[]).forEach((k) => {
        const plan = next[k];
        const durations = { ...plan.durations };
        for (const years of activeDurationYears) {
          if (!durations[years]) {
            durations[years] = { discount_percent: 0, manual_price_per_year: null, is_manual_locked: false };
          }
        }
        next[k] = { ...plan, durations };
      });
      return next;
    });
  }, [activeDurationYears, selectedPackageDraftKey]);

  const computeAnnualBase = (draft: WebsitePlanPricingDraft) => {
    const base = Math.max(0, Math.floor(asNumber(draft.base_price, 0)));
    return draft.base_mode === "monthly" ? base * 12 : base;
  };

  const computeAutoPricePerYear = (draft: WebsitePlanPricingDraft, years: number) => {
    const annualBase = computeAnnualBase(draft);
    const discount = Math.min(100, Math.max(0, asNumber(draft.durations?.[years]?.discount_percent, 0)));
    return Math.round(annualBase * (1 - discount / 100));
  };

  const saveDomainPricing = async () => {
    setPricingSaving(true);
    try {
      const pkgId = String(pricingPackageId ?? "").trim() || String(packages?.[0]?.id ?? "").trim();
      const isPkgValid = pkgId && packages.some((p) => p.id === pkgId);
      if (!isPkgValid) {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: "Selected package is not valid anymore. Please refresh and select an existing package.",
        });
        return;
      }

      const cleaned = tldPrices
        .map((r) => ({ tld: normalizeTld(r.tld), price_usd: safeNumber(r.price_usd) }))
        .filter((r) => r.tld && Number.isFinite(r.price_usd) && r.price_usd >= 0);

      const dedupedMap = new Map<string, number>();
      for (const row of cleaned) dedupedMap.set(row.tld, row.price_usd);
      const deduped = Array.from(dedupedMap.entries()).map(([tld, price_usd]) => ({ tld, price_usd }));

      const { data, error } = await (supabase as any).functions.invoke("admin-order-domain-pricing", {
        body: {
          action: "set",
          default_package_id: pkgId,
          tld_prices: deduped,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({ title: "Saved", description: "Domain pricing updated." });
      await fetchDomainPricing();
      setIsEditingPricing(false);
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to save", description: e?.message ?? "Unknown error" });
    } finally {
      setPricingSaving(false);
    }
  };

  const savePlans = async () => {
    setPlansSaving(true);
    try {
      const payload = plans
        .map((p) => ({
          years: asNumber(p.years),
          label: String(p.label ?? "").trim() || `${asNumber(p.years)} Year${asNumber(p.years) > 1 ? "s" : ""}`,
          price_usd: asNumber(p.price_usd, 0),
          is_active: p.is_active !== false,
          sort_order: asNumber(p.sort_order, asNumber(p.years)),
        }))
        .filter((p) => p.years > 0);

      const { error } = await (supabase as any)
        .from("website_settings")
        .upsert({ key: SETTINGS_SUBSCRIPTION_PLANS_KEY, value: payload }, { onConflict: "key" });
      if (error) throw error;

      toast({ title: "Saved", description: "Subscription plans updated." });
      setIsEditingPlans(false);
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to save", description: e?.message ?? "Unknown error" });
    } finally {
      setPlansSaving(false);
    }
  };

  const saveAddOns = async () => {
    setAddOnsSaving(true);
    try {
      const normalized = addOns.map((a, idx) => {
        const base = {
          label: String(a.label ?? "").trim(),
          description: String(a.description ?? "").trim() || null,
          price_idr: Math.max(0, Math.floor(safeNumber(a.price_idr))),
          is_active: a.is_active !== false,
          sort_order: idx,
        };

        // Important: for new rows, DO NOT send `id: null/undefined`.
        return a.id ? { id: a.id, ...base } : base;
      });

      // Basic validation
      const invalid = normalized.find((p) => !p.label);
      if (invalid) {
        toast({ variant: "destructive", title: "Save failed", description: "Label wajib diisi untuk semua add-on." });
        return;
      }

      const toUpsert = normalized.filter((r: any) => Boolean(r.id));
      const toInsert = normalized.filter((r: any) => !r.id);

      if (toInsert.length) {
        const { error } = await (supabase as any).from("subscription_add_ons").insert(toInsert);
        if (error) throw error;
      }

      if (toUpsert.length) {
        const { error } = await (supabase as any)
          .from("subscription_add_ons")
          .upsert(toUpsert, { onConflict: "id" });
        if (error) throw error;
      }

      toast({ title: "Saved", description: "Subscription add-ons updated." });
      setIsEditingAddOns(false);
      await fetchAddOns();
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to save", description: e?.message ?? "Unknown error" });
    } finally {
      setAddOnsSaving(false);
    }
  };

  const deleteAddOn = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("subscription_add_ons").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Add-on removed." });
      await fetchAddOns();
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to delete", description: e?.message ?? "Unknown error" });
    }
  };

  const plansCountLabel = useMemo(() => String(plans.length), [plans.length]);
  const addOnsCountLabel = useMemo(() => String(addOns.length), [addOns.length]);

  const selectedPackageName = useMemo(() => {
    const found = packages.find((p) => p.id === pricingPackageId);
    return found?.name || "(No package selected)";
  }, [packages, pricingPackageId]);

  const isMarketingPackage = useMemo(() => {
    const n = selectedPackageName.toLowerCase().trim();
    return n === "full digital marketing" || n === "blog + social media";
  }, [selectedPackageName]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">Duration Packages</h1>

      {/* Menu: mengikuti daftar & nama di All Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span>Package Menu:</span>
            <span className="font-semibold">{selectedPackageName}</span>
          </CardTitle>
          <CardDescription>
            Pilih package (mengikuti nama di halaman All Packages). Domain Pricing akan tersimpan ke package yang dipilih.
            Website Plans & Add-ons tetap global.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:max-w-md">
          <Label className="text-xs">Select Package</Label>
          <Select value={pricingPackageId || ""} onValueChange={setPricingPackageId} disabled={pricingLoading || pricingSaving}>
            <SelectTrigger>
              <SelectValue placeholder={pricingLoading ? "Loading..." : "Select package"} />
            </SelectTrigger>
            <SelectContent>
              {packages.length ? (
                packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__none" disabled>
                  No packages
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isMarketingPackage ? (
        <PackageOnboardingSettingsPanel packageId={pricingPackageId} />
      ) : (
        <>
          {/* Domain Pricing (TLD) - top */}
          <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Domain Pricing (TLD)</CardTitle>
              <CardDescription>Set per-TLD domain prices for /order/choose-domain.</CardDescription>
            </div>
            <Badge variant="outline">Rows: {tldPrices.length}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">{isEditingPricing ? "Edit mode: ON" : "Edit mode: OFF"}</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditingPricing((v) => !v)}
              disabled={pricingSaving}
            >
              {isEditingPricing ? "Cancel" : "Edit"}
            </Button>
          </div>

          {pricingLoading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}

          {!pricingLoading && tldPrices.length ? (
            tldPrices.map((r, idx) => (
              <div key={`${r.tld}-${idx}`} className="grid gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-5">
                <div className="md:col-span-2">
                  <Label className="text-xs">TLD</Label>
                  <Input
                    value={String(r.tld ?? "")}
                    onChange={(e) => setTldPrices((prev) => prev.map((x, i) => (i === idx ? { ...x, tld: e.target.value } : x)))}
                    placeholder="com"
                    disabled={pricingSaving || !isEditingPricing}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Price (IDR)</Label>
                  <Input
                    value={String(r.price_usd)}
                    onChange={(e) =>
                      setTldPrices((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, price_usd: safeNumber(e.target.value) } : x))
                      )
                    }
                    inputMode="decimal"
                    disabled={pricingSaving || !isEditingPricing}
                  />
                </div>
                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setTldPrices((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={pricingSaving || !isEditingPricing || tldPrices.length <= 1}
                    aria-label="Remove tld"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : !pricingLoading ? (
            <div className="text-sm text-muted-foreground">No pricing rows yet.</div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTldPrices((prev) => [...prev, { tld: "", price_usd: 0 }])}
              disabled={pricingSaving || !isEditingPricing}
            >
              <Plus className="h-4 w-4 mr-2" /> Add TLD
            </Button>
            <Button type="button" onClick={saveDomainPricing} disabled={pricingSaving || !isEditingPricing}>
              <Save className="h-4 w-4 mr-2" /> Save Pricing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Website Plans - middle */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Website Plans</CardTitle>
              <CardDescription>
                Draft harga dasar + diskon + harga/tahun per package terpilih: <span className="font-medium">{selectedPackageName}</span>.
              </CardDescription>
            </div>
            <Badge variant="outline">Total: {plansCountLabel}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">Harga dasar & diskon</div>
                <div className="text-xs text-muted-foreground">
                  Diskon bisa beda untuk 1/2/3 tahun (mengikuti daftar di bawah). Jika “Manual” ON, harga/tahun terkunci.
                </div>
              </div>
              <Badge variant="outline" className="text-xs">UI only</Badge>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {(["website_only", "blog_social", "full_digital"] as WebsitePlanKey[]).map((key) => {
                const draft = websitePlansPricingDraft[key];
                const annualBase = computeAnnualBase(draft);

                return (
                  <div key={key} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{draft.label}</div>
                        <div className="text-xs text-muted-foreground">Harga dasar: Rp / {draft.base_mode === "monthly" ? "Bulan" : "Tahun"}</div>
                      </div>
                      <Badge variant="outline" className="shrink-0">Rp {formatIdr(annualBase)} / Tahun</Badge>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <Label className="text-xs">Harga dasar (Rp)</Label>
                      <Input
                        className="w-full"
                        value={String(draft.base_price ?? 0)}
                        onChange={(e) =>
                          setWebsitePlansPricingDraft((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], base_price: asNumber(e.target.value, 0) },
                          }))
                        }
                        inputMode="numeric"
                        disabled={!isEditingPlans}
                      />
                    </div>

                    <div className="mt-4 space-y-2">
                      {activeDurationYears.map((years) => {
                        const d = draft.durations[years];
                        const autoPricePerYear = computeAutoPricePerYear(draft, years);
                        const shownPricePerYear = d.is_manual_locked
                          ? asNumber(d.manual_price_per_year ?? autoPricePerYear, autoPricePerYear)
                          : autoPricePerYear;
                        const totalForDuration = Math.round(shownPricePerYear * years);

                        return (
                          <div key={`${key}-${years}`} className="rounded-md border border-border bg-muted/10 p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="text-sm font-medium text-foreground">{years} Tahun</div>
                              <div className="text-xs text-muted-foreground">Total: Rp {formatIdr(totalForDuration)}</div>
                            </div>

                            <div className="mt-2 grid gap-2 sm:grid-cols-12 sm:items-end">
                              <div className="sm:col-span-4 grid gap-2">
                                <Label className="text-xs">Diskon %</Label>
                                <Input
                                  className="w-full"
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={String(d.discount_percent ?? 0)}
                                  onChange={(e) => {
                                    const v = asNumber(e.target.value, 0);
                                    setWebsitePlansPricingDraft((prev) => ({
                                      ...prev,
                                      [key]: {
                                        ...prev[key],
                                        durations: {
                                          ...prev[key].durations,
                                          [years]: { ...prev[key].durations[years], discount_percent: v },
                                        },
                                      },
                                    }));
                                  }}
                                  inputMode="numeric"
                                  disabled={!isEditingPlans}
                                />
                              </div>

                              <div className="sm:col-span-5 grid gap-2">
                                <Label className="text-xs">Harga / Tahun (Rp)</Label>
                                <Input
                                  className="w-full"
                                  value={String(shownPricePerYear)}
                                  onChange={(e) => {
                                    const v = asNumber(e.target.value, 0);
                                    setWebsitePlansPricingDraft((prev) => ({
                                      ...prev,
                                      [key]: {
                                        ...prev[key],
                                        durations: {
                                          ...prev[key].durations,
                                          [years]: { ...prev[key].durations[years], manual_price_per_year: v },
                                        },
                                      },
                                    }));
                                  }}
                                  inputMode="numeric"
                                  disabled={!isEditingPlans || !d.is_manual_locked}
                                />
                                {!d.is_manual_locked ? (
                                  <div className="text-[11px] text-muted-foreground">Auto: Rp {formatIdr(autoPricePerYear)} / Tahun</div>
                                ) : (
                                  <div className="text-[11px] text-muted-foreground">Manual terkunci.</div>
                                )}
                              </div>

                              <div className="sm:col-span-3 flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                                <div className="text-xs font-medium text-foreground">Manual</div>
                                <Switch
                                  checked={d.is_manual_locked}
                                  onCheckedChange={(v) => {
                                    setWebsitePlansPricingDraft((prev) => {
                                      const current = prev[key];
                                      const currentDur = current.durations[years];
                                      const nextLocked = Boolean(v);
                                      const nextManual = nextLocked
                                        ? asNumber(currentDur.manual_price_per_year ?? computeAutoPricePerYear(current, years), 0)
                                        : null;

                                      return {
                                        ...prev,
                                        [key]: {
                                          ...current,
                                          durations: {
                                            ...current.durations,
                                            [years]: {
                                              ...currentDur,
                                              is_manual_locked: nextLocked,
                                              manual_price_per_year: nextManual,
                                            },
                                          },
                                        },
                                      };
                                    });
                                  }}
                                  disabled={!isEditingPlans}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {!activeDurationYears.length ? (
                        <div className="text-xs text-muted-foreground">Belum ada duration aktif. Aktifkan dulu di daftar bawah.</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">{isEditingPlans ? "Edit mode: ON" : "Edit mode: OFF"}</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditingPlans((v) => !v)}
              disabled={plansSaving}
            >
              {isEditingPlans ? "Cancel" : "Edit"}
            </Button>
          </div>

          {plansLoading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}

          {!plansLoading && plans.length ? (
            plans.map((p, idx) => (
              <div key={`${p.years}-${idx}`} className="grid min-w-0 gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-12">
                <div className="min-w-0 md:col-span-2">
                  <Label className="text-xs">Years</Label>
                  <Input
                    className="w-full"
                    value={String(p.years)}
                    onChange={(e) =>
                      setPlans((prev) => prev.map((x, i) => (i === idx ? { ...x, years: asNumber(e.target.value) } : x)))
                    }
                    inputMode="numeric"
                    disabled={plansSaving || !isEditingPlans}
                  />
                </div>

                <div className="min-w-0 md:col-span-4">
                  <Label className="text-xs">Label</Label>
                  <Input
                    className="w-full"
                    value={p.label}
                    onChange={(e) => setPlans((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                    disabled={plansSaving || !isEditingPlans}
                  />
                </div>

                <div className="min-w-0 md:col-span-3">
                  <Label className="text-xs">Price (IDR)</Label>
                  <Input
                    className="w-full"
                    value={String(p.price_usd ?? 0)}
                    onChange={(e) =>
                      setPlans((prev) => prev.map((x, i) => (i === idx ? { ...x, price_usd: asNumber(e.target.value, 0) } : x)))
                    }
                    inputMode="decimal"
                    disabled={plansSaving || !isEditingPlans}
                  />
                </div>

                <div className="min-w-0 md:col-span-2">
                  <Label className="text-xs">Sort</Label>
                  <Input
                    className="w-full"
                    value={String(p.sort_order)}
                    onChange={(e) =>
                      setPlans((prev) => prev.map((x, i) => (i === idx ? { ...x, sort_order: asNumber(e.target.value) } : x)))
                    }
                    inputMode="numeric"
                    disabled={plansSaving || !isEditingPlans}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-12">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "On" : "Off"}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPlans((prev) => prev.map((x, i) => (i === idx ? { ...x, is_active: !x.is_active } : x)))}
                      disabled={plansSaving || !isEditingPlans}
                    >
                      Toggle
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPlans((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={plansSaving || !isEditingPlans}
                    aria-label="Remove plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : !plansLoading ? (
            <div className="text-sm text-muted-foreground">No plans yet. Click “Add Plan”.</div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setPlans((prev) => [
                  ...prev,
                  {
                    years: 1,
                    label: "1 Year",
                    price_usd: 0,
                    is_active: true,
                    sort_order: prev.length ? Math.max(...prev.map((x) => x.sort_order)) + 1 : 1,
                  },
                ])
              }
              disabled={plansSaving || !isEditingPlans}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Plan
            </Button>

            <Button type="button" onClick={savePlans} disabled={plansSaving || !isEditingPlans}>
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add-ons - bottom */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Add-ons</CardTitle>
              <CardDescription>Checklist add-ons yang tampil di bawah pilihan durasi pada /order/subscription.</CardDescription>
            </div>
            <Badge variant="outline">Total: {addOnsCountLabel}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">{isEditingAddOns ? "Edit mode: ON" : "Edit mode: OFF"}</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditingAddOns((v) => !v)}
              disabled={addOnsSaving}
            >
              {isEditingAddOns ? "Cancel" : "Edit"}
            </Button>
          </div>

          {addOnsLoading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}

          {!addOnsLoading && addOns.length ? (
            <div className="space-y-3">
              {addOns.map((a, idx) => (
                <div key={a.id ?? `new-${idx}`} className="grid gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={a.label}
                      onChange={(e) => setAddOns((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                      disabled={addOnsSaving || !isEditingAddOns}
                      placeholder="e.g. Jasa Editing Website"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={a.description}
                      onChange={(e) => setAddOns((prev) => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))}
                      disabled={addOnsSaving || !isEditingAddOns}
                      placeholder="Optional"
                      rows={2}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-xs">Price (IDR)</Label>
                    <Input
                      value={String(a.price_idr ?? 0)}
                      onChange={(e) =>
                        setAddOns((prev) => prev.map((x, i) => (i === idx ? { ...x, price_idr: safeNumber(e.target.value) } : x)))
                      }
                      inputMode="numeric"
                      disabled={addOnsSaving || !isEditingAddOns}
                    />
                  </div>

                  <div className="md:col-span-1">
                    <Label className="text-xs">Active</Label>
                    <div className="pt-2">
                      <Switch
                        checked={Boolean(a.is_active)}
                        onCheckedChange={(v) => setAddOns((prev) => prev.map((x, i) => (i === idx ? { ...x, is_active: Boolean(v) } : x)))}
                        disabled={addOnsSaving || !isEditingAddOns}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <Label className="text-xs">Sort</Label>
                    <Input
                      value={String(a.sort_order ?? idx)}
                      onChange={(e) =>
                        setAddOns((prev) => prev.map((x, i) => (i === idx ? { ...x, sort_order: asNumber(e.target.value, idx) } : x)))
                      }
                      inputMode="numeric"
                      disabled={addOnsSaving || !isEditingAddOns}
                    />
                  </div>

                  <div className="md:col-span-1 flex items-end justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        const id = String(a.id ?? "");
                        setAddOns((prev) => prev.filter((_, i) => i !== idx));
                        if (id) await deleteAddOn(id);
                      }}
                      disabled={addOnsSaving || !isEditingAddOns}
                      aria-label="Remove add-on"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : !addOnsLoading ? (
            <div className="text-sm text-muted-foreground">No add-ons yet. Click “Add Add-on”.</div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setAddOns((prev) => [
                  ...prev,
                  {
                    label: "",
                    description: "",
                    price_idr: 0,
                    is_active: true,
                    sort_order: prev.length,
                  },
                ])
              }
              disabled={addOnsSaving || !isEditingAddOns}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Add-on
            </Button>

            <Button type="button" onClick={saveAddOns} disabled={addOnsSaving || !isEditingAddOns}>
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
