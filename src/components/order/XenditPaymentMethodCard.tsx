import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function XenditPaymentMethodCard({
  title,
  promo,
  onPromoChange,
  onApplyPromo,
  applyingDisabled,
}: {
  title: string;
  promo: string;
  onPromoChange: (v: string) => void;
  onApplyPromo: () => Promise<void> | void;
  applyingDisabled?: boolean;
}) {
  const disabled = Boolean(applyingDisabled);

  const helpText = useMemo(
    () => "Kamu akan diarahkan ke halaman pembayaran Xendit (Invoice) untuk menyelesaikan pembayaran.",
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button type="button" variant="default" aria-disabled="true">
            Xendit
          </Button>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium text-foreground">Xendit Invoice</p>
            </div>
            <span className="text-muted-foreground">Hosted</span>
          </div>

          <p className="text-sm text-muted-foreground">{helpText}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input value={promo} onChange={(e) => onPromoChange(e.target.value)} placeholder="Kode promo" />
          <Button type="button" variant="outline" onClick={onApplyPromo} disabled={disabled}>
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
