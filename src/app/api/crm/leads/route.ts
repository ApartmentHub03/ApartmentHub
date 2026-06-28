import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Source table configurations for fetching type-specific data
const SOURCE_QUERIES: Record<
  string,
  { table: string; select: string; mappers: Record<string, string> }
> = {
  meta_leads: {
    table: "meta_leads",
    select: "id,full_name,email,phone,bedrooms,budget,language,source,utm_source,utm_medium,utm_campaign,utm_content,utm_term,created_at",
    mappers: {
      full_name: "full_name",
      email: "email",
      phone: "phone",
    },
  },
  koop_leads: {
    table: "koop_leads",
    select: "id,first_name,last_name,email,phone,city,budget,neighborhoods,property_type,min_bedrooms,min_sqm,mortgage_status,timeline,status,created_at",
    mappers: {},
  },
  valuation_leads: {
    table: "valuation_leads",
    select: "id,first_name,last_name,email,phone,address,postcode,city,neighborhood,surface_area,property_type,condition,energy_label,estimated_value_low,estimated_value_high,status,created_at",
    mappers: {},
  },
};

export async function GET(req: NextRequest) {
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage");
  const type = url.searchParams.get("type");
  const search = url.searchParams.get("search");
  const assignee = url.searchParams.get("assignee");

  let query = sb
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (stage) query = query.eq("stage", stage);
  if (type) query = query.eq("type", type);
  if (assignee) query = query.eq("assignee_id", assignee);
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data: leads, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group leads by source_type and fetch source data
  const bySource: Record<string, string[]> = {};
  for (const lead of leads ?? []) {
    if (!bySource[lead.source_type]) bySource[lead.source_type] = [];
    bySource[lead.source_type].push(lead.source_id);
  }

  const sourceData: Record<string, Record<string, unknown>> = {};
  for (const [sourceType, ids] of Object.entries(bySource)) {
    const config = SOURCE_QUERIES[sourceType];
    if (!config) continue;

    const { data } = await sb
      .from(config.table)
      .select(config.select)
      .in("id", ids);

    if (data) {
      for (const row of (data as unknown) as Record<string, unknown>[]) {
        sourceData[`${sourceType}:${row.id}`] = row;
      }
    }
  }

  // Fetch all pipeline stages (grouped by pipeline on the frontend)
  const { data: stages, error: stagesError } = await sb
    .from("pipeline_stages")
    .select("*")
    .order("pipeline", { ascending: true })
    .order("position", { ascending: true });

  if (stagesError) {
    return NextResponse.json({ error: stagesError.message }, { status: 500 });
  }

  // Fetch staff users for assignee display (replaces former team_members read)
  const { data: staffUsers } = await sb
    .from("verkoop_staff_users")
    .select("phone_e164, display_name, role");

  return NextResponse.json({
    leads: leads ?? [],
    sourceData,
    stages: stages ?? [],
    teamMembers: staffUsers ?? [],
  });
}