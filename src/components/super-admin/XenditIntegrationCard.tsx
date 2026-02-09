import type { FormEvent } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { KeyRound, RefreshCcw, Save, Trash2 } from "lucide-react";

type Status = {
  configured: boolean;
  updatedAt: string | null;
};

type Props = {
  loading: boolean;
  status: Status;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onSaveEnabled: () => void;
  apiKeyValue: string;
  onApiKeyChange: (v: string) => void;
  onSave: (e: FormEvent) => void;
  onRefresh: () => void;
  onClear: () => void;
};

export function XenditIntegrationCard({
  loading,
  status,
  enabled,
  onEnabledChange,
  onSaveEnabled,
  apiKeyValue,
  onApiKeyChange,
  onSave,
  onRefresh,
  onClear,
}: Props) {
  const effectiveReady = enabled && status.configured;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Payment Gateway (Xendit)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Enabled" : "Disabled"}</Badge>
            <Badge variant={effectiveReady ? "default" : "secondary"}>{effectiveReady ? "Ready" : "Not ready"}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="text-sm text-muted-foreground">
        Simpan <span className="font-medium text-foreground">Xendit Secret API Key</span> untuk integrasi pembayaran (contoh prefix:
        <span className="font-mono text-foreground"> xnd_development_</span> / <span className="font-mono text-foreground">xnd_production_</span>).

        <div className="mt-4 space-y-4">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Enable Xendit</div>
                <div className="text-xs text-muted-foreground">
                  Jika dimatikan, halaman <span className="font-medium text-foreground">/order</span> tidak akan menggunakan Xendit.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={enabled} onCheckedChange={onEnabledChange} disabled={loading} />
                <Button type="button" size="sm" onClick={onSaveEnabled} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" /> Simpan
                </Button>
              </div>
            </div>
          </div>

          <form onSubmit={onSave} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="xendit_api_key">Xendit API key</Label>
              <Input
                id="xendit_api_key"
                type="password"
                value={apiKeyValue}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="Tempel Xendit Secret API Key di sini..."
                autoComplete="new-password"
                disabled={loading}
              />
              <div className="text-xs text-muted-foreground">
                Jangan gunakan <span className="font-mono text-foreground">xnd_public_</span> (public key) untuk create invoice.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" /> Simpan
              </Button>
              <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
                <RefreshCcw className="h-4 w-4 mr-2" /> Refresh status
              </Button>
              <Button type="button" variant="destructive" onClick={onClear} disabled={loading || !status.configured}>
                <Trash2 className="h-4 w-4 mr-2" /> Reset key
              </Button>
            </div>
          </form>

          <div className="text-xs text-muted-foreground">
            Disimpan sebagai <span className="font-medium text-foreground">xendit/api_key</span>.
            {status.updatedAt ? <span> Terakhir update: {new Date(status.updatedAt).toLocaleString()}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
