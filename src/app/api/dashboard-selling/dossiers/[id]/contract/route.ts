import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { buildContractBlocks, type ContractBlock, type DossierLike } from "./contract-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

// David's signature image. Drop a transparent PNG here when David shares his
// real signature and it gets embedded automatically; until then the route
// falls back to a labelled placeholder box so the layout is identical.
const DAVID_SIG_PATH = path.join(process.cwd(), "otd", "david-signature.png");
const LOGO_PATH = path.join(process.cwd(), "public", "images", "site-logo.png");

// --- layout constants (A4, points) ---------------------------------------
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;
// Vertical space reserved on every page for the branded header / footer bands.
const HEADER_H = 40;
const FOOTER_H = 22;
// Palette mirrors the Apartmenthub website (src/index.css /
// dashboard-selling.module.css) so the contract looks on-brand.
const INK = rgb(0.102, 0.125, 0.173); // #1A202C  text-dark
const GREY = rgb(0.29, 0.333, 0.408); // #4A5568  text-gray
const TEAL = rgb(0, 0.608, 0.541); // #009B8A  primary-green
const TEAL_DARK = rgb(0, 0.478, 0.427); // #007A6D  primary-green-dark
const ORANGE = rgb(1, 0.49, 0.157); // #FF7D28  primary-orange
const SOFT_TEAL = rgb(0.91, 0.961, 0.953); // #E8F5F3  soft teal fill

