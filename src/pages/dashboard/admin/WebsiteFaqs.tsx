import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { FaqAnswer } from "@/components/faq/FaqAnswer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";

type FaqRow = {
  id: string;
  page: string;
  question: string;
  answer: string;
  sort_order: number | null;
  is_published: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const TARGET_PAGE = "packages" as const;

type FormState = {
  id?: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
};

function emptyForm(): FormState {
  return {
    question: "",
    answer: "",
    sort_order: 0,
    is_published: true,
  };
}

export default function WebsiteFaqs() {
  const [items, setItems] = useState<FaqRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("website_faqs")
        .select("id,page,question,answer,sort_order,is_published,created_at,updated_at")
        .eq("page", TARGET_PAGE)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setItems((data ?? []) as FaqRow[]);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Failed to load Common Questions",
        description: e?.message || "Something went wrong.",
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (row: FaqRow) => {
    setForm({
      id: row.id,
      question: row.question ?? "",
      answer: row.answer ?? "",
      sort_order: row.sort_order ?? 0,
      is_published: row.is_published ?? true,
    });
    setOpen(true);
  };

  const canSubmit = useMemo(() => {
    return !!form.question.trim() && !!form.answer.trim() && !saving;
  }, [form.answer, form.question, saving]);

  const handleSave = async () => {
    if (!canSubmit) return;

    setSaving(true);
    try {
      if (form.id) {
        const { error } = await supabase
          .from("website_faqs")
          .update({
            page: TARGET_PAGE,
            question: form.question.trim(),
            answer: form.answer.trim(),
            sort_order: Number.isFinite(form.sort_order) ? form.sort_order : 0,
            is_published: !!form.is_published,
          })
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("website_faqs").insert({
          page: TARGET_PAGE,
          question: form.question.trim(),
          answer: form.answer.trim(),
          sort_order: Number.isFinite(form.sort_order) ? form.sort_order : 0,
          is_published: !!form.is_published,
        } as any);
        if (error) throw error;
      }

      setOpen(false);
      await load();
      toast({ title: "Saved", description: "Common Questions (/packages) have been saved." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to save", description: e?.message || "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: FaqRow) => {
    const ok = window.confirm("Delete this question from Common Questions on /packages?");
    if (!ok) return;

    try {
      const { error } = await supabase.from("website_faqs").delete().eq("id", row.id);
      if (error) throw error;
      setItems((prev) => prev.filter((x) => x.id !== row.id));
      toast({ title: "Deleted", description: "FAQ deleted." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e?.message || "Something went wrong." });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Common Questions</h1>
          <p className="text-sm text-muted-foreground">
            Edit the <span className="font-medium text-foreground">Common Questions</span> section on the public /packages page.
          </p>
        </div>

        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Question
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No questions yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Order</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-[110px]">Published</TableHead>
                  <TableHead className="w-[220px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">{row.sort_order ?? 0}</TableCell>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div className="text-foreground">{row.question}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{row.answer}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={row.is_published ? "text-foreground" : "text-muted-foreground"}>
                        {row.is_published ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void handleDelete(row)}>
                          <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => (!saving ? setOpen(v) : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Question</Label>
              <Input
                value={form.question}
                onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
                placeholder="Write the question..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Answer</Label>
              <Textarea
                value={form.answer}
                onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
                rows={6}
                placeholder={'Ketik jawaban...\n\nGunakan bullet dengan format:\n- Poin pertama\n- Poin kedua'}
              />

              {!!form.answer.trim() && (
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Preview</div>
                  <FaqAnswer text={form.answer} />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={String(form.sort_order)}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value || 0) }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                   <div className="text-sm font-medium text-foreground">Published</div>
                   <div className="text-xs text-muted-foreground">Show on /packages</div>
                </div>
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm((p) => ({ ...p, is_published: v }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={!canSubmit}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
