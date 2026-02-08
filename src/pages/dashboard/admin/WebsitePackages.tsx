import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, RefreshCcw, Save, Star, StarOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  type: string;
  is_active: boolean;
  show_on_public: boolean;
  is_recommended?: boolean;
  created_at: string;
};

const PUBLIC_PACKAGE_NAME_ORDER = [
  "starter",
  "growth",
  "pro",
  "optimize",
  "scale",
  "dominate",
  "custom",
] as const;

type PackagesCardsAlign = "left" | "center" | "right";
const LAYOUT_SETTINGS_KEY = "packages_layout";

const ALIGN_OPTIONS: Array<{ value: PackagesCardsAlign; label: string }> = [
  { value: "left", label: "Kiri" },
  { value: "center", label: "Tengah" },
  { value: "right", label: "Kanan" },
];

function sanitizeAlign(value: unknown): PackagesCardsAlign {
  return value === "left" || value === "right" || value === "center" ? value : "center";
}

function sortPackagesForPublic(p1: PackageRow, p2: PackageRow) {
  const a = (p1.name ?? "").trim().toLowerCase();
  const b = (p2.name ?? "").trim().toLowerCase();
  const ai = PUBLIC_PACKAGE_NAME_ORDER.indexOf(a as any);
  const bi = PUBLIC_PACKAGE_NAME_ORDER.indexOf(b as any);

  const aRank = ai === -1 ? Number.POSITIVE_INFINITY : ai;
  const bRank = bi === -1 ? Number.POSITIVE_INFINITY : bi;
  if (aRank !== bRank) return aRank - bRank;
  return a.localeCompare(b);
}

