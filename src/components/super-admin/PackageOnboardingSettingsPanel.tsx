import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PackageAddOnsEditor, { type PackageAddOnDraft } from "@/components/super-admin/PackageAddOnsEditor";

import { DEFAULT_DURATION_PRESETS, formatDurationLabel, type PackageDurationRow, computeDiscountedTotal } from "@/lib/packageDurations";

type DurationDraft = {
  id?: string;
  duration_months: number;
  discount_percent: number;
  is_active: boolean;
  sort_order: number;
};

type PackageRow = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  price: number | null;
  features: string[];
  is_active: boolean;
};

function normalizeFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v) => typeof v === "string") as string[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed.filter((v) => typeof v === "string") as string[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function PackageOnboardingSettingsPanel({ packageId }: { packageId: string }) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pkg, setPkg] = useState<PackageRow | null>(null);

  const [addOns, setAddOns] = useState<PackageAddOnDraft[]>([]);
  const [removedAddOnIds, setRemovedAddOnIds] = useState<string[]>([]);

  const [durations, setDurations] = useState<DurationDraft[]>([]);
  const [removedDurationIds, setRemovedDurationIds] = useState<string[]>([]);

  useEffect(() => {
    if (!packageId) return;

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any).from("packages").select("*").eq("id", packageId).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Package tidak ditemukan");

        setPkg({
          id: String(data.id),
          name: String(data.name ?? ""),
          type: String(data.type ?? ""),
          description: (data.description ?? null) as string | null,
          price: (data.price ?? null) as number | null,
          features: normalizeFeatures(data.features),
          is_active: Boolean(data.is_active),
        });

        const [{ data: durationRows, error: durationErr }, { data: addOnRows, error: addOnErr }] = await Promise.all([
          (supabase as any)
            .from("package_durations")
            .select("id,package_id,duration_months,discount_percent,is_active,sort_order")
            .eq("package_id", packageId)
            .order("sort_order", { ascending: true })
            .order("duration_months", { ascending: true }),
          (supabase as any)
            .from("package_add_ons")
            .select("id,add_on_key,label,price_per_unit,unit_step,unit,is_active,sort_order,max_quantity")
            .eq("package_id", packageId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
        ]);

        if (durationErr) throw durationErr;
        if (addOnErr) throw addOnErr;

        setDurations(
          ((durationRows as PackageDurationRow[]) || []).map((r: any) => ({
            id: String(r.id),
            duration_months: Number(r.duration_months ?? 1),
            discount_percent: Number(r.discount_percent ?? 0),
            is_active: Boolean(r.is_active ?? true),
            sort_order: Number(r.sort_order ?? 0),
          }))
        );
        setRemovedDurationIds([]);

        setAddOns(
          ((addOnRows as any[]) || []).map((r) => ({
            id: String(r.id),
            add_on_key: String(r.add_on_key ?? ""),
            label: String(r.label ?? ""),
            price_per_unit: Number(r.price_per_unit ?? 0),
            unit_step: Number(r.unit_step ?? 1),
            unit: String(r.unit ?? "unit"),
            is_active: Boolean(r.is_active ?? true),
            sort_order: Number(r.sort_order ?? 0),
            max_quantity: r.max_quantity === null || r.max_quantity === undefined ? null : Number(r.max_quantity),
          }))
        );
        setRemovedAddOnIds([]);
      } catch (e: any) {
        console.error(e);
        toast({ variant: "destructive", title: "Error", description: e?.message ?? "Gagal memuat setting package" });
      } finally {
        setLoading(false);
      }
    })();
  }, [packageId, toast]);

  const canSave = useMemo(() => Boolean(pkg?.id), [pkg?.id]);

  const formatIdr = (value: number) => {
    return `Rp ${Math.round(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
  };

  const discountByMonths = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of durations || []) {
      if (!r.is_active) continue;
      const months = Number(r.duration_months ?? 0);
      const discount = Number(r.discount_percent ?? 0);
      if (Number.isFinite(months) && months > 0) m.set(months, discount);
    }
    return m;
  }, [durations]);

  const handleSave = async () => {
    if (!pkg) return;
    if (!canSave) return;

    setSaving(true);
    try {
      const { data, error } = await invokeWithAuth<{ ok: boolean; error?: string }>("super-admin-save-marketing-package", {
        package: {
          id: pkg.id,
          name: pkg.name.trim(),
          description: pkg.description?.trim() || null,
          price: pkg.price,
          features: pkg.features,
          is_active: pkg.is_active,
        },
        add_ons: addOns,
        removed_add_on_ids: removedAddOnIds,
        durations,
        removed_duration_ids: removedDurationIds,
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error(String((data as any).error));

      toast({ title: "Saved", description: "Add-ons & durations updated." });
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to save", description: e?.message ?? "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{loading ? "Loading..." : pkg?.name || "Package"}</CardTitle>
          <CardDescription>Konfigurasi Add-ons (Onboarding) dan Duration & Discount untuk package ini.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading || !pkg ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-12">
                <div className="sm:col-span-5 grid gap-2">
                  <Label>Harga Normal / Bulan</Label>
                  <Input
                    inputMode="numeric"
                    value={String(pkg.price ?? 0)}
                    onChange={(e) => {
                      const v = e.target.value === "" ? 0 : Number(e.target.value);
                      setPkg((prev) => (prev ? { ...prev, price: Number.isFinite(v) ? v : 0 } : prev));
                    }}
                    disabled={saving}
                  />
                </div>
                <div className="sm:col-span-7">
                  <div className="text-xs text-muted-foreground">Otomatis dihitung di /order/subscribe: bulan × (12 × tahun) lalu diskon % (jika ada).</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {[1, 2, 3].map((years) => {
                      const months = years * 12;
                      const discountPercent = discountByMonths.get(months) ?? 0;
                      const total = computeDiscountedTotal({ monthlyPrice: Number(pkg.price ?? 0), months, discountPercent });
                      return (
                        <div key={years} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                          <div className="text-xs text-muted-foreground">{years} tahun</div>
                          <div className="text-sm font-semibold text-foreground">{formatIdr(total)}</div>
                          <div className="text-[11px] text-muted-foreground">Diskon: {discountPercent}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {(() => {
                      const n = String(pkg?.name ?? "")
                        .toLowerCase()
                        .replace(/\s+/g, " ")
                        .trim();
                      const isMarketingMonthly =
                        n.includes("full digital marketing") || n.includes("blog + social media") || n.includes("blog+social media");

                      return (
                        <h3
                          className={
                            isMarketingMonthly
                              ? "text-2xl font-semibold leading-none tracking-tight"
                              : "text-base font-semibold text-foreground"
                          }
                        >
                          Duration & Discount
                        </h3>
                      );
                    })()}
                    <p className="text-xs text-muted-foreground">Opsi durasi untuk onboarding (diskon dari total harga normal per bulan).</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        const existing = new Set(durations.map((d) => Number(d.duration_months)));
                        const missing = DEFAULT_DURATION_PRESETS.filter((p) => !existing.has(p.months));
                        if (missing.length === 0) {
                          toast({ title: "Info", description: "Preset durations sudah ada semua" });
                          return;
                        }
                        setDurations((prev) => [
                          ...prev,
                          ...missing.map((m) => ({
                            duration_months: m.months,
                            discount_percent: m.discountPercent,
                            is_active: true,
                            sort_order: m.sortOrder,
                          })),
                        ]);
                      }}
                    >
                      Add Preset (6/12/24/36)
                    </Button>

                    {(() => {
                      const n = String(pkg?.name ?? "")
                        .toLowerCase()
                        .replace(/\s+/g, " ")
                        .trim();
                      const isMarketingMonthly = n.includes("full digital marketing") || n.includes("blog + social media") || n.includes("blog+social media");
                      if (!isMarketingMonthly) return null;

                      return (
                        <Button
                          type="button"
                          disabled={!canSave || saving}
                          onClick={handleSave}
                          aria-label="Simpan Duration & Discount"
                          title="Simpan Duration & Discount"
                        >
                          {saving ? "Saving..." : "Simpan Duration"}
                        </Button>
                      );
                    })()}
                  </div>
                </div>

                {durations.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Belum ada duration. Klik “Add Preset”.</div>
                ) : (
                  <div className="space-y-3">
                    {durations
                      .slice()
                      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.duration_months - b.duration_months)
                      .map((d, idx) => (
                        <div key={d.id ?? `${d.duration_months}-${idx}`} className="grid gap-3 sm:grid-cols-12 items-end">
                          <div className="sm:col-span-3 grid gap-2">
                            <Label>Duration</Label>
                            <Input value={formatDurationLabel(d.duration_months)} disabled />
                          </div>

                          <div className="sm:col-span-3 grid gap-2">
                            <Label>Discount %</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={d.discount_percent}
                              onChange={(e) => {
                                const v = e.target.value === "" ? 0 : Number(e.target.value);
                                setDurations((prev) =>
                                  prev.map((x) => (x === d ? { ...x, discount_percent: Number.isFinite(v) ? v : 0 } : x))
                                );
                              }}
                            />
                          </div>

                          <div className="sm:col-span-2 grid gap-2">
                            <Label>Sort</Label>
                            <Input
                              type="number"
                              value={d.sort_order}
                              onChange={(e) => {
                                const v = e.target.value === "" ? 0 : Number(e.target.value);
                                setDurations((prev) => prev.map((x) => (x === d ? { ...x, sort_order: v } : x)));
                              }}
                            />
                          </div>

                          <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border px-3 py-2">
                            <div className="text-sm text-foreground">Active</div>
                            <Switch
                              checked={d.is_active}
                              onCheckedChange={(v) =>
                                setDurations((prev) => prev.map((x) => (x === d ? { ...x, is_active: v } : x)))
                              }
                            />
                          </div>

                          <div className="sm:col-span-2 flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              disabled={saving}
                              onClick={() => {
                                if (d.id) setRemovedDurationIds((prev) => (prev.includes(d.id!) ? prev : [...prev, d.id!]));
                                setDurations((prev) => prev.filter((x) => x !== d));
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <PackageAddOnsEditor
                value={addOns}
                onChange={setAddOns}
                onRemove={(idToRemove) =>
                  setRemovedAddOnIds((prev) => (prev.includes(idToRemove) ? prev : [...prev, idToRemove]))
                }
                disabled={saving}
              />

              <Button onClick={handleSave} disabled={!canSave || saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
