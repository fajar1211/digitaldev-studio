import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { State, City } from "country-state-city";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { OrderLayout } from "@/components/order/OrderLayout";
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrder } from "@/contexts/OrderContext";

const schema = z.object({
  name: z.string().trim().min(1, "Nama lengkap wajib diisi").max(100),
  email: z.string().trim().email("Email tidak valid").max(255),
  phone: z.string().trim().min(6, "Nomor Telp/WhatsApp wajib diisi").max(30, "Nomor Telp/WhatsApp terlalu panjang"),
  businessName: z.string().trim().max(120).optional().or(z.literal("")),
  provinceCode: z.string().trim().min(1, "Provinsi wajib dipilih").max(10),
  city: z.string().trim().min(1, "Kota/Kab wajib dipilih").max(120),
  acceptedTerms: z.boolean().refine((v) => v === true, { message: "Kamu harus setuju dengan syarat" }),
});

type FormValues = z.infer<typeof schema>;

const KALIMANTAN_BARAT_CITIES = [
  "Kabupaten Bengkayang",
  "Kabupaten Kapuas Hulu",
  "Kabupaten Kayong Utara",
  "Kabupaten Ketapang",
  "Kabupaten Kubu Raya",
  "Kabupaten Landak",
  "Kabupaten Melawi",
  "Kabupaten Mempawah",
  "Kabupaten Sambas",
  "Kabupaten Sanggau",
  "Kabupaten Sekadau",
  "Kabupaten Sintang",
  "Kota Pontianak",
  "Kota Singkawang",
];

export default function Checkout() {
  const navigate = useNavigate();
  const { state, setDetails } = useOrder();

  const provinces = useMemo(() => {
    const list = State.getStatesOfCountry("ID") || [];
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name), "id"));
  }, []);

  const defaultValues = useMemo<FormValues>(
    () => ({
      name: state.details.name,
      email: state.details.email,
      phone: state.details.phone,
      businessName: state.details.businessName ?? "",
      provinceCode: state.details.provinceCode ?? "",
      city: state.details.city ?? "",
      acceptedTerms: state.details.acceptedTerms,
    }),
    [state.details],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const provinceValue = useWatch({ control: form.control, name: "provinceCode" });

  const selectedProvince = useMemo(() => {
    if (!provinceValue) return undefined;
    const byIso = provinces.find((p) => p.isoCode === provinceValue);
    if (byIso) return byIso;
    const byName = provinces.find((p) => String(p.name).toLowerCase() === String(provinceValue).toLowerCase());
    return byName;
  }, [provinceValue, provinces]);

  const resolvedProvinceCode = useMemo(() => {
    const iso = selectedProvince?.isoCode ?? "";
    if (!iso) return "";
    const parts = String(iso).split("-");
    return parts[parts.length - 1];
  }, [selectedProvince]);

  const selectedProvinceName = useMemo(() => selectedProvince?.name ?? "", [selectedProvince]);

  const libraryCityNames = useMemo(() => {
    if (!resolvedProvinceCode) return [] as string[];

    const byState = City.getCitiesOfState("ID", resolvedProvinceCode) || [];
    if (byState.length > 0) return byState.map((c) => c.name);

    const normalize = (code: unknown) => {
      const s = String(code ?? "").trim();
      if (!s) return "";
      const parts = s.split("-");
      return parts[parts.length - 1].toLowerCase();
    };

    const target = normalize(resolvedProvinceCode);
    const all = City.getCitiesOfCountry("ID") || [];
    return all.filter((c) => normalize((c as any).stateCode) === target).map((c) => c.name);
  }, [resolvedProvinceCode]);

  const [apiCityNames, setApiCityNames] = useState<string[]>([]);

  useEffect(() => {
    if (!resolvedProvinceCode) {
      setApiCityNames([]);
      return;
    }
    if (libraryCityNames.length > 0) {
      setApiCityNames([]);
      return;
    }

    const controller = new AbortController();

    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    (async () => {
      try {
        const provRes = await fetch("https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json", {
          signal: controller.signal,
        });
        const provJson = (await provRes.json()) as Array<{ id: string; name: string }>;
        const targetName = norm(selectedProvinceName);
        const matched = provJson.find((p) => norm(p.name) === targetName);
        if (!matched) {
          setApiCityNames([]);
          return;
        }

        const regRes = await fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${matched.id}.json`, {
          signal: controller.signal,
        });
        const regJson = (await regRes.json()) as Array<{ id: string; name: string }>;
        setApiCityNames(regJson.map((r) => r.name).sort((a, b) => a.localeCompare(b, "id")));
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setApiCityNames([]);
      }
    })();

    return () => controller.abort();
  }, [libraryCityNames.length, resolvedProvinceCode, selectedProvinceName]);

  return (
    <OrderLayout
      title="Checkout"
      step="details"
      flow="plan"
      sidebar={<OrderSummaryCard showEstPrice={false} hideDomain hideStatus hideTemplate />}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Pemesan</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit((values) => {
                const provinceName = provinces.find((p) => p.isoCode === values.provinceCode)?.name ?? "";
                setDetails({ ...values, provinceName });
                navigate("/order/subscribe");
              })}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. WhatsApp</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="tel" inputMode="tel" placeholder="08xxxxxxxxxx" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Bisnis (opsional)</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="organization" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="provinceCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provinsi</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue("city", "", { shouldValidate: true, shouldDirty: true });
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih provinsi" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {provinces.map((p) => (
                            <SelectItem key={p.isoCode} value={p.isoCode}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => {
                    let cityNames = (libraryCityNames.length > 0 ? libraryCityNames : apiCityNames).slice();

                    const isKalbar =
                      resolvedProvinceCode.toUpperCase() === "KB" || /kalimantan\s+barat/i.test(selectedProvinceName);
                    if (cityNames.length === 0 && isKalbar) {
                      cityNames = KALIMANTAN_BARAT_CITIES.slice();
                    }

                    return (
                      <FormItem>
                        <FormLabel>Kota/Kab</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={!resolvedProvinceCode}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kota" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cityNames.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <FormField
                control={form.control}
                name="acceptedTerms"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                      <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                      <div className="space-y-1">
                        <FormLabel className="leading-none">Saya setuju dengan syarat & ketentuan</FormLabel>
                        <p className="text-sm text-muted-foreground">Kamu bisa update data ini nanti.</p>
                        <FormMessage />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => navigate("/order/select-plan")}>
                  Kembali
                </Button>
                <Button type="submit" size="lg" disabled={!form.formState.isValid || !state.selectedPackageId}>
                  Lanjut
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </OrderLayout>
  );
}
