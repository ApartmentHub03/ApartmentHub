import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { buildFieldMap } from "./contract-content";

export type DossierLike = {
  naam?: string | null;
  straat?: string | null;
  postcode?: string | null;
  telefoon?: string | null;
  phone_e164?: string | null;
  email?: string | null;
  taal?: string | null;
};

const DAVID_SIG_PATH = path.join(process.cwd(), "otd", "david-signature.png");

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

export async function generateContract(
  dossier: Record<string, unknown>,
  templatePath: string,
  lang: string,
): Promise<Uint8Array> {
  const d = dossier as DossierLike;
  const sellerSigBytes = dataUrlToBytes(
    dossier.otd_signature_png as string | null ??
    dossier.signature_image as string | null ??
    null
  );

  const templateBytes = await fs.readFile(templatePath);
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();

  const fieldMap = buildFieldMap(d, lang);
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

  let davidSigImg: Uint8Array | null = null;
  try {
    const buf = await fs.readFile(DAVID_SIG_PATH);
    davidSigImg = new Uint8Array(buf);
  } catch {
    davidSigImg = null;
  }

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

  form.flatten();
  return pdf.save();
}