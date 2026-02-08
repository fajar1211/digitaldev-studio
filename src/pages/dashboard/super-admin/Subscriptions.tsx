import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Plus, Save, Trash2 } from "lucide-react";

type PackageOption = {
  id: string;
  name: string;
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

const SETTINGS_SUBSCRIPTION_PLANS_KEY = "order_subscription_plans";

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

  const [addOnsLoading, setAddOnsLoading] = useState(true);
  const [addOnsSaving, setAddOnsSaving] = useState(false);
  const [isEditingAddOns, setIsEditingAddOns] = useState(false);
  const [addOns, setAddOns] = useState<SubscriptionAddOnRow[]>([]);

  const fetchDomainPricing = async () => {
    setPricingLoading(true);
    try {
      const [{ data: pkgRows, error: pkgErr }, pricingRes] = await Promise.all([
        (supabase as any).from("packages").select("id,name").order("name"),
        (supabase as any).functions.invoke("admin-order-domain-pricing", { body: { action: "get" } }),
      ]);
      if (pkgErr) throw pkgErr;

      const pkgOptions = Array.isArray(pkgRows) ? (pkgRows as any).map((p: any) => ({ id: p.id, name: p.name })) : [];
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
      const payload = addOns.map((a, idx) => ({
        id: a.id,
        label: String(a.label ?? "").trim(),
        description: String(a.description ?? "").trim() || null,
        price_idr: Math.max(0, Math.floor(safeNumber(a.price_idr))),
        is_active: a.is_active !== false,
        sort_order: idx,
      }));

      // Basic validation
      const invalid = payload.find((p) => !p.label);
      if (invalid) {
        toast({ variant: "destructive", title: "Save failed", description: "Label wajib diisi untuk semua add-on." });
        return;
      }

      const { error } = await (supabase as any).from("subscription_add_ons").upsert(payload, { onConflict: "id" });
      if (error) throw error;

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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">Subscriptions</h1>

      <Tabs defaultValue="subscription" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="domain">Domain</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Subscription Plans (Website)</CardTitle>
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

                {plansLoading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}

                {!plansLoading && plans.length ? (
                  plans.map((p, idx) => (
                    <div key={`${p.years}-${idx}`} className="grid gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-6">
                      <div>
                        <Label className="text-xs">Years</Label>
                        <Input
                          value={String(p.years)}
                          onChange={(e) =>
                            setPlans((prev) => prev.map((x, i) => (i === idx ? { ...x, years: asNumber(e.target.value) } : x)))
                          }
                          inputMode="numeric"
                          disabled={plansSaving || !isEditingPlans}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={p.label}
                          onChange={(e) => setPlans((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                          disabled={plansSaving || !isEditingPlans}
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Price (IDR)</Label>
                        <Input
                          value={String(p.price_usd ?? 0)}
                          onChange={(e) =>
                            setPlans((prev) => prev.map((x, i) => (i === idx ? { ...x, price_usd: asNumber(e.target.value, 0) } : x)))
                          }
                          inputMode="decimal"
                          disabled={plansSaving || !isEditingPlans}
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Sort</Label>
                        <Input
                          value={String(p.sort_order)}
                          onChange={(e) =>
                            setPlans((prev) => prev.map((x, i) => (i === idx ? { ...x, sort_order: asNumber(e.target.value) } : x)))
                          }
                          inputMode="numeric"
                          disabled={plansSaving || !isEditingPlans}
                        />
                      </div>

                      <div className="flex items-end justify-between gap-2">
                        <div className="flex items-center gap-2">
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

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Subscription Add-ons</CardTitle>
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
                            placeholder='e.g. Jasa Editing Website'
                          />
                        </div>

                        <div className="md:col-span-4">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={a.description}
                            onChange={(e) => setAddOns((prev) => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))}
                            disabled={addOnsSaving || !isEditingAddOns}
                            placeholder='Optional'
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
          </div>
        </TabsContent>

        <TabsContent value="domain">
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
                <div className="text-xs text-muted-foreground">
                  {isEditingPricing ? "Edit mode: ON" : "Edit mode: OFF"}
                </div>
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
                          setTldPrices((prev) => prev.map((x, i) => (i === idx ? { ...x, price_usd: safeNumber(e.target.value) } : x)))
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
