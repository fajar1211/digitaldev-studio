import type { FormEvent } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCcw, Save, Trash2, Wallet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type PaypalEnv = "sandbox" | "production";

export type PaypalStatus = {
  enabled?: boolean;
  activeEnv: PaypalEnv | null;
  sandboxReady: boolean;
  productionReady: boolean;
};

type Props = {
  loading: boolean;
  status: PaypalStatus;

  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onSaveEnabled: () => void;

  activeEnv: PaypalEnv;
  onActiveEnvChange: (env: PaypalEnv) => void;
  onSaveActiveEnv: () => void;

  onResetEnv: (env: PaypalEnv) => void;
  clientIdValue: string;
  onClientIdValueChange: (v: string) => void;
  onSaveClientId: (e: FormEvent) => void;

  secretValue: string;
  onSecretValueChange: (v: string) => void;
  onSaveSecret: (e: FormEvent) => void;

  onRefresh: () => void;
};

export function PaypalIntegrationCard({
  loading,
  status,
  enabled,
  onEnabledChange,
  onSaveEnabled,
  activeEnv,
  onActiveEnvChange,
  onSaveActiveEnv,
  onResetEnv,
  clientIdValue,
  onClientIdValueChange,
  onSaveClientId,
  secretValue,
  onSecretValueChange,
  onSaveSecret,
  onRefresh,
}: Props) {
  const ready = status.activeEnv === "sandbox" ? status.sandboxReady : status.activeEnv === "production" ? status.productionReady : false;
  const effectiveReady = enabled && ready;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Payment Gateway (PayPal)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Enabled" : "Disabled"}</Badge>
            <Badge variant={effectiveReady ? "default" : "secondary"}>{effectiveReady ? "Ready" : "Not ready"}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="text-sm text-muted-foreground">
        Konfigurasi PayPal untuk <span className="font-medium text-foreground">PayPal Buttons</span> di halaman order.

        <div className="mt-4 space-y-4">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Enable PayPal</div>
                <div className="text-xs text-muted-foreground">
                  Jika dimatikan, tombol <span className="font-medium text-foreground">PayPal</span> di halaman order akan nonaktif.
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

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Environment aktif</div>
              <Select value={activeEnv} onValueChange={(v) => onActiveEnvChange(v as PaypalEnv)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih environment" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={onSaveActiveEnv} disabled={loading}>
              <Save className="h-4 w-4 mr-2" /> Simpan
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="destructive" onClick={() => onResetEnv(activeEnv)} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" /> Reset env {activeEnv}
            </Button>
            <div className="text-xs text-muted-foreground">Menghapus Client ID + Client Secret untuk env yang dipilih.</div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.sandboxReady ? "default" : "secondary"}>Sandbox {status.sandboxReady ? "Ready" : "Not set"}</Badge>
              <Badge variant={status.productionReady ? "default" : "secondary"}>Production {status.productionReady ? "Ready" : "Not set"}</Badge>
            </div>
          </div>

          <form onSubmit={onSaveClientId} className="rounded-md border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-foreground">Client ID</div>
              <Badge variant="outline" className="h-9 px-3 inline-flex items-center">
                {activeEnv}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paypal_client_id">PayPal Client ID</Label>
              <Input
                id="paypal_client_id"
                value={clientIdValue}
                onChange={(e) => onClientIdValueChange(e.target.value)}
                placeholder="Tempel PayPal Client ID..."
                autoComplete="off"
                disabled={loading}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" /> Simpan Client ID
              </Button>
            </div>
          </form>

          <form onSubmit={onSaveSecret} className="rounded-md border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-foreground">Client Secret</div>
              <Badge variant="outline" className="h-9 px-3 inline-flex items-center">
                {activeEnv}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paypal_client_secret">PayPal Client Secret</Label>
              <Input
                id="paypal_client_secret"
                type="password"
                value={secretValue}
                onChange={(e) => onSecretValueChange(e.target.value)}
                placeholder="Tempel PayPal Client Secret..."
                autoComplete="new-password"
                disabled={loading}
              />
              <div className="text-xs text-muted-foreground">Disimpan server-side (tidak pernah dikirim ke browser).</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" /> Simpan Secret
              </Button>
            </div>
          </form>

          <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