export default function WebsitePackages() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [cardsAlign, setCardsAlign] = useState<PackagesCardsAlign>("center");
  const [baselineCardsAlign, setBaselineCardsAlign] = useState<PackagesCardsAlign>("center");
  const [packageOrder, setPackageOrder] = useState<string[] | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("packages")
        .select("id,name,description,price,type,is_active,show_on_public,is_recommended,created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      let next = ((data ?? []) as PackageRow[]).slice().sort(sortPackagesForPublic);

      if (packageOrder && packageOrder.length) {
        const rank = new Map<string, number>();
        packageOrder.forEach((id, idx) => rank.set(String(id), idx));
        next = next.slice().sort((a, b) => {
          const ra = rank.has(a.id) ? (rank.get(a.id) as number) : Number.POSITIVE_INFINITY;
          const rb = rank.has(b.id) ? (rank.get(b.id) as number) : Number.POSITIVE_INFINITY;
          if (ra !== rb) return ra - rb;
          return sortPackagesForPublic(a, b);
        });
      }

      setPackages(next);
    } catch (err) {
      console.error("Error fetching packages:", err);
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const fetchLayoutSettings = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("website_settings")
        .select("value")
        .eq("key", LAYOUT_SETTINGS_KEY)
        .maybeSingle();

      if (error) throw error;

      const raw = data?.value as any;
      const nextAlign = sanitizeAlign(raw?.cardsAlign);
      const nextOrder = Array.isArray(raw?.packageOrder) ? (raw.packageOrder as string[]) : null;

      setCardsAlign(nextAlign);
      setBaselineCardsAlign(nextAlign);
      setPackageOrder(nextOrder);

      if (nextOrder && nextOrder.length) {
        const rank = new Map<string, number>();
        nextOrder.forEach((id, idx) => rank.set(String(id), idx));
        setPackages((prev) =>
          prev.slice().sort((a, b) => {
            const ra = rank.has(a.id) ? (rank.get(a.id) as number) : Number.POSITIVE_INFINITY;
            const rb = rank.has(b.id) ? (rank.get(b.id) as number) : Number.POSITIVE_INFINITY;
            if (ra !== rb) return ra - rb;
            return sortPackagesForPublic(a, b);
          })
        );
      }
    } catch (err) {
      // Jika belum ada settings, default ke center.
      setCardsAlign("center");
      setBaselineCardsAlign("center");
      setPackageOrder(null);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchLayoutSettings();
      await fetchPackages();
    })();
  }, []);

  const toggleShowOnPublic = (id: string) => {
    setPackages((prev) =>
      prev.map((pkg) => (pkg.id === id ? { ...pkg, show_on_public: !pkg.show_on_public } : pkg))
    );
  };

  const toggleRecommended = (id: string) => {
    setPackages((prev) =>
      prev.map((pkg) => (pkg.id === id ? { ...pkg, is_recommended: !pkg.is_recommended } : pkg))
    );
  };

  const movePackage = (id: string, dir: "up" | "down") => {
    // Biar tombol urutan selalu aktif: saat diklik, otomatis masuk mode edit.
    setIsEditing(true);

    setPackages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const nextIdx = dir === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = prev.slice();
      const [item] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  };

  const cancelEdit = async () => {
    setIsEditing(false);
    setCardsAlign(baselineCardsAlign);
    await Promise.all([fetchPackages(), fetchLayoutSettings()]);
  };

  const finishEdit = async () => {
    setSaving(true);
    try {
      const updates = packages.map((pkg) => ({
        id: pkg.id,
        show_on_public: pkg.show_on_public,
        is_recommended: !!pkg.is_recommended,
      }));

      const results = await Promise.all(
        updates.map((upd) =>
          supabase
            .from("packages")
            .update({ show_on_public: upd.show_on_public, is_recommended: upd.is_recommended })
            .eq("id", upd.id)
        )
      );

      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;

      const { error: layoutErr } = await (supabase as any)
        .from("website_settings")
        .upsert(
          { key: LAYOUT_SETTINGS_KEY, value: { cardsAlign, packageOrder: packages.map((p) => p.id) } },
          { onConflict: "key" }
        );
      if (layoutErr) throw layoutErr;

      toast.success("Public packages updated successfully");
      setLastSavedAt(new Date());
      setBaselineCardsAlign(cardsAlign);
      await Promise.all([fetchPackages(), fetchLayoutSettings()]);
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving packages:", err);
      toast.error("Failed to update packages");
    } finally {
      setSaving(false);
    }
  };

  const canSave = isEditing && !saving;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Public Packages</h1>
            <p className="text-sm text-muted-foreground">
              Control which packages appear on the public /packages page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {saving ? (
              <span className="flex items-center gap-2 text-primary">
                <RefreshCcw className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            ) : lastSavedAt ? (
              <>Saved at {lastSavedAt.toLocaleTimeString()}</>
            ) : (
              "Click Done to save changes."
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Website</Badge>
          <Badge variant="outline">Packages</Badge>

          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button size="sm" onClick={finishEdit} disabled={!canSave}>
                <Save className="h-4 w-4 mr-2" /> Done
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setIsEditing(true)} disabled={loading}>
              Edit
            </Button>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Tampilan /packages</CardTitle>
          <CardDescription>Atur posisi kartu paket di halaman publik.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <div className="grid gap-2">
            <Label>Posisi paket</Label>
            <Select value={cardsAlign} onValueChange={(v) => setCardsAlign(v as PackagesCardsAlign)} disabled={!canSave}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih posisi" />
              </SelectTrigger>
              <SelectContent>
                {ALIGN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Kiri = rata kiri, Tengah = default, Kanan = rata kanan.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Packages</CardTitle>
              <CardDescription>
                Toggle "Show on Public" to control which packages appear at /packages. Only active packages with "Show on Public" enabled will be visible to visitors.
              </CardDescription>
            </div>

            <Button variant="outline" size="sm" onClick={fetchPackages} disabled={loading}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading packages...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Urutan</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Recommended</TableHead>
                  <TableHead className="text-right">Show on Public</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No packages found.
                    </TableCell>
                  </TableRow>
                ) : (
                  packages.map((pkg, index) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => movePackage(pkg.id, "up")}
                            disabled={loading || saving || index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => movePackage(pkg.id, "down")}
                            disabled={loading || saving || index === packages.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell className="capitalize">{pkg.type}</TableCell>
                      <TableCell>{pkg.price != null ? `$${Number(pkg.price).toFixed(2)}` : "—"}</TableCell>
                      <TableCell>
                        {pkg.is_active ? (
                          <Badge variant="default" className="gap-1">
                            <Check className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRecommended(pkg.id)}
                          disabled={!isEditing}
                          className={pkg.is_recommended ? "text-primary" : "text-muted-foreground"}
                        >
                          {pkg.is_recommended ? (
                            <>
                              <Star className="h-4 w-4 mr-2" />
                              Yes
                            </>
                          ) : (
                            <>
                              <StarOff className="h-4 w-4 mr-2" />
                              No
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleShowOnPublic(pkg.id)}
                          disabled={!isEditing}
                          className={pkg.show_on_public ? "text-primary" : "text-muted-foreground"}
                        >
                          {pkg.show_on_public ? (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Visible
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Hidden
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}