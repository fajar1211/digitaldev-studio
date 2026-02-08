import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Edit, Plus, RefreshCcw, Trash2 } from "lucide-react";

type PackageRow = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  price: number | null;
  features: string[];
  is_active: boolean;
  show_on_public?: boolean;
  is_recommended?: boolean;
  created_at?: string;
};

type PackageDraft = {
  name: string;
  type: string;
  description: string;
  price: string;
  featuresText: string;
  is_active: boolean;
  show_on_public: boolean;
  is_recommended: boolean;
};

const PACKAGE_TYPE_OPTIONS = ["starter", "growth", "pro", "optimize", "scale", "dominate"] as const;

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

export default function SuperAdminPackages() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<PackageDraft>({
    name: "",
    type: "starter",
    description: "",
    price: "0",
    featuresText: "",
    is_active: true,
    show_on_public: true,
    is_recommended: false,
  });

  const title = "Marketing Packages";

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("packages")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const mapped = ((data as any[]) || []).map((p) => ({
          id: String(p.id),
          name: String(p.name ?? ""),
          type: String(p.type ?? ""),
          description: (p.description ?? null) as string | null,
          price: (p.price ?? null) as number | null,
          features: normalizeFeatures(p.features),
          is_active: Boolean(p.is_active),
          show_on_public: Boolean(p.show_on_public ?? true),
          is_recommended: Boolean(p.is_recommended ?? false),
          created_at: p.created_at,
        }));

      const ORDER = ["starter", "growth", "pro", "optimize", "scale", "dominate"];
      const rank = (pkgType: string) => {
        const i = ORDER.indexOf(String(pkgType ?? "").toLowerCase().trim());
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
        return 0;
      });

      setPackages(mapped);
    } catch (err) {
      console.error("Error fetching packages:", err);
      toast.error("Gagal memuat packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const resetDraft = () =>
    setDraft({
      name: "",
      type: "starter",
      description: "",
      price: "0",
      featuresText: "",
      is_active: true,
      show_on_public: true,
      is_recommended: false,
    });

  const createPackage = async () => {
    if (!draft.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!draft.type.trim()) {
      toast.error("Type is required");
      return;
    }

    setCreating(true);
    try {
      const features = draft.featuresText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: draft.name.trim(),
        type: draft.type.trim().toLowerCase(),
        description: draft.description.trim() || null,
        price: draft.price === "" ? null : Number(draft.price),
        features,
        is_active: draft.is_active,
        show_on_public: draft.show_on_public,
        is_recommended: draft.is_recommended,
      };

      const { data, error } = await (supabase as any).from("packages").insert(payload).select("id").single();
      if (error) throw error;

      toast.success("Package created");
      setCreateOpen(false);
      resetDraft();
      await fetchPackages();

      if (data?.id) navigate(`/dashboard/super-admin/marketing-packages/${String(data.id)}`);
    } catch (err: any) {
      console.error("Error creating package:", err);
      toast.error(err?.message || "Failed to create package");
    } finally {
      setCreating(false);
    }
  };

  const deletePackage = async (pkgId: string) => {
    try {
      // Ensure add-ons are removed first to avoid FK issues
      const { error: delAddOnsErr } = await (supabase as any)
        .from("package_add_ons")
        .delete()
        .eq("package_id", pkgId);
      if (delAddOnsErr) throw delAddOnsErr;

      const { error } = await (supabase as any).from("packages").delete().eq("id", pkgId);
      if (error) throw error;

      toast.success("Package deleted");
      await fetchPackages();
    } catch (err: any) {
      console.error("Error deleting package:", err);
      toast.error(err?.message || "Failed to delete package");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">Changes here will affect packages shown on the onboarding pages.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={fetchPackages} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button onClick={() => setCreateOpen(true)} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Package
          </Button>
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) resetDraft();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New Package</DialogTitle>
            <DialogDescription>Create a new package and optionally mark it visible on the public /packages page.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft((p) => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGE_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
-              <Label>Price</Label>
+              <Label>Price (IDR)</Label>
               <Input
                 type="number"
                 value={draft.price}
                 onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))}
               />
             </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label>Features (one per line)</Label>
              <Textarea
                value={draft.featuresText}
                onChange={(e) => setDraft((p) => ({ ...p, featuresText: e.target.value }))}
                rows={6}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="text-sm font-medium text-foreground">Active</div>
                <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft((p) => ({ ...p, is_active: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="text-sm font-medium text-foreground">Visible</div>
                <Switch
                  checked={draft.show_on_public}
                  onCheckedChange={(v) => setDraft((p) => ({ ...p, show_on_public: v }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="text-sm font-medium text-foreground">Recommended</div>
                <Switch
                  checked={draft.is_recommended}
                  onCheckedChange={(v) => setDraft((p) => ({ ...p, is_recommended: v }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="button" onClick={createPackage} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading packages...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell className="capitalize">{pkg.type}</TableCell>
                    <TableCell>Rp {pkg.price != null ? pkg.price.toLocaleString("id-ID", { minimumFractionDigits: 0 }) : "0"}</TableCell>
                    <TableCell>
                      <Badge variant={pkg.is_active ? "default" : "secondary"}>
                        {pkg.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/dashboard/super-admin/marketing-packages/${pkg.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete package?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. The package (and its add-ons) will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => void deletePackage(pkg.id)}
                              >
                                Yes
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
