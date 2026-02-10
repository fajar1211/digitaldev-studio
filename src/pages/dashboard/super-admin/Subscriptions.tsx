import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { Plus, Save, Trash2 } from "lucide-react";
import PackageOnboardingSettingsPanel from "@/components/super-admin/PackageOnboardingSettingsPanel";

type PackageOption = {
  id: string;
  name: string;
  type: string;
};

type PlanRow = {
  years: number;
  label: string;
  /** Final price saved/used by the order flow (IDR) */
  price_usd: number;
  /** Base price per 1 year OR base price per 1 month (depends on selected package) */
  base_price_idr: number;
  /** Discount percent applied to gross total when manual override is OFF */
  discount_percent: number;
  /** When true, override_price_idr is used and auto-calc is locked */
  manual_override: boolean;
  /** Manual override for final price (IDR). When null, falls back to price_usd. */
  override_price_idr: number | null;
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

type DomainTldPriceDraft = {
  id?: string;
  tld: string;
  price_usd: number;
};

const SETTINGS_SUBSCRIPTION_PLANS_KEY = "order_subscription_plans";

// Keep ordering consistent with /dashboard/super-admin/all-packages
const PACKAGE_TYPE_ORDER = ["starter", "growth", "pro", "optimize", "scale", "dominate"] as const;

function asNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampPercent(v: unknown): number {
  const n = asNumber(v, 0);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function computePlanAutoPrice(
  p: Pick<PlanRow, "years" | "base_price_idr" | "discount_percent">,
  opts?: { isMonthlyBase?: boolean },
): number {
  // Support fractional years for marketing packages (e.g. 0.5 year = 6 months)
  const years = Math.max(0.5, asNumber(p.years, 1));
  const base = Math.max(0, asNumber(p.base_price_idr, 0));
  const discount = clampPercent(p.discount_percent);

  // For monthly packages: gross = monthlyBase * (12 * years)
  // For yearly packages: gross = yearlyBase * years
  const gross = opts?.isMonthlyBase ? base * 12 * years : base * years;
  const net = gross * (1 - discount / 100);
  return Math.max(0, Math.round(net));
}

function safeNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function SuperAdminSubscriptions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isEditingPlans, setIsEditingPlans] = useState(false);

  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [pricingPackageId, setPricingPackageId] = useState<string>("");

  const [plansLoading, setPlansLoading] = useState(true);
  const [plansSaving, setPlansSaving] = useState(false);
  const [plans, setPlans] = useState<PlanRow[]>([]);

  const baseYearMeta = useMemo(() => {
    const values = plans.map((p) => asNumber(p.base_price_idr, 0));
    const first = values[0] ?? 0;
    const mixed = values.some((v) => v !== first);
    return { value: first, mixed };
  }, [plans]);

  const setBaseYearForAll = (nextBase: number, opts?: { isMonthlyBase?: boolean }) => {
    const base = Math.max(0, asNumber(nextBase, 0));
    setPlans((prev) =>
      prev.map((x) => {
        const next = { ...x, base_price_idr: base };
        if (!next.manual_override) next.price_usd = computePlanAutoPrice(next, opts);
        return next;
      }),
    );
  };

  const [addOnsLoading, setAddOnsLoading] = useState(true);
  const [addOnsSaving, setAddOnsSaving] = useState(false);
  const [isEditingAddOns, setIsEditingAddOns] = useState(false);
  const [addOns, setAddOns] = useState<SubscriptionAddOnRow[]>([]);

  const [domainPricesLoading, setDomainPricesLoading] = useState(false);
  const [domainPricesSaving, setDomainPricesSaving] = useState(false);
  const [isEditingDomainPrices, setIsEditingDomainPrices] = useState(false);
  const [domainTldPrices, setDomainTldPrices] = useState<DomainTldPriceDraft[]>([]);

  const syncPackageIdToUrl = (nextId: string) => {
    const sp = new URLSearchParams(searchParams);
    if (nextId) sp.set("packageId", nextId);
    else sp.delete("packageId");
    setSearchParams(sp, { replace: true });
  };

  const handlePackageChange = (nextId: string) => {
    setPricingPackageId(nextId);
    syncPackageIdToUrl(nextId);
  };

  const fetchPackages = async () => {
    setPackagesLoading(true);
    try {
      const { data: pkgRows, error: pkgErr } = await (supabase as any)
        .from("packages")
        .select("id,name,type,created_at,is_active")
        .order("created_at", { ascending: true });
      if (pkgErr) throw pkgErr;

      const mapped = Array.isArray(pkgRows)
        ? (pkgRows as any[])
            .map((p: any) => ({
              id: String(p.id),
              name: String(p.name ?? ""),
              type: String(p.type ?? ""),
              created_at: p.created_at,
              is_active: p.is_active !== false,
            }))
            .filter((p) => p.is_active)
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
        return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
      });

      const pkgOptions: PackageOption[] = mapped.map((p) => ({ id: p.id, name: p.name, type: p.type }));
      setPackages(pkgOptions);

      const urlPackageId = String(searchParams.get("packageId") ?? "");
      const isUrlValid = urlPackageId && pkgOptions.some((p) => p.id === urlPackageId);

      const nextSelectedId = isUrlValid ? urlPackageId : pkgOptions.length ? pkgOptions[0].id : "";

      setPricingPackageId(nextSelectedId);
      if (nextSelectedId && nextSelectedId !== urlPackageId) syncPackageIdToUrl(nextSelectedId);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "Failed to load packages";
      if (String(msg).toLowerCase().includes("unauthorized")) {
        navigate("/super-admin/login", { replace: true });
        return;
      }
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setPackagesLoading(false);
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
            .map((r) => {
              const years = asNumber(r?.years);
              const label = String(r?.label ?? "").trim();

              const manual_override = typeof r?.manual_override === "boolean" ? r.manual_override : false;
              const base_price_idr = asNumber(r?.base_price_idr, 0);
              const discount_percent = clampPercent(r?.discount_percent);
              const override_price_idr = r?.override_price_idr === null || r?.override_price_idr === undefined ? null : asNumber(r.override_price_idr, 0);

              // Backward compatible: if legacy rows only had price_usd, treat it as manual override.
              const legacyFinal = asNumber(r?.price_usd, 0);
              const hasNewFields = r?.base_price_idr !== undefined || r?.discount_percent !== undefined || r?.override_price_idr !== undefined;

              const nextManual = hasNewFields ? manual_override : true;
              const nextBase = hasNewFields ? base_price_idr : legacyFinal;
              const nextOverride = hasNewFields ? override_price_idr : legacyFinal;
              const nextDiscount = hasNewFields ? discount_percent : 0;

              const autoPrice = computePlanAutoPrice({ years, base_price_idr: nextBase, discount_percent: nextDiscount });
              const finalPrice = nextManual ? (nextOverride ?? legacyFinal) : autoPrice;

              return {
                years,
                label,
                price_usd: asNumber(finalPrice, 0),
                base_price_idr: nextBase,
                discount_percent: nextDiscount,
                manual_override: nextManual,
                override_price_idr: nextManual ? (nextOverride ?? legacyFinal) : nextOverride,
                is_active: typeof r?.is_active === "boolean" ? r.is_active : true,
                sort_order: asNumber(r?.sort_order),
              } satisfies PlanRow;
            })
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
              {
                years: 1,
                label: "1 Year",
                base_price_idr: 0,
                discount_percent: 0,
                manual_override: true,
                override_price_idr: 0,
                price_usd: 0,
                is_active: true,
                sort_order: 1,
              },
              {
                years: 2,
                label: "2 Years",
                base_price_idr: 0,
                discount_percent: 0,
                manual_override: true,
                override_price_idr: 0,
                price_usd: 0,
                is_active: true,
                sort_order: 2,
              },
              {
                years: 3,
                label: "3 Years",
                base_price_idr: 0,
                discount_percent: 0,
                manual_override: true,
                override_price_idr: 0,
                price_usd: 0,
                is_active: true,
                sort_order: 3,
              },
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

  const fetchAddOns = async (packageId: string) => {
    setAddOnsLoading(true);
    try {
      if (!packageId) {
        setAddOns([]);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("subscription_add_ons")
        .select("id,label,description,price_idr,is_active,sort_order")
        .eq("package_id", packageId)
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

  const fetchDomainTldPrices = async (packageId: string) => {
    setDomainPricesLoading(true);
    try {
      if (!packageId) {
        setDomainTldPrices([]);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("domain_tld_prices")
        .select("id,tld,price_usd")
        .eq("package_id", packageId)
        .order("tld", { ascending: true });
      if (error) throw error;

      const rows = Array.isArray(data)
        ? (data as any[])
            .map((r) => ({
              id: String(r.id),
              tld: String(r.tld ?? "").trim(),
              price_usd: asNumber(r.price_usd, 0),
            }))
            .filter((r) => r.tld)
        : [];

      setDomainTldPrices(rows);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "Failed to load domain pricing";
      if (String(msg).toLowerCase().includes("unauthorized")) {
        navigate("/super-admin/login", { replace: true });
        return;
      }
      toast({ variant: "destructive", title: "Error", description: msg });
      setDomainTldPrices([]);
    } finally {
      setDomainPricesLoading(false);
    }
  };

  const saveDomainTldPrices = async () => {
    setDomainPricesSaving(true);
    try {
      const normalized = (domainTldPrices ?? [])
        .map((r) => ({
          id: r.id,
          package_id: pricingPackageId,
          tld: String(r.tld ?? "")
            .trim()
            .toLowerCase()
            .replace(/^\./, ""),
          price_usd: Math.max(0, Math.floor(asNumber(r.price_usd, 0))),
        }))
        .filter((r) => r.tld);

      const invalid = normalized.find((r) => !r.tld);
      if (invalid) {
        toast({ variant: "destructive", title: "Save failed", description: "TLD wajib diisi." });
        return;
      }

      const dupCheck = new Set<string>();
      for (const row of normalized) {
        if (dupCheck.has(row.tld)) {
          toast({ variant: "destructive", title: "Save failed", description: `TLD duplikat: .${row.tld}` });
          return;
        }
        dupCheck.add(row.tld);
      }

      const toUpsert = normalized.filter((r: any) => Boolean(r.id)).map((r: any) => ({ ...r, id: r.id }));
      const toInsert = normalized.filter((r: any) => !r.id).map(({ id, ...rest }: any) => rest);

      if (toInsert.length) {
        const { error } = await (supabase as any).from("domain_tld_prices").insert(toInsert);
        if (error) throw error;
      }

      if (toUpsert.length) {
        const { error } = await (supabase as any).from("domain_tld_prices").upsert(toUpsert, { onConflict: "id" });
        if (error) throw error;
      }

      toast({ title: "Saved", description: "Harga domain berhasil disimpan." });
      setIsEditingDomainPrices(false);
      await fetchDomainTldPrices(pricingPackageId);
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to save", description: e?.message ?? "Unknown error" });
    } finally {
      setDomainPricesSaving(false);
    }
  };

  const deleteDomainTldRow = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("domain_tld_prices").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Harga domain dihapus." });
      await fetchDomainTldPrices(pricingPackageId);
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to delete", description: e?.message ?? "Unknown error" });
    }
  };

  useEffect(() => {
    fetchPackages();
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pricingPackageId) return;

    fetchAddOns(pricingPackageId);

    const selectedName = packages.find((p) => p.id === pricingPackageId)?.name ?? "";
    const shouldShowDomainPricing = isWebsiteOnlyYearlyPackageName(selectedName);
    if (shouldShowDomainPricing) {
      fetchDomainTldPrices(pricingPackageId);
    } else {
      setDomainTldPrices([]);
      setIsEditingDomainPrices(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingPackageId, packages]);

  const normalizePackageName = (name: string) =>
    String(name ?? "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const isMonthlyBasePackageName = (name: string) => {
    const n = normalizePackageName(name);

    // KHUSUS: hanya 2 menu ini yang berbasis /Bulan.
    // Nama di DB bisa mengandung suffix seperti "/Bulan" atau variasi spasi.
    const isFdm = n.includes("full digital marketing");
    const isBlogSocmed = n.includes("blog + social media") || n.includes("blog+social media");

    return isFdm || isBlogSocmed;
  };

  const isWebsiteOnlyYearlyPackageName = (name: string) => {
    const n = normalizePackageName(name);
    // KHUSUS: hanya menu Website Only /Tahun
    return n.includes("website only") && n.includes("tahun");
  };

  const isMonthlyBaseForPlans = () => {
    const name = packages.find((p) => p.id === pricingPackageId)?.name ?? "";
    return isMonthlyBasePackageName(name);
  };

  const savePlans = async () => {
    setPlansSaving(true);
    try {
      const payload = plans
        .map((p) => {
          const years = asNumber(p.years);
          const base_price_idr = Math.max(0, asNumber(p.base_price_idr, 0));
          const discount_percent = clampPercent(p.discount_percent);
          const manual_override = p.manual_override === true;
          const override_price_idr = p.override_price_idr === null ? null : Math.max(0, asNumber(p.override_price_idr, 0));

          const autoPrice = computePlanAutoPrice(
            { years, base_price_idr, discount_percent },
            { isMonthlyBase: isMonthlyBaseForPlans() },
          );
          const finalPrice = manual_override ? asNumber(override_price_idr ?? p.price_usd ?? 0, 0) : autoPrice;

          return {
            years,
            label: String(p.label ?? "").trim() || `${years} Year${years > 1 ? "s" : ""}`,
            // keep key used by the order flow
            price_usd: asNumber(finalPrice, 0),
            // extra fields for admin UX
            base_price_idr,
            discount_percent,
            manual_override,
            override_price_idr: manual_override ? asNumber(override_price_idr ?? p.price_usd ?? 0, 0) : override_price_idr,
            is_active: p.is_active !== false,
            sort_order: asNumber(p.sort_order, years),
          };
        })
        .filter((p) => p.years > 0);

      const { error } = await (supabase as any)
        .from("website_settings")
        .upsert({ key: SETTINGS_SUBSCRIPTION_PLANS_KEY, value: payload }, { onConflict: "key" });
      if (error) throw error;

      toast({ title: "Saved", description: "Subscription plans updated." });
      setIsEditingPlans(false);
      await fetchPlans();
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
          package_id: pricingPackageId,
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
      await fetchAddOns(pricingPackageId);
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
      if (pricingPackageId) await fetchAddOns(pricingPackageId);
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
    return isMonthlyBasePackageName(selectedPackageName);
  }, [selectedPackageName]);

  const isWebsiteOnlyYearly = useMemo(() => {
    return isWebsiteOnlyYearlyPackageName(selectedPackageName);
  }, [selectedPackageName]);

  const planAutoOpts = useMemo(() => ({ isMonthlyBase: isMarketingPackage }), [isMarketingPackage]);

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
            Pilih package (mengikuti nama di halaman All Packages). Add-ons tersimpan per package, sedangkan Duration Plan bersifat global.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-xs">Select Package</Label>

          {packagesLoading ? (
            <div className="text-sm text-muted-foreground">Loading packages...</div>
          ) : packages.length === 0 ? (
            <div className="text-sm text-muted-foreground">No active packages.</div>
          ) : (
            <Tabs value={pricingPackageId || packages[0].id} onValueChange={handlePackageChange}>
              <div className="w-full overflow-x-auto">
                <TabsList className="inline-flex w-max justify-start">
                  {packages.map((p) => (
                    <TabsTrigger key={p.id} value={p.id} disabled={plansSaving || addOnsSaving}>
                      {p.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>
          )}
        </CardContent>
       </Card>

       {/* Harga Domain (hanya untuk Website Only /Tahun) */}
       {isWebsiteOnlyYearly ? (
         <Card>
           <CardHeader>
             <div className="flex items-start justify-between gap-3">
               <div>
                 <CardTitle>Harga Domain</CardTitle>
                 <CardDescription>Harga TLD yang ditampilkan di /order/choose-domain (khusus paket Website Only /Tahun).</CardDescription>
               </div>
               <Badge variant="outline">Total: {String(domainTldPrices.length)}</Badge>
             </div>
           </CardHeader>

           <CardContent className="space-y-3">
             <div className="flex flex-wrap items-center justify-between gap-2">
               <div className="text-xs text-muted-foreground">
                 {isEditingDomainPrices ? "Edit mode: ON" : "Edit mode: OFF"}
               </div>
               <Button
                 type="button"
                 variant="outline"
                 size="sm"
                 onClick={() => setIsEditingDomainPrices((v) => !v)}
                 disabled={domainPricesSaving}
               >
                 {isEditingDomainPrices ? "Cancel" : "Edit"}
               </Button>
             </div>

             {domainPricesLoading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}

             {!domainPricesLoading && domainTldPrices.length ? (
               <div className="space-y-3">
                 {domainTldPrices.map((row, idx) => (
                   <div key={row.id ?? `new-${idx}`} className="grid gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-12">
                     <div className="md:col-span-5">
                       <Label className="text-xs">TLD</Label>
                       <Input
                         value={row.tld}
                         onChange={(e) =>
                           setDomainTldPrices((prev) => prev.map((x, i) => (i === idx ? { ...x, tld: e.target.value } : x)))
                         }
                         disabled={domainPricesSaving || !isEditingDomainPrices}
                         placeholder="com"
                       />
                       <div className="mt-1 text-[11px] text-muted-foreground">Tulis tanpa titik (contoh: com, id, co.id).</div>
                     </div>

                     <div className="md:col-span-5">
                       <Label className="text-xs">Harga (IDR)</Label>
                       <Input
                         value={String(row.price_usd ?? 0)}
                         onChange={(e) =>
                           setDomainTldPrices((prev) =>
                             prev.map((x, i) => (i === idx ? { ...x, price_usd: asNumber(e.target.value, 0) } : x)),
                           )
                         }
                         inputMode="numeric"
                         disabled={domainPricesSaving || !isEditingDomainPrices}
                       />
                     </div>

                     <div className="md:col-span-2 flex items-end justify-end">
                       <Button
                         type="button"
                         variant="outline"
                         size="icon"
                         onClick={async () => {
                           const id = String(row.id ?? "");
                           setDomainTldPrices((prev) => prev.filter((_, i) => i !== idx));
                           if (id) await deleteDomainTldRow(id);
                         }}
                         disabled={domainPricesSaving || !isEditingDomainPrices}
                         aria-label="Remove TLD"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
             ) : !domainPricesLoading ? (
               <div className="text-sm text-muted-foreground">Belum ada harga domain. Klik “Add TLD”.</div>
             ) : null}

             <div className="flex flex-wrap gap-2">
               <Button
                 type="button"
                 variant="outline"
                 onClick={() =>
                   setDomainTldPrices((prev) => [
                     ...prev,
                     {
                       tld: "",
                       price_usd: 0,
                     },
                   ])
                 }
                 disabled={domainPricesSaving || !isEditingDomainPrices}
               >
                 <Plus className="h-4 w-4 mr-2" /> Add TLD
               </Button>

               <Button type="button" onClick={saveDomainTldPrices} disabled={domainPricesSaving || !isEditingDomainPrices}>
                 <Save className="h-4 w-4 mr-2" /> Save
               </Button>
             </div>
           </CardContent>
         </Card>
       ) : null}

       {/* Duration Plan - middle */}
       {!isMarketingPackage ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Duration Plan</CardTitle>
                <CardDescription>Manage “Choose plan duration” options on /order/subscription.</CardDescription>
              </div>
              <Badge variant="outline">Total: {plansCountLabel}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
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

            <div className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <Label className="text-xs">Harga dasar / tahun</Label>
                <Input
                  className="w-full"
                  value={String(baseYearMeta.value ?? 0)}
                  onChange={(e) => setBaseYearForAll(asNumber(e.target.value, 0), planAutoOpts)}
                  inputMode="decimal"
                  disabled={plansSaving || !isEditingPlans}
                />
              </div>
              <div className="sm:col-span-8">
                <div className="text-[11px] text-muted-foreground">
                  Input sekali, otomatis menghitung harga untuk 1/2/3 tahun sesuai diskon masing-masing plan.
                </div>
                {baseYearMeta.mixed ? (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Catatan: sebelumnya ada beberapa nilai “harga dasar” berbeda—nilai ini akan disamakan saat kamu edit.
                  </div>
                ) : null}
              </div>
            </div>

            {plansLoading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}

            {!plansLoading && plans.length ? (
              plans.map((p, idx) => {
                const autoPrice = computePlanAutoPrice(
                  {
                    years: p.years,
                    base_price_idr: p.base_price_idr,
                    discount_percent: p.discount_percent,
                  },
                  planAutoOpts,
                );
                const isManual = p.manual_override === true;

                return (
                  <div key={`${p.years}-${idx}`} className="grid min-w-0 gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-12">
                    <div className="min-w-0 md:col-span-2">
                      <Label className="text-xs">Years</Label>
                      <Input
                        className="w-full"
                        value={String(p.years)}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((x, i) => {
                              if (i !== idx) return x;
                              const years = asNumber(e.target.value);
                              const next = { ...x, years };
                              if (!next.manual_override) next.price_usd = computePlanAutoPrice(next, planAutoOpts);
                              return next;
                            }),
                          )
                        }
                        inputMode="decimal"
                        disabled={plansSaving || !isEditingPlans}
                      />
                    </div>

                    <div className="min-w-0 md:col-span-4">
                      <Label className="text-xs">Label</Label>
                      <Input
                        className="w-full"
                        value={p.label}
                        onChange={(e) =>
                          setPlans((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                        }
                        disabled={plansSaving || !isEditingPlans}
                      />
                    </div>

                    <div className="min-w-0 md:col-span-4">
                      <Label className="text-xs">Pricing</Label>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="min-w-0">
                          <Label className="text-[11px] text-muted-foreground">Diskon %</Label>
                          <Input
                            className="w-full"
                            value={String(p.discount_percent ?? 0)}
                            onChange={(e) =>
                              setPlans((prev) =>
                                prev.map((x, i) => {
                                  if (i !== idx) return x;
                                  const next = { ...x, discount_percent: clampPercent(e.target.value) };
                                  if (!next.manual_override) next.price_usd = computePlanAutoPrice(next, planAutoOpts);
                                  return next;
                                }),
                              )
                            }
                            inputMode="decimal"
                            disabled={plansSaving || !isEditingPlans || isManual}
                          />
                        </div>

                        <div className="min-w-0">
                          <Label className="text-[11px] text-muted-foreground">
                            Harga / {p.years} tahun{isManual ? " (manual)" : " (auto)"}
                          </Label>
                          <Input
                            className="w-full"
                            value={String(isManual ? p.override_price_idr ?? p.price_usd ?? 0 : autoPrice)}
                            onChange={(e) =>
                              setPlans((prev) =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        override_price_idr: asNumber(e.target.value, 0),
                                        price_usd: asNumber(e.target.value, 0),
                                      }
                                    : x,
                                ),
                              )
                            }
                            inputMode="decimal"
                            disabled={plansSaving || !isEditingPlans || !isManual}
                          />
                        </div>
                      </div>

                      <div className="mt-1 text-[11px] text-muted-foreground">{`Dasar: ${baseYearMeta.value ?? 0} × ${p.years} tahun`}</div>

                      <div className="mt-2 flex items-center justify-between rounded-md border bg-background/50 px-3 py-2">
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-foreground">Override: Manual</div>
                          <div className="text-[11px] text-muted-foreground">Saat aktif, auto-calc dikunci.</div>
                        </div>
                        <Switch
                          checked={isManual}
                          onCheckedChange={(v) =>
                            setPlans((prev) =>
                              prev.map((x, i) => {
                                if (i !== idx) return x;
                                if (v) {
                                  const fallback = x.override_price_idr ?? x.price_usd ?? autoPrice;
                                  return { ...x, manual_override: true, override_price_idr: fallback, price_usd: fallback };
                                }
                                const next = { ...x, manual_override: false };
                                next.price_usd = computePlanAutoPrice(next, planAutoOpts);
                                return next;
                              }),
                            )
                          }
                          disabled={plansSaving || !isEditingPlans}
                        />
                      </div>
                    </div>

                    <div className="min-w-0 md:col-span-2">
                      <Label className="text-xs">Sort</Label>
                      <Input
                        className="w-full"
                        value={String(p.sort_order)}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, sort_order: asNumber(e.target.value) } : x)),
                          )
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
                );
              })
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
                      base_price_idr: baseYearMeta.value ?? 0,
                      discount_percent: 0,
                      manual_override: true,
                      override_price_idr: 0,
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
      ) : null}

      {/* Add-ons (per package) */}
      {!isMarketingPackage ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Add-ons</CardTitle>
                <CardDescription>
                  Checklist add-ons yang tampil di bawah pilihan durasi pada /order/subscription (tersimpan per package).
                </CardDescription>
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
                        onChange={(e) =>
                          setAddOns((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                        }
                        disabled={addOnsSaving || !isEditingAddOns}
                        placeholder="e.g. Jasa Editing Website"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={a.description}
                        onChange={(e) =>
                          setAddOns((prev) => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))
                        }
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
                          onCheckedChange={(v) =>
                            setAddOns((prev) => prev.map((x, i) => (i === idx ? { ...x, is_active: Boolean(v) } : x)))
                          }
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
      ) : null}

      {isMarketingPackage ? <PackageOnboardingSettingsPanel packageId={pricingPackageId} /> : null}
    </div>
  );
}
