import { redirect } from "next/navigation";
import { getStaffUser } from "@/app/lib/auth";
import type { StaffUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { pipelineForType } from "@/app/lib/crm-pipeline";
import { LeadDetailClient } from "./client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "CRM — Lead Detail",
};

const SOURCE_QUERIES: Record<string, { table: string; select: string }> = {
  meta_leads: {
    table: "meta_leads",
    select: "id,full_name,email,phone,bedrooms,budget,language,source,utm_source,utm_medium,utm_campaign,created_at",
  },
  koop_leads: {
    table: "koop_leads",
    select: "id,first_name,last_name,email,phone,city,budget,neighborhoods,property_type,min_bedrooms,min_sqm,mortgage_status,timeline,status,created_at",
  },
  valuation_leads: {
    table: "valuation_leads",
    select: "id,first_name,last_name,email,phone,address,postcode,city,neighborhood,surface_area,property_type,condition,energy_label,estimated_value_low,estimated_value_high,status,created_at",
  },
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff: StaffUser | null = await getStaffUser();
  if (!staff) redirect("/crm/login");

  const { id } = await params;
  const sb = supabaseAdmin();

  const { data: lead, error } = await sb
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    redirect("/crm/kanban");
  }

  let sourceData: Record<string, unknown> | null = null;
  const config = SOURCE_QUERIES[lead.source_type];
  if (config) {
    const { data } = await sb
      .from(config.table)
      .select(config.select)
      .eq("id", lead.source_id)
      .maybeSingle();
    sourceData = (data as unknown) as Record<string, unknown> | null;
  }

  const { data: events } = await sb
    .from("lead_events")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const pipeline = pipelineForType(lead.type);
  const { data: stages } = await sb
    .from("pipeline_stages")
    .select("*")
    .eq("pipeline", pipeline)
    .order("position", { ascending: true });

  const { data: teamMembers } = await sb
    .from("verkoop_staff_users")
    .select("phone_e164, display_name, role");

  return (
    <LeadDetailClient
      lead={lead}
      sourceData={sourceData}
      events={events ?? []}
      stages={stages ?? []}
      teamMembers={teamMembers ?? []}
      staff={staff}
    />
  );
}