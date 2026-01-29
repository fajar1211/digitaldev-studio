import type { FormEvent, ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, RefreshCcw, Save, Trash2, CreditCard } from "lucide-react";

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
  sandbox: MidtransEnvStatus;
  production: MidtransEnvStatus;
};

export type MidtransFormValue = {
  merchantId: string;
  sandboxClientKey: string;
  sandboxServerKey: string;
  productionClientKey: string;
  productionServerKey: string;
};

type Props = {
  loading: boolean;
  status: MidtransStatus;
  value: MidtransFormValue;
  onChange: (patch: Partial<MidtransFormValue>) => void;
  onSave: (env: MidtransEnv) => (e: FormEvent) => void;
  onRefresh: () => void;
  onClear: (env: MidtransEnv) => void;
  onRevealServerKey: (env: MidtransEnv) => void;
  onHideServerKey: (env: MidtransEnv) => void;
  revealedServerKey: { sandbox: string | null; production: string | null };
};

function MaskRow({ label, value, action }: { label: string; value: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-foreground">{value || "—"}</span>
        {action}
      </div>
    </div>
  );
}

function EnvSection({
  env,
  loading,
  status,
  value,
  onChange,
  onSave,
  onClear,
  onReveal,
  onHide,
  revealedServerKey,
}: {
  env: MidtransEnv;
  loading: boolean;
  status: MidtransEnvStatus;
  value: MidtransFormValue;
  onChange: (patch: Partial<MidtransFormValue>) => void;
  onSave: (e: FormEvent) => void;
  onClear: () => void;
  onReveal: () => void;
  onHide: () => void;
  revealedServerKey: string | null;
}) {
  const title = env === "sandbox" ? "Sandbox" : "Production";
  const showServer = Boolean(revealedServerKey);
  const serverDisplay = showServer ? revealedServerKey : status.serverKeyMasked;

  const clientKeyField = env === "sandbox" ? "sandboxClientKey" : "productionClientKey";
  const serverKeyField = env === "sandbox" ? "sandboxServerKey" : "productionServerKey";

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">Kunci Core API untuk environment {title.toLowerCase()}.</div>
        </div>
        <Badge variant={status.configured ? "default" : "secondary"}>{status.configured ? "Configured" : "Not set"}</Badge>
      </div>

      <div className="mt-3 space-y-3">
        <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <MaskRow label="Client Key aktif" value={status.clientKeyMasked ?? ""} />
          <MaskRow
            label="Server Key aktif"
            value={serverDisplay ?? ""}
            action={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={showServer ? onHide : onReveal}
                disabled={loading || !status.configured}
                aria-label={showServer ? "Sembunyikan Server Key" : "Lihat Server Key"}
                title={showServer ? "Sembunyikan" : "Lihat"}
              >
                {showServer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            }
          />
          <div className="mt-1">Klik ikon mata untuk menampilkan server key (aksi dicatat di audit log).</div>
        </div>

        <form onSubmit={onSave} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`midtrans_${env}_client_key`}>Client Key</Label>
              <Input
                id={`midtrans_${env}_client_key`}
                type="password"
                value={value[clientKeyField]}
                onChange={(e) => onChange({ [clientKeyField]: e.target.value } as any)}
                placeholder="Mid-client-..."
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`midtrans_${env}_server_key`}>Server Key</Label>
              <Input
                id={`midtrans_${env}_server_key`}
                type="password"
                value={value[serverKeyField]}
                onChange={(e) => onChange({ [serverKeyField]: e.target.value } as any)}
                placeholder="Mid-server-..."
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" /> Simpan {title}
            </Button>
            <Button type="button" variant="destructive" onClick={onClear} disabled={loading || !status.configured}>
              <Trash2 className="h-4 w-4 mr-2" /> Reset {title}
            </Button>
          </div>
        </form>

        <div className="text-xs text-muted-foreground">
          {status.updatedAt ? <span>Terakhir update: {new Date(status.updatedAt).toLocaleString()}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function MidtransIntegrationCard({
  loading,
  status,
  value,
  onChange,
  onSave,
  onRefresh,
  onClear,
  onRevealServerKey,
  onHideServerKey,
  revealedServerKey,
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
        Simpan Merchant ID + Client/Server Key untuk Sandbox dan Production. Kamu bisa ganti key kapan saja lewat form ini.

        <div className="mt-4 space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span>Merchant ID aktif</span>
              <span className="font-mono text-foreground">{status.merchantId || "—"}</span>
            </div>
            <div className="mt-1">Server Key disimpan sebagai secret dan hanya bisa ditampilkan via tombol “eye”.</div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="midtrans_merchant_id">Merchant ID</Label>
            <Input
              id="midtrans_merchant_id"
              value={value.merchantId}
              onChange={(e) => onChange({ merchantId: e.target.value })}
              placeholder="contoh: G112191473"
              autoComplete="off"
              disabled={loading}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Refresh status
            </Button>
          </div>

          <div className="grid gap-3">
            <EnvSection
              env="sandbox"
              loading={loading}
              status={status.sandbox}
              value={value}
              onChange={onChange}
              onSave={onSave("sandbox")}
              onClear={() => onClear("sandbox")}
              onReveal={() => onRevealServerKey("sandbox")}
              onHide={() => onHideServerKey("sandbox")}
              revealedServerKey={revealedServerKey.sandbox}
            />

            <EnvSection
              env="production"
              loading={loading}
              status={status.production}
              value={value}
              onChange={onChange}
              onSave={onSave("production")}
              onClear={() => onClear("production")}
              onReveal={() => onRevealServerKey("production")}
              onHide={() => onHideServerKey("production")}
              revealedServerKey={revealedServerKey.production}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Disimpan di <span className="font-medium text-foreground">website_settings</span> (merchant/client keys) dan
            <span className="font-medium text-foreground"> integration_secrets</span> (server keys).
            {status.updatedAt ? <span> Terakhir update: {new Date(status.updatedAt).toLocaleString()}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
