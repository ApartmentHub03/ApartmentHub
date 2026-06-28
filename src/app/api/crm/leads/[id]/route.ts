import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { pipelineForType } from "@/app/lib/crm-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = supabaseAdmin();
  const { data: lead, error } = await sb
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!lead) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

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

  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("leads")
    .select("id, type")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (body.stage !== undefined) {
    if (typeof body.stage !== "string" || !body.stage.trim()) {
      return NextResponse.json({ error: "invalid_stage" }, { status: 400 });
    }

    const pipeline = pipelineForType(existing.type as string);
    const { data: stages, error: stagesError } = await sb
      .from("pipeline_stages")
      .select("stage")
      .eq("pipeline", pipeline);

    if (stagesError) {
      return NextResponse.json({ error: stagesError.message }, { status: 500 });
    }

    const validStages = new Set((stages ?? []).map((s) => s.stage));
    if (validStages.size === 0) {
      return NextResponse.json(
        { error: "pipeline_not_configured", pipeline },
        { status: 500 }
      );
    }
    if (!validStages.has(body.stage)) {
      return NextResponse.json(
        { error: "invalid_stage", valid: Array.from(validStages) },
        { status: 400 }
      );
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