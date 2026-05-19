import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getSession } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/verkoop/followup-answers
// Body: { answers: Record<string, string | boolean | null> }
// Persists the seller's responses to the AI-generated follow-up questions.
// Idempotent: each POST merges with prior answers (later writes win per key).
export async function POST(req: NextRequest) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { answers?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const answers = body.answers && typeof body.answers === "object" ? body.answers : null;
  if (!answers) return NextResponse.json({ error: "no_answers" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: dossier } = await sb
    .from("verkoop_dossiers")
    .select("id, ai_followup_answers")
    .eq("phone_e164", sess.phone_e164)
    .maybeSingle();
  if (!dossier) return NextResponse.json({ error: "no_dossier" }, { status: 404 });

  // Merge with prior answers so the seller can save the form multiple times.
  const prior =
    (dossier.ai_followup_answers as Record<string, unknown> | null) ?? {};
  const merged = { ...prior, ...answers };

  const { error } = await sb
    .from("verkoop_dossiers")
    .update({
      ai_followup_answers: merged,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", dossier.id);
  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  await sb.from("verkoop_audit").insert({
    dossier_id: dossier.id,
    actor: `seller:${sess.phone_e164}`,
    action: "ai_followups_answered",
    meta: { count: Object.keys(answers).length },
  });

  return NextResponse.json({ ok: true, count: Object.keys(merged).length });
}
