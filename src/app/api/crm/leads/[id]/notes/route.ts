import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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
  let body: { description?: string; meta?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.description?.trim()) {
    return NextResponse.json(
      { error: "description_required" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();

  // Verify the lead exists
  const { data: lead } = await sb
    .from("leads")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "lead_not_found" }, { status: 404 });
  }

  // Look up the staff user's auth.users id from verkoop_staff_users
  // We store the phone as actor identifier; for now we use the phone_e164
  const { data: event, error } = await sb
    .from("lead_events")
    .insert({
      lead_id: id,
      type: "note_added",
      description: body.description,
      meta: body.meta ?? {},
      client_visible: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event }, { status: 201 });
}