function safeSegment(s: string | null | undefined): string {
  return (s ?? "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

// pdf-lib's standard fonts use WinAnsi encoding; characters outside it throw
// when drawn. The contract text is deliberately plain, but normalise a few
// likely unicode strays (smart quotes, dashes, arrows) to safe equivalents.
function sanitize(s: string): string {
  return s
    .replace(/[‘’′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[→←↑↓]/g, "")
    .replace(/•/g, "-")
    .replace(/ /g, " ")
    // Strip anything still outside the basic Latin-1 range as a last resort.
    .replace(/[^ -ÿ]/g, "");
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

type Run = { text: string; bold?: boolean };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: dossierId } = await params;
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") return NextResponse.json({ error: "forbidden_role" }, { status: 403 });

  const sb = supabaseAdmin();
  // select("*") to stay tolerant of legacy schemas missing signature columns;
  // every field below is null-checked. Mirrors the ZIP route's approach.
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

  const blocks = buildContractBlocks(d as DossierLike);

  // Signature data from the dossier. OTD is the upfront engagement signature
  // (what this contract is); fall back to the final-submit signature columns.
  const sigName: string | null =
    (d as { otd_signed_name?: string | null }).otd_signed_name ??
    (d as { signature_name?: string | null }).signature_name ??
    null;
  const sigAtRaw: string | null =
    (d as { otd_signed_at?: string | null }).otd_signed_at ??
    (d as { signed_at?: string | null }).signed_at ??
    null;
  const sigIp: string | null =
    (d as { otd_signed_ip?: string | null }).otd_signed_ip ??
    (d as { signed_ip?: string | null }).signed_ip ??
    null;
  const acceptanceCode: string | null =
    (d as { otd_acceptance_code?: string | null }).otd_acceptance_code ?? null;
  const sellerSigBytes = dataUrlToBytes(
    (d as { otd_signature_png?: string | null }).otd_signature_png ??
      (d as { signature_image?: string | null }).signature_image ??
      null
  );

  // --- build the PDF --------------------------------------------------------
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);

  let logoImg: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  try {
    const logoBytes = await fs.readFile(LOGO_PATH);
    logoImg = await pdf.embedPng(new Uint8Array(logoBytes));
  } catch {
    logoImg = null;
  }

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  // Content flows below the header band and stops above the footer band.
  let y = PAGE_H - MARGIN - HEADER_H;

  function newPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN - HEADER_H;
  }
  function ensure(space: number) {
    if (y - space < MARGIN + FOOTER_H) newPage();
  }

  // Wrap a list of styled runs into lines that fit `maxW`, then draw them.
  function drawRuns(
    runs: Run[],
    opts: { size: number; leading: number; indent?: number; color?: ReturnType<typeof rgb> }
  ) {
    const indent = opts.indent ?? 0;
    const maxW = CONTENT_W - indent;
    const color = opts.color ?? INK;
    // Tokenise into words tagged with their font, keeping spaces implicit.
    const words: Run[] = [];
    for (const r of runs) {
      const parts = sanitize(r.text).split(/(\s+)/);
      for (const part of parts) {
        if (part === "") continue;
        words.push({ text: part, bold: r.bold });
      }
    }
    let line: Run[] = [];
    let lineW = 0;
    const flush = () => {
      ensure(opts.leading);
      let x = MARGIN + indent;
      for (const w of line) {
        const f = w.bold ? fontB : font;
        page.drawText(w.text, { x, y, size: opts.size, font: f, color });
        x += f.widthOfTextAtSize(w.text, opts.size);
      }
      y -= opts.leading;
      line = [];
      lineW = 0;
    };
    for (const w of words) {
      const f = w.bold ? fontB : font;
      const ww = f.widthOfTextAtSize(w.text, opts.size);
      const isSpace = /^\s+$/.test(w.text);
      if (isSpace) {
        if (line.length === 0) continue; // no leading spaces on a line
        if (lineW + ww > maxW) {
          flush();
          continue;
        }
        line.push(w);
        lineW += ww;
        continue;
      }
      if (lineW + ww > maxW && line.length > 0) flush();
      line.push(w);
      lineW += ww;
    }
    if (line.some((w) => !/^\s+$/.test(w.text))) flush();
  }

  // Title header
  page.drawText("Opdracht tot Dienstverlening", { x: MARGIN, y, size: 19, font: fontB, color: TEAL });
  y -= 24;
  page.drawText(sanitize("Verkoopbemiddeling - Apartmenthub"), {
    x: MARGIN,
    y,
    size: 11,
    font,
    color: GREY,
  });
  y -= 18;
  // Brand divider: a short orange accent segment leading into the full teal rule.
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + 56, y },
    thickness: 2.5,
    color: ORANGE,
  });
  page.drawLine({
    start: { x: MARGIN + 56, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 1,
    color: TEAL,
  });
  y -= 22;

  // Body blocks
  for (const b of blocks as ContractBlock[]) {
    switch (b.type) {
      case "h": {
        y -= 8; // gap before heading
        ensure(20);
        drawRuns([{ text: b.text, bold: true }], { size: 12, leading: 17, color: TEAL_DARK });
        y -= 2;
        break;
      }
      case "lead":
        drawRuns([{ text: b.text }], { size: 9.5, leading: 13.5, color: GREY });
        y -= 6;
        break;
      case "p":
        drawRuns([{ text: b.text }], { size: 9.5, leading: 13.5 });
        y -= 5;
        break;
      case "li":
        drawRuns([{ text: "-  ", bold: true }, { text: b.text }], {
          size: 9.5,
          leading: 13.5,
          indent: 12,
        });
        y -= 2;
        break;
      case "field":
        drawRuns([{ text: `${b.label}:  `, bold: true }, { text: b.value }], {
          size: 9.5,
          leading: 14,
          indent: 10,
        });
        break;
      case "subhead":
        drawRuns([{ text: b.text, bold: true }], { size: 10, leading: 15 });
        break;
    }
  }

  // --- signature section ----------------------------------------------------
  // Reserve enough for the rule + heading + both signer boxes so the block is
  // never split across a page break.
  const SIG_BLOCK_H = 150;
  ensure(SIG_BLOCK_H + 90);
  y -= 16;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 1,
    color: TEAL,
  });
  y -= 22;
  drawRuns([{ text: "Ondertekening", bold: true }], { size: 13, leading: 18, color: TEAL_DARK });
  y -= 8;

  const colW = (CONTENT_W - 24) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 24;
  const boxTop = y;
  const boxH = 70;
  const labelGap = 14;

  // Helper to draw one signer column at a given x.
  async function drawSigner(
    x: number,
    role: string,
    image: Uint8Array | null,
    placeholderText: string | null,
    name: string,
    metaLines: string[]
  ) {
    let cy = boxTop;
    page.drawText(sanitize(role), { x, y: cy, size: 8.5, font: fontB, color: TEAL_DARK });
    cy -= labelGap;
    // signature box — soft-teal fill with a teal border, matching the site.
    const boxY = cy - boxH;
    page.drawRectangle({
      x,
      y: boxY,
      width: colW,
      height: boxH,
      borderColor: TEAL,
      borderWidth: 1,
      color: SOFT_TEAL,
    });
    if (image) {
      try {
        const png = await pdf.embedPng(image);
        const maxW = colW - 20;
        const maxH = boxH - 16;
        const scale = Math.min(maxW / png.width, maxH / png.height, 1);
        const w = png.width * scale;
        const h = png.height * scale;
        page.drawImage(png, { x: x + (colW - w) / 2, y: boxY + (boxH - h) / 2, width: w, height: h });
      } catch {
        // fall through to nothing — name line below still identifies the signer
      }
    } else if (placeholderText) {
      page.drawText(sanitize(placeholderText), {
        x: x + 10,
        y: boxY + boxH / 2 - 4,
        size: 9,
        font,
        color: rgb(0.6, 0.64, 0.7),
      });
    }
    cy = boxY - 14;
    page.drawText(sanitize(name), { x, y: cy, size: 10, font: fontB, color: INK });
    cy -= 13;
    for (const ml of metaLines) {
      page.drawText(sanitize(ml), { x, y: cy, size: 8, font, color: GREY });
      cy -= 11;
    }
  }

  // David (the agent) — placeholder image until his signature PNG is added.
  let davidImg: Uint8Array | null = null;
  try {
    const buf = await fs.readFile(DAVID_SIG_PATH);
    davidImg = new Uint8Array(buf);
  } catch {
    davidImg = null;
  }
  await drawSigner(
    leftX,
    "De makelaar (Apartmenthub)",
    davidImg,
    davidImg ? null : "[ handtekening volgt ]",
    "David van Wachem",
    ["Apartmenthub - namens de makelaar"]
  );

  // Seller — their captured signature + audit metadata.
  const sellerMeta: string[] = [];
  if (sigAtRaw) sellerMeta.push(`Ondertekend op: ${new Date(sigAtRaw).toLocaleString("nl-NL")}`);
  if (acceptanceCode) sellerMeta.push(`Aanvaardingscode: ${acceptanceCode}`);
  if (sigIp) sellerMeta.push(`IP: ${sigIp}`);
  if (!sellerSigBytes && sigName) sellerMeta.push("Getypte naam is rechtsgeldig (BW 3:15a).");
  await drawSigner(
    rightX,
    "De verkoper",
    sellerSigBytes,
    sellerSigBytes ? null : sigName ? null : "[ nog niet ondertekend ]",
    sigName ?? (d.naam as string) ?? "Verkoper",
    sellerMeta
  );

  // Branded header + footer bands (drawn after all pages exist so the page
  // total is known). Repeated on every page for an on-brand, on-letterhead feel.
  const pages = pdf.getPages();
  const total = pages.length;
  pages.forEach((pg, i) => {
    // --- header band -------------------------------------------------------
    const hTop = PAGE_H - MARGIN;
    if (logoImg) {
      const logoH = 16;
      const scale = logoH / logoImg.height;
      const logoW = logoImg.width * scale;
      const logoY = hTop - 2 - logoH;
      const textY = logoY + (logoH - 8.5) / 2;
      pg.drawImage(logoImg, { x: MARGIN, y: logoY, width: logoW, height: logoH });
      pg.drawText("Apartmenthub", { x: MARGIN + logoW + 5, y: textY, size: 12, font: fontB, color: TEAL });
    } else {
      pg.drawRectangle({ x: MARGIN, y: hTop - 11, width: 11, height: 11, color: TEAL });
      pg.drawRectangle({ x: MARGIN + 5.5, y: hTop - 5.5, width: 5.5, height: 5.5, color: ORANGE });
      pg.drawText("Apartmenthub", { x: MARGIN + 19, y: hTop - 9.5, size: 12, font: fontB, color: TEAL });
    }
    // Right-aligned context label.
    const hTag = sanitize("Verkoopbemiddeling - OTD");
    const hTagW = font.widthOfTextAtSize(hTag, 9);
    pg.drawText(hTag, { x: PAGE_W - MARGIN - hTagW, y: hTop - 8.5, size: 9, font, color: GREY });
    // Rule under the header.
    pg.drawLine({
      start: { x: MARGIN, y: hTop - 20 },
      end: { x: PAGE_W - MARGIN, y: hTop - 20 },
      thickness: 0.75,
      color: TEAL,
    });

    // --- footer band -------------------------------------------------------
    // Rule above the footer line, with a short orange accent lead-in.
    pg.drawLine({
      start: { x: MARGIN, y: MARGIN - 10 },
      end: { x: MARGIN + 40, y: MARGIN - 10 },
      thickness: 1.5,
      color: ORANGE,
    });
    pg.drawLine({
      start: { x: MARGIN + 40, y: MARGIN - 10 },
      end: { x: PAGE_W - MARGIN, y: MARGIN - 10 },
      thickness: 0.75,
      color: TEAL,
    });
    const label = sanitize("Apartmenthub - Opdracht tot Dienstverlening");
    pg.drawText(label, { x: MARGIN, y: 28, size: 7.5, font, color: GREY });
    const pageLabel = `Pagina ${i + 1} / ${total}`;
    const plW = font.widthOfTextAtSize(pageLabel, 7.5);
    pg.drawText(pageLabel, { x: PAGE_W - MARGIN - plW, y: 28, size: 7.5, font, color: GREY });
  });

  const pdfBytes = await pdf.save();

  // Audit the download alongside the existing zip_downloaded action.
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
