import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { downloadFile } from "@/app/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

function safeSegment(s: string | null | undefined): string {
  return (s ?? "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id: dossierId } = await params;
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  const sb = supabaseAdmin();
  const { data: d, error: dossierErr } = await sb
    .from("verkoop_dossiers")
    .select(
      "id, naam, email, telefoon, phone_e164, taal, straat, postcode, woonplaats, vraagprijs, oplev_datum, motivatie, status, created_at, ai_summary, ai_prefilled, ai_followup_questions, ai_followup_answers, antwoorden"
    )
    .eq("id", dossierId)
    .maybeSingle();
  if (dossierErr || !d) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: files } = await sb
    .from("verkoop_files")
    .select("filename, blob_url, doc_key, mime_type, size_bytes, version")
    .eq("dossier_id", d.id)
    .eq("is_current", true)
    .order("uploaded_at", { ascending: true });

  const zip = new JSZip();

  // 1. ai_summary.md — readable handoff doc
  const summaryLines = Array.isArray((d as { ai_summary?: unknown }).ai_summary)
    ? ((d as { ai_summary?: unknown[] }).ai_summary as string[])
    : [];
  const followups =
    ((d as { ai_followup_questions?: unknown }).ai_followup_questions as
      | Record<string, unknown>
      | undefined) ?? null;
  const answers =
    ((d as { ai_followup_answers?: unknown }).ai_followup_answers as
      | Record<string, unknown>
      | undefined) ?? null;

  const md: string[] = [
    `# Dossier — ${d.naam}`,
    "",
    `- **Address:** ${d.straat}${d.woonplaats ? `, ${d.woonplaats}` : ""}`,
    `- **Postcode:** ${d.postcode}`,
    `- **Email:** ${d.email}`,
    `- **Phone:** ${d.telefoon ?? d.phone_e164 ?? "—"}`,
    `- **Language:** ${(d.taal ?? "nl").toUpperCase()}`,
    `- **Status:** ${d.status ?? "in_progress"}`,
    `- **Asking price:** ${d.vraagprijs ? `€ ${Number(d.vraagprijs).toLocaleString("en-US")}` : "—"}`,
    `- **Handover:** ${d.oplev_datum ?? "—"}`,
    `- **Created:** ${new Date(d.created_at).toLocaleString()}`,
    "",
    "## AI summary",
    summaryLines.length ? summaryLines.join("\n\n") : "_No AI summary generated yet._",
    "",
    "## Seller motivation",
    d.motivatie ?? "_None provided_",
    "",
    "## Follow-up answers",
  ];
  if (followups && Object.keys(followups).length) {
    Object.entries(followups).forEach(([qid, qtext]) => {
      md.push(`- **${String(qtext)}**`);
      md.push(`  - ${String(answers?.[qid] ?? "—")}`);
    });
  } else {
    md.push("_No follow-up questions generated yet._");
  }
  md.push("", "## Direct answers (raw)", "```json", JSON.stringify(d.antwoorden ?? {}, null, 2), "```");
  zip.file("ai_summary.md", md.join("\n"));

  // 2. each original file. `blob_url` is either:
  //    - a Supabase Storage path like "<dossier_id>/<doc_key>/<ts>_<name>" (new Block B uploads)
  //    - a full http(s) URL (legacy Vercel Blob), kept for backward compat
  const fileList: { name: string; size: number; ok: boolean; error?: string }[] = [];
  if (files) {
    for (const f of files) {
      try {
        let buf: Buffer;
        if (/^https?:\/\//i.test(f.blob_url)) {
          const res = await fetch(f.blob_url);
          if (!res.ok) throw new Error(`http_${res.status}`);
          buf = Buffer.from(await res.arrayBuffer());
        } else {
          const ab = await downloadFile(f.blob_url);
          if (!ab) throw new Error("storage_miss");
          buf = Buffer.from(ab);
        }
        const folder = safeSegment(f.doc_key) || "files";
        const dot = f.filename.lastIndexOf(".");
        const base = dot > 0 ? f.filename.slice(0, dot) : f.filename;
        const ext = dot > 0 ? f.filename.slice(dot) : "";
        const versioned = f.version && f.version > 1 ? `_v${f.version}` : "";
        zip.file(`${folder}/${base}${versioned}${ext}`, buf);
        fileList.push({ name: f.filename, size: buf.length, ok: true });
      } catch (err) {
        fileList.push({
          name: f.filename,
          size: 0,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // 3. manifest.json
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        dossier_id: d.id,
        seller: d.naam,
        address: `${d.straat}, ${d.woonplaats ?? ""}`,
        generated_at: new Date().toISOString(),
        generated_by: staff.phone_e164,
        files: fileList,
      },
      null,
      2
    )
  );

  const archiveBuf = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });

  // Audit
  await sb.from("verkoop_audit").insert({
    dossier_id: d.id,
    actor: `staff:${staff.phone_e164}`,
    action: "zip_downloaded",
    meta: { file_count: fileList.length, bytes: (archiveBuf as ArrayBuffer).byteLength },
  });

  const shortId = String(d.id).slice(0, 8);
  const filename = `dossier-${shortId}-${safeSegment(d.naam)}-${safeSegment(d.straat)}.zip`;

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
