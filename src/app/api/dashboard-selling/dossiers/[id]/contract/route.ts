import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import JSZip from "jszip";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { generateContract } from "./contract-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

const TEMPLATE_NL = path.join(process.cwd(), "public", "OTD_NL.pdf");
const TEMPLATE_EN = path.join(process.cwd(), "public", "Service-Agreement.pdf");

function safeSegment(s: string | null | undefined): string {
  return (s ?? "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: dossierId } = await params;
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") return NextResponse.json({ error: "forbidden_role" }, { status: 403 });

  const sb = supabaseAdmin();
  const { data: d, error: dossierErr } = await sb
    .from("verkoop_dossiers")
    .select("*")
    .eq("id", dossierId)
    .maybeSingle();
  if (dossierErr || !d) {
    return NextResponse.json(
      { error: "not_found", detail: dossierErr?.message?.slice(0, 200) ?? null },
      { status: 404 }
    );
  }

  const dossier = d as Record<string, unknown>;

  const [nlBytes, enBytes] = await Promise.all([
    generateContract(dossier, TEMPLATE_NL, "nl"),
    generateContract(dossier, TEMPLATE_EN, "en"),
  ]);

  const zip = new JSZip();
  zip.file("contract-NL.pdf", nlBytes);
  zip.file("contract-EN.pdf", enBytes);

  const archiveBuf = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });

  const sigName: string | null =
    dossier.otd_signed_name as string | null ??
    dossier.signature_name as string | null ??
    null;

  await sb.from("verkoop_audit").insert({
    dossier_id: d.id,
    actor: `staff:${staff.phone_e164}`,
    action: "contract_downloaded",
    meta: { signed: Boolean(sigName), bytes: (archiveBuf as ArrayBuffer).byteLength },
  });

  const shortId = String(d.id).slice(0, 8);
  const filename = `contract-${shortId}-${safeSegment(d.naam as string)}.zip`;

  return new NextResponse(archiveBuf, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String((archiveBuf as ArrayBuffer).byteLength),
      "Cache-Control": "no-store",
    },
  });
}