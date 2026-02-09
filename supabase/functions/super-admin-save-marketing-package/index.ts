import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PackagePayload = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  features: string[];
  is_active: boolean;
};

type AddOnDraft = {
  id?: string;
  add_on_key: string;
  label: string;
  price_per_unit: number;
  unit_step: number;
  unit: string;
  is_active: boolean;
  sort_order: number;
  max_quantity?: number | null;
};

type DurationDraft = {
  id?: string;
  duration_months: number;
  discount_percent: number;
  is_active: boolean;
  sort_order: number;
};

type Payload = {
  package: PackagePayload;
  /** Optional: when null/empty it will clear for this package */
  start_url?: string | null;
  add_ons: AddOnDraft[];
  removed_add_on_ids: string[];
  durations: DurationDraft[];
  removed_duration_ids: string[];
};

function jsonStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string") as string[];
  return [];
}

function normalizeUuid(input: unknown, name: string) {
  const v = String(input ?? "").trim();
  if (!v) throw new Error(`${name} is required`);
  // light validation
  if (!/^[0-9a-fA-F-]{36}$/.test(v)) throw new Error(`${name} must be a uuid`);
  return v;
}

function normalizeText(input: unknown, name: string, { required = false }: { required?: boolean } = {}) {
  const v = String(input ?? "").trim();
  if (required && !v) throw new Error(`${name} is required`);
  return v;
}

function normalizeNumber(input: unknown, fallback = 0) {
  const n = typeof input === "number" ? input : Number(input);
  return Number.isFinite(n) ? n : fallback;
}

