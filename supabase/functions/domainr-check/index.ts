// Supabase Edge Function: domainr-check
// Checks domain availability using Domainr API and returns status + (fallback) pricing.
//
// Notes:
// - Domainr API itself does not provide registrar checkout pricing in the public docs.
//   We return a simple per-TLD pricing map for popular TLDs so the UI can show a price.
//   (Can be replaced later with a registrar pricing API.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DomainrStatusRow = {
  domain: string;
  zone?: string;
  status?: string;
  summary?: string;
};

type CheckRequest = {
  query: string;
};

function normalizeQuery(raw: string) {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\s+/g, "");
  return v;
}

function stripTld(domainOrLabel: string) {
  const v = normalizeQuery(domainOrLabel);
  if (!v) return "";
  return v.split(".")[0];
}

function buildCandidates(base: string, tlds: string[]) {
  const name = stripTld(base);
  if (!name) return [];
  return tlds.map((t) => `${name}${t}`).slice(0, 10);
}

function summarizeToUiStatus(summary?: string, status?: string) {
  const s = `${summary ?? ""} ${status ?? ""}`.toLowerCase();
  // Heuristics per Domainr docs examples: summary often "inactive" / "active".
  if (s.includes("premium")) return "premium" as const;
  if (s.includes("inactive") || s.includes("undelegated")) return "available" as const;
  if (s.includes("active") || s.includes("delegated")) return "unavailable" as const;
  return "unknown" as const;
}

// Per request: tampilkan TLD favorit (maks 10) untuk keyword yang sama
const FAVORITE_TLDS = [".com", ".id", ".my.id", ".biz.id", ".co.id", ".web.id", ".net", ".org", ".online", ".store"];

// Pricing fallback (optional). Jika belum ada, tampilkan "—" di UI.
const DEFAULT_PRICES_USD: Record<string, number> = {
  ".com": 14.99,
  ".net": 16.99,
  ".org": 12.99,
  ".id": 19.99,
  ".online": 29.99,
  ".store": 39.99,
  ".my.id": 9.99,
  ".biz.id": 9.99,
  ".co.id": 24.99,
  ".web.id": 9.99,
};

async function getDomainrApiKey(admin: any) {
  const { data: row, error } = await admin
    .from("integration_secrets")
    .select("ciphertext,iv")
    .eq("provider", "domainr")
    .eq("name", "api_key")
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const ciphertext = String((row as any).ciphertext ?? "");
  const iv = String((row as any).iv ?? "");
  if (!ciphertext || !iv) return null;
  if (iv !== "plain") {
    const err = new Error("Domainr API key harus disimpan plaintext (iv='plain')");
    (err as any).status = 400;
    throw err;
  }
  return ciphertext;
}

async function domainrStatus(domains: string[], apiKey: string) {
  const qs = encodeURIComponent(domains.join(","));

  // Domainr has two common auth patterns depending on where you got your key:
  // 1) Official (deprecated docs): `client_id` query param to api.domainr.com
  // 2) RapidAPI marketplace: `X-RapidAPI-Key` + `X-RapidAPI-Host` headers to domainr.p.rapidapi.com
  // We'll try (1) first, then fallback to (2) on 401.

  const officialUrl = `https://api.domainr.com/v2/status?domain=${qs}&client_id=${encodeURIComponent(apiKey)}`;
  const officialRes = await fetch(officialUrl, { headers: { Accept: "application/json" } });

  if (officialRes.ok) {
    const json = (await officialRes.json()) as { status?: DomainrStatusRow[] };
    return json.status ?? [];
  }

  const officialTxt = await officialRes.text().catch(() => "");
  if (officialRes.status !== 401) {
    const err = new Error(`Domainr error (${officialRes.status}): ${officialTxt || officialRes.statusText}`);
    (err as any).status = officialRes.status;
    throw err;
  }

  // Fallback: RapidAPI
  const rapidUrl = `https://domainr.p.rapidapi.com/v2/status?domain=${qs}`;
  const rapidRes = await fetch(rapidUrl, {
    headers: {
      Accept: "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "domainr.p.rapidapi.com",
    },
  });

  if (!rapidRes.ok) {
    const txt = await rapidRes.text().catch(() => "");
    // RapidAPI-specific common failure:
    // - 403: not subscribed to this API
    const pretty =
      rapidRes.status === 403 && (txt || "").toLowerCase().includes("not subscribed")
        ? "RapidAPI: Anda belum subscribe ke API Domainr. Buka RapidAPI dashboard → Domainr API → Subscribe, lalu coba lagi."
        : null;

    const err = new Error(pretty ? `${pretty} (detail: ${txt || rapidRes.statusText})` : `Domainr error (${rapidRes.status}): ${txt || rapidRes.statusText}`);
    (err as any).status = rapidRes.status;
    throw err;
  }

  const json = (await rapidRes.json()) as { status?: DomainrStatusRow[] };
  return json.status ?? [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as CheckRequest;
    const query = normalizeQuery(body?.query);
    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const apiKey = await getDomainrApiKey(admin);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Domainr API key belum diset (domainr/api_key)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidates = buildCandidates(query, FAVORITE_TLDS);
    const statusRows = await domainrStatus(candidates, apiKey);
    const byDomain = new Map(statusRows.map((r) => [String(r.domain).toLowerCase(), r]));

    const items = candidates
      .map((d) => {
        const r = byDomain.get(d.toLowerCase());
        const uiStatus = summarizeToUiStatus(r?.summary, r?.status);
        const tld = `.${d.split(".").pop() ?? ""}`;
        const priceUsd = uiStatus === "available" ? DEFAULT_PRICES_USD[tld] ?? null : null;
        return {
          domain: d,
          status: uiStatus,
          price_usd: priceUsd,
          currency: priceUsd ? "USD" : null,
          raw: r ? { summary: r.summary ?? null, status: r.status ?? null } : null,
        };
      })
      .filter((it) => it.status === "available")
      .slice(0, 10);

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = (e as any)?.status && Number.isFinite((e as any).status) ? Number((e as any).status) : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
