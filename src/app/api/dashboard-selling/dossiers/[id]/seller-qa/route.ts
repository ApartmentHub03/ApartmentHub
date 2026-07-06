import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type SellerQ = { id: string; question: string; if_yes?: string | null };

function safeSegment(s: string | null | undefined): string {
  return (s ?? "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 60;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

function formatAnswer(raw: unknown): { yn: string | null; note: string; label: string } {
  if (raw == null) return { yn: null, note: "", label: "Awaiting seller response" };
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const yn = typeof obj.yn === "string" ? obj.yn : null;
    const note = typeof obj.note === "string" ? obj.note : "";
    if (yn === "ja") return { yn, note, label: "Yes" };
    if (yn === "nee") return { yn, note, label: "No" };
    if (yn === "notes") return { yn, note, label: note ? "Notes" : "Notes" };
    return { yn, note, label: yn };
  }
  if (typeof raw === "string") return { yn: raw, note: "", label: raw };
  return { yn: null, note: "", label: String(raw) };
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function drawBadge(
  page: PDFPage,
  x: number,
  y: number,
  label: string,
  bgColor: ReturnType<typeof rgb>,
  textColor: ReturnType<typeof rgb>,
  font: PDFFont,
  fontSize: number,
  paddingH: number,
  paddingV: number
): number {
  const textWidth = font.widthOfTextAtSize(label, fontSize);
  const boxWidth = textWidth + paddingH * 2;
  const boxHeight = fontSize + paddingV * 2;

  page.drawRectangle({
    x,
    y: y - paddingV,
    width: boxWidth,
    height: boxHeight,
    color: bgColor,
  });

  page.drawText(label, {
    x: x + paddingH,
    y: y + fontSize * 0.05,
    size: fontSize,
    font,
    color: textColor,
  });

  return boxHeight;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id: dossierId } = await params;
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

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

  const followups =
    ((d as { ai_followup_questions?: unknown }).ai_followup_questions as
      | Record<string, unknown>
      | undefined) ?? null;
  const answers =
    ((d as { ai_followup_answers?: unknown }).ai_followup_answers as
      | Record<string, unknown>
      | undefined) ?? null;

  const sellerQuestions: SellerQ[] = Array.isArray(
    (followups as { seller_questions?: unknown[] } | null)?.seller_questions
  )
    ? ((followups as { seller_questions: unknown[] }).seller_questions as SellerQ[])
    : [];

  const sellerAnswers = answers ?? {};

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("Seller Follow-up Q&A");
  pdfDoc.setSubject(`Q&A for ${d.naam}`);
  pdfDoc.setCreator("ApartmentHub");

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  function ensureSpace(needed: number): void {
    if (y - needed < MARGIN_BOTTOM) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
  }

  // Title
  page.drawText("Seller Follow-up Q&A", {
    x: MARGIN_LEFT,
    y,
    size: 22,
    font: helveticaBold,
    color: rgb(0.1, 0.13, 0.17),
  });
  y -= 34;

  // Separator line
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 1.5,
    color: rgb(0.0, 0.61, 0.54),
  });
  y -= 20;

  // Metadata block
  const metaFontSize = 11;
  const metaLines: [string, string][] = [
    ["Seller", d.naam ?? "\u2014"],
    ["Address", `${d.straat ?? ""}${d.woonplaats ? `, ${d.woonplaats}` : ""}`],
    ["Postcode", d.postcode ?? "\u2014"],
    ["Email", d.email ?? "\u2014"],
    ["Phone", d.telefoon ?? d.phone_e164 ?? "\u2014"],
    ["Language", (d.taal ?? "nl").toUpperCase()],
    ["Status", d.status ?? "in_progress"],
    ["Asking price", d.vraagprijs ? `\u20AC ${Number(d.vraagprijs).toLocaleString("en-US")}` : "\u2014"],
    ["Generated", new Date().toLocaleString()],
  ];

  const labelWidth = 100;
  for (const [label, value] of metaLines) {
    ensureSpace(metaFontSize + 6);
    page.drawText(label, {
      x: MARGIN_LEFT,
      y,
      size: metaFontSize,
      font: helveticaBold,
      color: rgb(0.29, 0.33, 0.41),
    });
    page.drawText(value, {
      x: MARGIN_LEFT + labelWidth,
      y,
      size: metaFontSize,
      font: helvetica,
      color: rgb(0.1, 0.13, 0.17),
    });
    y -= metaFontSize + 6;
  }

  y -= 8;

  // Separator
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 0.5,
    color: rgb(0.88, 0.91, 0.94),
  });
  y -= 24;

  // Questions
  if (sellerQuestions.length === 0) {
    ensureSpace(20);
    page.drawText("No follow-up questions generated yet.", {
      x: MARGIN_LEFT,
      y,
      size: 12,
      font: helvetica,
      color: rgb(0.45, 0.50, 0.56),
    });
  } else {
    let answeredCount = 0;
    let yesCount = 0;
    let noCount = 0;

    for (let i = 0; i < sellerQuestions.length; i++) {
      const q = sellerQuestions[i];
      const a = formatAnswer(sellerAnswers[q.id]);
      const isAnswered = a.yn === "ja" || a.yn === "nee" || a.yn === "notes";
      if (isAnswered) answeredCount++;
      if (a.yn === "ja") yesCount++;
      if (a.yn === "nee") noCount++;

      // Question number + text
      const qText = `${i + 1}. ${q.question}`;
      const qLines = wrapText(qText, helveticaBold, 13, CONTENT_WIDTH);

      const estimatedHeight = qLines.length * 18 + 28 + (a.note ? 20 : 0) + 24;
      ensureSpace(Math.min(estimatedHeight, 100));

      for (const line of qLines) {
        ensureSpace(18);
        page.drawText(line, {
          x: MARGIN_LEFT,
          y,
          size: 13,
          font: helveticaBold,
          color: rgb(0.1, 0.13, 0.17),
        });
        y -= 18;
      }

      y -= 4;

      // Badge colors
      let badgeBg: ReturnType<typeof rgb>;
      let badgeColor: ReturnType<typeof rgb>;
      if (a.yn === "ja") {
        badgeBg = rgb(0.86, 0.96, 0.91);
        badgeColor = rgb(0.08, 0.50, 0.24);
      } else if (a.yn === "nee") {
        badgeBg = rgb(1.0, 0.89, 0.89);
        badgeColor = rgb(0.71, 0.14, 0.09);
      } else if (a.yn === "notes") {
        badgeBg = rgb(1.0, 0.95, 0.90);
        badgeColor = rgb(0.90, 0.42, 0.10);
      } else {
        badgeBg = rgb(0.95, 0.96, 0.97);
        badgeColor = rgb(0.44, 0.50, 0.56);
      }

      const badgeLabel = a.yn === "ja" ? "YES" : a.yn === "nee" ? "NO" : a.yn === "notes" ? "NOTES" : "AWAITING";
      ensureSpace(24);
      const badgeH = drawBadge(
        page,
        MARGIN_LEFT,
        y,
        badgeLabel,
        badgeBg,
        badgeColor,
        helveticaBold,
        10,
        8,
        4
      );
      y -= badgeH + 6;

      // Answer text below badge (for Notes where label differs)
      if (isAnswered && a.label && a.label !== badgeLabel && a.label !== "Notes") {
        ensureSpace(16);
        page.drawText(a.label, {
          x: MARGIN_LEFT,
          y,
          size: 12,
          font: helvetica,
          color: rgb(0.29, 0.33, 0.41),
        });
        y -= 16;
      }

      // Note
      if (a.note) {
        const noteLines = wrapText(a.note, helvetica, 11, CONTENT_WIDTH - 20);
        for (const line of noteLines) {
          ensureSpace(15);
          page.drawText(line, {
            x: MARGIN_LEFT + 20,
            y,
            size: 11,
            font: helvetica,
            color: rgb(0.29, 0.33, 0.41),
          });
          y -= 15;
        }
      }

      y -= 16;
    }

    // Footer stats
    y -= 8;
    ensureSpace(60);
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: rgb(0.88, 0.91, 0.94),
    });
    y -= 20;

    page.drawText(`${answeredCount} of ${sellerQuestions.length} questions answered`, {
      x: MARGIN_LEFT,
      y,
      size: 11,
      font: helveticaBold,
      color: rgb(0.1, 0.13, 0.17),
    });
    y -= 18;

    const stats: string[] = [];
    if (yesCount > 0) stats.push(`Yes: ${yesCount}`);
    if (noCount > 0) stats.push(`No: ${noCount}`);
    const notesCount = answeredCount - yesCount - noCount;
    if (notesCount > 0) stats.push(`Notes: ${notesCount}`);
    const awaiting = sellerQuestions.length - answeredCount;
    if (awaiting > 0) stats.push(`Awaiting: ${awaiting}`);

    if (stats.length > 0) {
      page.drawText(stats.join("    "), {
        x: MARGIN_LEFT,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.45, 0.50, 0.56),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();

  await sb.from("verkoop_audit").insert({
    dossier_id: d.id,
    actor: `staff:${staff.phone_e164}`,
    action: "seller_qa_pdf_downloaded",
    meta: { question_count: sellerQuestions.length },
  });

  const shortId = String(d.id).slice(0, 8);
  const filename = `seller-qa-${shortId}-${safeSegment(d.naam)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}