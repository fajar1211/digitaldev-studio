import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Save, CreditCard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type MidtransEnv = "sandbox" | "production";

export type MidtransEnvStatus = {
  configured: boolean;
  clientKeyMasked: string | null;
  serverKeyMasked: string | null;
  updatedAt: string | null;
};

export type MidtransStatus = {
  merchantId: string | null;
  updatedAt: string | null;
  activeEnv: MidtransEnv | null;
  sandbox: MidtransEnvStatus;
  production: MidtransEnvStatus;
};

type Props = {
  loading: boolean;
  status: MidtransStatus;
  selectedEnv: MidtransEnv;
  onSelectedEnvChange: (env: MidtransEnv) => void;
  onSaveSelectedEnv: () => void;
  onRefresh: () => void;

  apiKeysEnv: MidtransEnv;
  onApiKeysEnvChange: (env: MidtransEnv) => void;
  merchantIdValue: string;
  onMerchantIdChange: (value: string) => void;
  clientKeyValue: string;
  onClientKeyChange: (value: string) => void;
  serverKeyValue: string;
  onServerKeyChange: (value: string) => void;
  onSaveApiKeys: () => void;
};

export function MidtransIntegrationCard({
  loading,
  status,
  selectedEnv,
  onSelectedEnvChange,
  onSaveSelectedEnv,
  onRefresh,
  apiKeysEnv,
  onApiKeysEnvChange,
  merchantIdValue,
  onMerchantIdChange,
  clientKeyValue,
  onClientKeyChange,
  serverKeyValue,
  onServerKeyChange,
  onSaveApiKeys,
}: Props) {
  const configuredAny = Boolean(status.sandbox.configured || status.production.configured || status.merchantId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment Gateway (Midtrans)
          </CardTitle>
          <Badge variant={configuredAny ? "default" : "secondary"}>{configuredAny ? "Ready" : "Not set"}</Badge>
        </div>
      </CardHeader>

      <CardContent className="text-sm text-muted-foreground">
        Pilih environment Midtrans yang aktif untuk halaman order.

        <div className="mt-4 space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Merchant ID</span>
              <span className="font-mono text-foreground">{status.merchantId || "—"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.sandbox.configured ? "default" : "secondary"}>Sandbox {status.sandbox.configured ? "Ready" : "Not set"}</Badge>
              <Badge variant={status.production.configured ? "default" : "secondary"}>
                Production {status.production.configured ? "Ready" : "Not set"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Environment aktif</div>
              <Select value={selectedEnv} onValueChange={(v) => onSelectedEnvChange(v as MidtransEnv)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih environment" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Tersimpan sebagai setting global; hanya satu environment yang aktif.
              </div>
            </div>

            <Button type="button" onClick={onSaveSelectedEnv} disabled={loading}>
              <Save className="h-4 w-4 mr-2" /> Simpan
            </Button>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs font-medium text-foreground">API Keys Midtrans</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Merchant ID bersifat global. Client Key & Server Key disimpan per environment.
            </div>

            <div className="mt-4 grid gap-3">
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">Konfigurasi untuk environment</div>
                <Select value={apiKeysEnv} onValueChange={(v) => onApiKeysEnvChange(v as MidtransEnv)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih environment" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="midtrans-merchant-id">Merchant ID</Label>
                <Input
                  id="midtrans-merchant-id"
                  value={merchantIdValue}
                  onChange={(e) => onMerchantIdChange(e.target.value)}
                  placeholder={status.merchantId || "Masukkan Merchant ID"}
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="midtrans-client-key">Client Key ({apiKeysEnv})</Label>
                <Input
                  id="midtrans-client-key"
                  value={clientKeyValue}
                  onChange={(e) => onClientKeyChange(e.target.value)}
                  placeholder={
                    apiKeysEnv === "sandbox"
                      ? status.sandbox.clientKeyMasked || "Masukkan Client Key"
                      : status.production.clientKeyMasked || "Masukkan Client Key"
                  }
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="midtrans-server-key">Server Key ({apiKeysEnv})</Label>
                <Input
                  id="midtrans-server-key"
                  type="password"
                  value={serverKeyValue}
                  onChange={(e) => onServerKeyChange(e.target.value)}
                  placeholder={
                    apiKeysEnv === "sandbox"
                      ? status.sandbox.serverKeyMasked || "Masukkan Server Key"
                      : status.production.serverKeyMasked || "Masukkan Server Key"
                  }
                  autoComplete="new-password"
                />
                <div className="text-[11px] text-muted-foreground">Server key disembunyikan (tidak ditampilkan penuh).</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={onSaveApiKeys} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" /> Simpan API Key
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Refresh status
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Pengaturan environment disimpan di <span className="font-medium text-foreground">website_settings</span>.
            {status.updatedAt ? <span> Terakhir update: {new Date(status.updatedAt).toLocaleString()}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
