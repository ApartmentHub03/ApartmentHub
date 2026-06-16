import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { buildFieldMap } from "./contract-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type DossierLike = {
  naam?: string | null;
  straat?: string | null;
  postcode?: string | null;
  telefoon?: string | null;
  phone_e164?: string | null;
  email?: string | null;
  taal?: string | null;
};

type Params = { params: Promise<{ id: string }> };

const TEMPLATE_PATH = path.join(process.cwd(), "public", "OTD_NL.pdf");
const DAVID_SIG_PATH = path.join(process.cwd(), "otd", "david-signature.png");

function safeSegment(s: string | null | undefined): string {
  return (s ?? "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function dataUrlToBytes(s: string | null | undefined): Uint8Array | null {
  if (!s) return null;
  const match = s.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  const b64 = match ? match[1] : s.trim();
  try {
    const buf = Buffer.from(b64, "base64");
    return buf.length > 0 ? new Uint8Array(buf) : null;
  } catch {
    return null;
  }
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

  const sigName: string | null =
    (d as Record<string, unknown>).otd_signed_name as string | null ??
    (d as Record<string, unknown>).signature_name as string | null ??
    null;
  const sellerSigBytes = dataUrlToBytes(
    (d as Record<string, unknown>).otd_signature_png as string | null ??
      (d as Record<string, unknown>).signature_image as string | null ??
      null
  );

  const templateBytes = await fs.readFile(TEMPLATE_PATH);
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();

  const fieldMap = buildFieldMap(d as DossierLike);
  for (const [fieldName, value] of Object.entries(fieldMap)) {
    if (!value) continue;
    try {
      const field = form.getField(fieldName);
      if (field && "setText" in field) {
        (field as { setText: (t: string) => void }).setText(value);
      }
    } catch {
      // field doesn't exist in this template — skip
    }
  }

  // Stamp signatures on the last page
  const lastPage = pdf.getPages()[pdf.getPageCount() - 1];
  const { width: pageW, height: pageH } = lastPage.getSize();

  // Try to load David's signature
  let davidSigImg: Uint8Array | null = null;
  try {
    const buf = await fs.readFile(DAVID_SIG_PATH);
    davidSigImg = new Uint8Array(buf);
  } catch {
    davidSigImg = null;
  }

  // Signature positioning on the last page
  // David (makelaar) on the left, seller (verkoper) on the right
  const sigWidth = 180;
  const sigHeight = 60;
  const sigY = pageH * 0.18;
  const davidSigX = 54;
  const sellerSigX = pageW / 2 + 12;

  if (davidSigImg) {
    try {
      const png = await pdf.embedPng(davidSigImg);
      const scale = Math.min(sigWidth / png.width, sigHeight / png.height, 1);
      const w = png.width * scale;
      const h = png.height * scale;
      lastPage.drawImage(png, { x: davidSigX, y: sigY, width: w, height: h });
    } catch {
      // skip if PNG fails
    }
  }

  if (sellerSigBytes) {
    try {
      const png = await pdf.embedPng(sellerSigBytes);
      const scale = Math.min(sigWidth / png.width, sigHeight / png.height, 1);
      const w = png.width * scale;
      const h = png.height * scale;
      lastPage.drawImage(png, { x: sellerSigX, y: sigY, width: w, height: h });
    } catch {
      // skip if PNG fails
    }
  }

  // Flatten the form so the PDF is not editable
  form.flatten();

  const pdfBytes = await pdf.save();

  await sb.from("verkoop_audit").insert({
    dossier_id: d.id,
    actor: `staff:${staff.phone_e164}`,
    action: "contract_downloaded",
    meta: { signed: Boolean(sigName), bytes: pdfBytes.length },
  });

  const shortId = String(d.id).slice(0, 8);
  const filename = `contract-${shortId}-${safeSegment(d.naam as string)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBytes.length),
      "Cache-Control": "no-store",
    },
  });
}