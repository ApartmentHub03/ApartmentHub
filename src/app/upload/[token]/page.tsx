import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { DOC_DESCRIPTIONS } from "@/app/lib/doc-descriptions";
import { UploadClient } from "./client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

function detectLang(rawTaal: string | null, langParam: string | null, acceptLanguage: string | null): "nl" | "en" {
  // Priority: ?lang param > Accept-Language header > dossier taal > "nl"
  if (langParam === "en" || langParam === "nl") return langParam;
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(",")[0]?.split("-")[0]?.trim().toLowerCase();
    if (preferred === "en") return "en";
    if (preferred === "nl") return "nl";
  }
  return rawTaal === "en" ? "en" : "nl";
}

export default async function UploadPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const reqHeaders = await headers();
  const langParam = sp.lang ?? null;
  const acceptLanguage = reqHeaders.get("accept-language");
  const sb = supabaseAdmin();

  // Query without filters to distinguish revoked/expired from not-found
  const { data: rawLink } = await sb
    .from("verkoop_magic_links")
    .select("id, dossier_id, role, required_documents, recipient_name, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!rawLink) {
    return notFound();
  }

  if (rawLink.revoked_at || new Date(rawLink.expires_at).getTime() < Date.now()) {
    const linkLang = (() => {
      if (langParam === "en" || langParam === "nl") return langParam;
      if (acceptLanguage) {
        const preferred = acceptLanguage.split(",")[0]?.split("-")[0]?.trim().toLowerCase();
        if (preferred === "en") return "en";
        if (preferred === "nl") return "nl";
      }
      return "nl";
    })();

    return (
      <div style={{ maxWidth: 480, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#128274;</div>
        <h1 style={{ fontSize: 22, color: "#1A202C", marginBottom: 8 }}>
          {linkLang === "en" ? "Link expired or invalid" : "Link verlopen of ongeldig"}
        </h1>
        <p style={{ color: "#4A5568", fontSize: 14 }}>
          {rawLink.revoked_at
            ? (linkLang === "en" ? "This upload link has been revoked by the agent. Please contact them for a new link." : "Deze uploadlink is ingetrokken door de makelaar. Neem contact op voor een nieuwe link.")
            : (linkLang === "en" ? "This upload link has expired. Please contact your agent for a new link." : "Deze uploadlink is verlopen. Neem contact op met uw makelaar voor een nieuwe link.")
          }
        </p>
      </div>
    );
  }

  const link = rawLink;

  const { data: dossier } = await sb
    .from("verkoop_dossiers")
    .select("straat, postcode, woonplaats, taal")
    .eq("id", link.dossier_id)
    .maybeSingle();

  if (!dossier) {
    return notFound();
  }

  const address = [dossier.straat, dossier.postcode, dossier.woonplaats].filter(Boolean).join(", ");
  const lang = detectLang(dossier.taal, langParam, acceptLanguage);

  const docKeys: string[] = Array.isArray(link.required_documents) ? link.required_documents : [];

  const { data: existingFiles } = await sb
    .from("verkoop_files")
    .select("doc_key, filename, size_bytes")
    .eq("dossier_id", link.dossier_id)
    .eq("is_current", true)
    .in("doc_key", docKeys.length > 0 ? docKeys : ["__none__"]);

  const existingByDocKey = new Map(
    (existingFiles ?? []).map((f) => [f.doc_key, { filename: f.filename, size_bytes: f.size_bytes }])
  );

  const docs = docKeys.map((key) => {
    const desc = DOC_DESCRIPTIONS[key];
    const existing = existingByDocKey.get(key);
    return {
      key,
      label: lang === "en" ? (desc?.en ?? key) : (desc?.nl ?? key),
      uploaded: existingByDocKey.has(key),
      existingFile: existing ? { filename: existing.filename, size_bytes: existing.size_bytes } : undefined,
    };
  });

  const roleName: Record<string, { en: string; nl: string }> = {
    vve: { en: "Homeowners Association (VvE)", nl: "Vereniging van Eigenaars (VvE)" },
    notary: { en: "Notary", nl: "Notaris" },
    lawyer: { en: "Lawyer", nl: "Advocaat" },
    partner: { en: "Partner", nl: "Partner" },
    buyer: { en: "Buyer", nl: "Koper" },
    seller: { en: "Seller", nl: "Verkoper" },
  };

  const roleLabel = roleName[link.role]
    ? lang === "en"
      ? roleName[link.role].en
      : roleName[link.role].nl
    : link.role;

  return (
    <UploadClient
      token={token}
      address={address}
      role={link.role}
      roleLabel={roleLabel}
      recipientName={link.recipient_name}
      documents={docs}
      lang={lang}
      expiresAt={link.expires_at}
    />
  );
}