async function requireSuperAdmin(admin: any, userId: string) {
  const { data: roleRow, error: roleErr } = await admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (roleErr) return { ok: false as const, status: 500, error: roleErr.message };
  if ((roleRow as any)?.role !== "super_admin") return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, userId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify JWT + extract user id
    const authed = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await authed.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actorUserId = String(claimsData.claims.sub);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const authz = await requireSuperAdmin(admin, actorUserId);
    if (!authz.ok) {
      return new Response(JSON.stringify({ error: authz.error }), {
        status: authz.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;

    const pkg = body?.package as any;
    const packageId = normalizeUuid(pkg?.id, "package.id");

    const packagePayload: PackagePayload = {
      id: packageId,
      name: normalizeText(pkg?.name, "package.name", { required: true }),
      description: (() => {
        const d = normalizeText(pkg?.description, "package.description");
        return d ? d : null;
      })(),
      price: pkg?.price === null || pkg?.price === undefined || pkg?.price === "" ? null : normalizeNumber(pkg?.price, 0),
      features: jsonStringArray(pkg?.features),
      is_active: Boolean(pkg?.is_active ?? true),
    };

    const { error: pkgErr } = await admin
      .from("packages")
      .update({
        name: packagePayload.name,
        description: packagePayload.description,
        price: packagePayload.price,
        features: packagePayload.features,
        is_active: packagePayload.is_active,
      })
      .eq("id", packageId);
    if (pkgErr) throw pkgErr;

    // Save per-package Start URL mapping in website_settings (no schema change needed)
    const PACKAGES_START_URLS_KEY = "packages_start_urls";
    const startUrlRaw = (body as any)?.start_url;
    const startUrlNormalized = String(startUrlRaw ?? "").trim();

    if (startUrlRaw !== undefined) {
      const { data: settingsRow, error: settingsErr } = await admin
        .from("website_settings")
        .select("value")
        .eq("key", PACKAGES_START_URLS_KEY)
        .maybeSingle();
      if (settingsErr) throw settingsErr;

      const current = (settingsRow as any)?.value;
      const map: Record<string, string> = current && typeof current === "object" ? { ...(current as any) } : {};

      if (!startUrlNormalized) {
        delete map[String(packageId)];
      } else {
        map[String(packageId)] = startUrlNormalized.startsWith("/") || /^https?:\/\//i.test(startUrlNormalized)
          ? startUrlNormalized
          : `/${startUrlNormalized}`;
      }

      const { error: upsertErr } = await admin
        .from("website_settings")
        .upsert({ key: PACKAGES_START_URLS_KEY, value: map }, { onConflict: "key" });
      if (upsertErr) throw upsertErr;
    }

    const addOns = Array.isArray(body?.add_ons) ? (body.add_ons as any[]) : [];
    const removedAddOnIds = Array.isArray(body?.removed_add_on_ids) ? body.removed_add_on_ids : [];

    const validAddOns: AddOnDraft[] = addOns
      .map((a) => ({
        id: a?.id ? String(a.id) : undefined,
        add_on_key: normalizeText(a?.add_on_key, "add_on_key"),
        label: normalizeText(a?.label, "label"),
        price_per_unit: normalizeNumber(a?.price_per_unit, 0),
        unit_step: Math.max(1, normalizeNumber(a?.unit_step, 1)),
        unit: normalizeText(a?.unit, "unit") || "unit",
        is_active: Boolean(a?.is_active ?? true),
        sort_order: Math.max(0, normalizeNumber(a?.sort_order, 0)),
        max_quantity:
          a?.max_quantity === null || a?.max_quantity === undefined || a?.max_quantity === ""
            ? null
            : Math.max(0, normalizeNumber(a?.max_quantity, 0)),
      }))
      .filter((a) => a.add_on_key.trim() && a.label.trim());

    const existingAddOns = validAddOns.filter((a) => Boolean(a.id));
    const newAddOns = validAddOns.filter((a) => !a.id);

    if (existingAddOns.length) {
      const results = await Promise.all(
        existingAddOns.map((a) =>
          admin
            .from("package_add_ons")
            .update({
              package_id: packageId,
              add_on_key: a.add_on_key.trim(),
              label: a.label.trim(),
              price_per_unit: a.price_per_unit,
              unit_step: a.unit_step,
              unit: a.unit.trim() || "unit",
              is_active: a.is_active,
              sort_order: a.sort_order,
              max_quantity: a.max_quantity ?? null,
            })
            .eq("id", a.id),
        ),
      );
      const firstErr = results.find((r) => (r as any)?.error)?.error;
      if (firstErr) throw firstErr;
    }

    if (newAddOns.length) {
      const insertPayload = newAddOns.map((a) => ({
        package_id: packageId,
        add_on_key: a.add_on_key.trim(),
        label: a.label.trim(),
        price_per_unit: a.price_per_unit,
        unit_step: a.unit_step,
        unit: a.unit.trim() || "unit",
        is_active: a.is_active,
        sort_order: a.sort_order,
        max_quantity: a.max_quantity ?? null,
      }));

      const { error: upsertErr } = await admin
        .from("package_add_ons")
        .upsert(insertPayload, { onConflict: "package_id,add_on_key", defaultToNull: false });
      if (upsertErr) throw upsertErr;
    }

    if (removedAddOnIds.length) {
      const { error: delErr } = await admin.from("package_add_ons").delete().in("id", removedAddOnIds).eq("package_id", packageId);
      if (delErr) throw delErr;
    }

    const durations = Array.isArray(body?.durations) ? (body.durations as any[]) : [];
    const removedDurationIds = Array.isArray(body?.removed_duration_ids) ? body.removed_duration_ids : [];

    const validDurations: DurationDraft[] = durations
      .map((d) => ({
        id: d?.id ? String(d.id) : undefined,
        duration_months: Math.max(1, Math.floor(normalizeNumber(d?.duration_months, 1))),
        discount_percent: Math.max(0, normalizeNumber(d?.discount_percent, 0)),
        is_active: Boolean(d?.is_active ?? true),
        sort_order: Math.max(0, normalizeNumber(d?.sort_order, 0)),
      }))
      .filter((d) => Number.isFinite(d.duration_months) && d.duration_months > 0);

    const existingDurations = validDurations.filter((d) => Boolean(d.id));
    const newDurations = validDurations.filter((d) => !d.id);

    if (existingDurations.length) {
      const results = await Promise.all(
        existingDurations.map((d) =>
          admin
            .from("package_durations")
            .update({
              package_id: packageId,
              duration_months: d.duration_months,
              discount_percent: d.discount_percent,
              is_active: d.is_active,
              sort_order: d.sort_order,
            })
            .eq("id", d.id),
        ),
      );
      const firstErr = results.find((r) => (r as any)?.error)?.error;
      if (firstErr) throw firstErr;
    }

    if (newDurations.length) {
      const insertPayload = newDurations.map((d) => ({
        package_id: packageId,
        duration_months: d.duration_months,
        discount_percent: d.discount_percent,
        is_active: d.is_active,
        sort_order: d.sort_order,
      }));

      const { error: upsertErr } = await admin
        .from("package_durations")
        .upsert(insertPayload, { onConflict: "package_id,duration_months", defaultToNull: false });
      if (upsertErr) throw upsertErr;
    }

    if (removedDurationIds.length) {
      const { error: delErr } = await admin.from("package_durations").delete().in("id", removedDurationIds).eq("package_id", packageId);
      if (delErr) throw delErr;
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
