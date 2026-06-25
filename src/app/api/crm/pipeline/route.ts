import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const pipelineParam = new URL(req.url).searchParams.get("pipeline");
  const query = pipelineParam
    ? sb.from("pipeline_stages").select("*").eq("pipeline", pipelineParam).order("position", { ascending: true })
    : sb.from("pipeline_stages").select("*").order("pipeline").order("position", { ascending: true });

  const { data: stages, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stages: stages ?? [] });
}

export async function PATCH(req: NextRequest) {
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { stages: { id: string; label?: string; position?: number; color?: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.stages || !Array.isArray(body.stages)) {
    return NextResponse.json(
      { error: "stages array required" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();
  const updates = body.stages.map((s) =>
    sb
      .from("pipeline_stages")
      .update({
        ...(s.label !== undefined && { label: s.label }),
        ...(s.position !== undefined && { position: s.position }),
        ...(s.color !== undefined && { color: s.color }),
      })
      .eq("id", s.id)
      .select()
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors.map((e) => e.error?.message).join("; ") },
      { status: 500 }
    );
  }

  const updatedStages = results.map((r) => r.data?.[0]).filter(Boolean);

  return NextResponse.json({ stages: updatedStages });
}