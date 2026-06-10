import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest) {
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  let body: { dossier_id?: string; content?: string; pinned?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { dossier_id, content, pinned } = body;
  if (!dossier_id || typeof dossier_id !== "string") {
    return NextResponse.json({ error: "missing_dossier_id" }, { status: 400 });
  }
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "missing_content" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("verkoop_notes")
    .insert({
      dossier_id,
      author: `staff:${staff.phone_e164}`,
      content: content.trim().slice(0, 5000),
      pinned: pinned === true,
    })
    .select("id, author, content, pinned, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  await sb.from("verkoop_audit").insert({
    dossier_id,
    actor: `staff:${staff.phone_e164}`,
    action: "note_added",
    meta: { note_id: data.id },
  });

  return NextResponse.json({ ok: true, ...data });
}

export async function DELETE(req: NextRequest) {
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  let body: { note_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.note_id) {
    return NextResponse.json({ error: "missing_note_id" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: note } = await sb
    .from("verkoop_notes")
    .select("id, dossier_id")
    .eq("id", body.note_id)
    .maybeSingle();
  if (!note) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await sb.from("verkoop_notes").delete().eq("id", body.note_id);
  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  await sb.from("verkoop_audit").insert({
    dossier_id: note.dossier_id,
    actor: `staff:${staff.phone_e164}`,
    action: "note_deleted",
    meta: { note_id: body.note_id },
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  let body: { note_id?: string; content?: string; pinned?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.note_id) {
    return NextResponse.json({ error: "missing_note_id" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.content === "string") updates.content = body.content.trim().slice(0, 5000);
  if (typeof body.pinned === "boolean") updates.pinned = body.pinned;

  const { data: note } = await sb
    .from("verkoop_notes")
    .select("id, dossier_id")
    .eq("id", body.note_id)
    .maybeSingle();
  if (!note) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data, error } = await sb
    .from("verkoop_notes")
    .update(updates)
    .eq("id", body.note_id)
    .select("id, author, content, pinned, created_at, updated_at")
    .single();
  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  await sb.from("verkoop_audit").insert({
    dossier_id: note.dossier_id,
    actor: `staff:${staff.phone_e164}`,
    action: "note_edited",
    meta: { note_id: body.note_id },
  });

  return NextResponse.json({ ok: true, ...data });
}