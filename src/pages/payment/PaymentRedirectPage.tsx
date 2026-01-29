import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { usePageSeo } from "@/hooks/usePageSeo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PaymentRedirectKind = "success" | "pending" | "error";

const copyByKind: Record<PaymentRedirectKind, { title: string; headline: string; hint: string }> = {
  success: {
    title: "Pembayaran Berhasil",
    headline: "Pembayaran Berhasil",
    hint: "Terima kasih. Jika paket belum aktif, mohon tunggu beberapa saat atau hubungi support.",
  },
  pending: {
    title: "Pembayaran Belum Selesai",
    headline: "Pembayaran Belum Selesai",
    hint: "Transaksi masih diproses. Silakan selesaikan pembayaran atau tunggu konfirmasi dari sistem.",
  },
  error: {
    title: "Pembayaran Gagal",
    headline: "Pembayaran Gagal",
    hint: "Pembayaran tidak dapat diproses. Silakan coba lagi atau gunakan metode lain.",
  },
};

function safeText(v: string) {
  const trimmed = (v ?? "").trim();
  // Avoid rendering extremely long strings from query params.
  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
}

export default function PaymentRedirectPage({ kind }: { kind: PaymentRedirectKind }) {
  const { search } = useLocation();
  const copy = copyByKind[kind];

  usePageSeo(`payment_${kind}`, {
    title: copy.title,
    description: copy.hint,
  });

  const params = useMemo(() => {
    const sp = new URLSearchParams(search);
    const entries: Array<[string, string]> = [];
    sp.forEach((value, key) => {
      entries.push([safeText(key), safeText(value)]);
    });
    return entries;
  }, [search]);

  return (
    <PublicLayout>
      <section className="mx-auto w-full max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{copy.headline}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">{copy.hint}</p>

            {params.length > 0 ? (
              <div className="rounded-lg border">
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Detail (query parameter)</p>
                  <p className="text-xs text-muted-foreground">Dikirim oleh Midtrans pada redirect.</p>
                </div>
                <dl className="divide-y">
                  {params.map(([k, v]) => (
                    <div key={`${k}:${v}`} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-3">
                      <dt className="text-xs font-medium text-muted-foreground">{k}</dt>
                      <dd className="text-sm text-foreground break-words">{v || "-"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada query parameter.</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/">Kembali ke Beranda</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/order/choose-domain">Mulai Order</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </PublicLayout>
  );
}
