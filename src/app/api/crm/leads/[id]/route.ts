import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STAGES = [
  "new", "phone_call", "intake_scheduled", "document_completed",
  "viewing", "negotiation", "deal_done", "deal_failed",
  "new_lead", "first_call", "need_qualified", "making_offer",
  "deal_won", "scheduled_viewing", "deal_closed",
  "qualified", "portal_invited", "documents_complete", "active",
  "offer_negotiation", "closed_won", "closed_lost",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.stage !== undefined) {
    if (typeof body.stage !== "string" || !VALID_STAGES.includes(body.stage)) {
      return NextResponse.json({ error: "invalid_stage" }, { status: 400 });
    }
    updates.stage = body.stage;
  }
  if (body.assignee_id !== undefined) {
    updates.assignee_id = body.assignee_id || null;
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "no_fields_to_update" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ lead: data });
}