import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceConfig = {
  table: string;
  type: string;
  select: string;
  map: (row: Record<string, unknown>) => {
    type: string;
    source_type: string;
    source_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    postcode: string | null;
    city: string | null;
    neighborhood: string | null;
    source: string;
  };
};

function splitName(fullName: string | null): { first: string | null; last: string | null } {
  if (!fullName) return { first: null, last: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  meta_leads: {
    table: "meta_leads",
    type: "meta_ads",
    select: "id,full_name,email,phone",
    map: (row) => {
      const { first, last } = splitName(row.full_name as string | null);
      return {
        type: "meta_ads",
        source_type: "meta_leads",
        source_id: row.id as string,
        first_name: first,
        last_name: last,
        email: (row.email as string) || null,
        phone: (row.phone as string) || null,
        address: null,
        postcode: null,
        city: null,
        neighborhood: null,
        source: "meta_ads",
      };
    },
  },
  koop_leads: {
    table: "koop_leads",
    type: "buyer_intake",
    select: "id,first_name,last_name,email,phone,city,neighborhoods",
    map: (row) => ({
      type: "buyer_intake",
      source_type: "koop_leads",
      source_id: row.id as string,
      first_name: (row.first_name as string) || null,
      last_name: (row.last_name as string) || null,
      email: (row.email as string) || null,
      phone: (row.phone as string) || null,
      address: null,
      postcode: null,
      city: (row.city as string) || null,
      neighborhood: Array.isArray(row.neighborhoods)
        ? (row.neighborhoods as string[]).join(", ")
        : (row.neighborhoods as string) || null,
      source: "website",
    }),
  },
  valuation_leads: {
    table: "valuation_leads",
    type: "sale",
    select: "id,first_name,last_name,email,phone,address,postcode,city,neighborhood",
    map: (row) => ({
      type: "sale",
      source_type: "valuation_leads",
      source_id: row.id as string,
      first_name: (row.first_name as string) || null,
      last_name: (row.last_name as string) || null,
      email: (row.email as string) || null,
      phone: (row.phone as string) || null,
      address: (row.address as string) || null,
      postcode: (row.postcode as string) || null,
      city: (row.city as string) || null,
      neighborhood: (row.neighborhood as string) || null,
      source: "website",
    }),
  },
};

export async function POST(req: NextRequest) {
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sourceParam = url.searchParams.get("source");
  const sb = supabaseAdmin();

  const sources = sourceParam
    ? { [sourceParam]: SOURCE_CONFIGS[sourceParam] }
    : SOURCE_CONFIGS;

  const results: Record<string, number> = {};
  let totalUpserted = 0;
  const errors: string[] = [];

  for (const [key, config] of Object.entries(sources)) {
    if (!config) {
      errors.push(`Unknown source: ${key}`);
      results[key] = 0;
      continue;
    }

    const { data: rows, error: fetchError } = await sb
      .from(config.table)
      .select(config.select);

    if (fetchError) {
      errors.push(`${key}: ${fetchError.message}`);
      results[key] = 0;
      continue;
    }

    if (!rows || rows.length === 0) {
      results[key] = 0;
      continue;
    }

    const leads = (rows as unknown as Record<string, unknown>[]).map((row) => config.map(row));

    const { data: upserted, error: upsertError } = await sb
      .from("leads")
      .upsert(leads, { onConflict: "source_type,source_id" })
      .select("id");

    if (upsertError) {
      errors.push(`${key}: ${upsertError.message}`);
      results[key] = 0;
      continue;
    }

    results[key] = upserted?.length ?? 0;
    totalUpserted += upserted?.length ?? 0;
  }

  return NextResponse.json({
    synced: results,
    total: totalUpserted,
    ...(errors.length > 0 ? { errors } : {}),
  });
}