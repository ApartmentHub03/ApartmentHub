import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: dossierId } = await params;
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("verkoop_inventory_links")
    .select("id, token, recipient_email, status, submitted_at, submitted_data, created_at, expires_at")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ links: data || [] });
}