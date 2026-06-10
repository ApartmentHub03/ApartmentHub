"use client";

import { useState, useRef } from "react";
import styles from "./upload.module.css";

type DocSlot = {
  key: string;
  label: string;
  uploaded: boolean;
  existingFile?: { filename: string; size_bytes: number };
};

export function UploadClient({
  token,
  address,
  role,
  roleLabel,
  recipientName,
  documents,
  lang,
  expiresAt,
}: {
  token: string;
  address: string;
  role: string;
  roleLabel: string;
  recipientName: string | null;
  lang: "nl" | "en";
  documents: DocSlot[];
  expiresAt: string;
}) {
  const [slots, setSlots] = useState<DocSlot[]>(documents);
  const [uploads, setUploads] = useState<
    Record<string, { file: File; progress: number; status: "pending" | "uploading" | "done" | "error"; error?: string }>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocKey, setSelectedDocKey] = useState<string>("");

  const isNl = lang === "nl";
  const expiresDate = new Date(expiresAt).toLocaleDateString(isNl ? "nl-NL" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isUploading = Object.values(uploads).some((u) => u.status === "uploading");

  const neededDocs = slots.filter((s) => !s.uploaded);
  const allUploaded = neededDocs.length === 0;

  async function uploadFile(docKey: string, file: File) {
    setUploads((prev) => ({
      ...prev,
      [docKey]: { file, progress: 0, status: "uploading" },
    }));

    const form = new FormData();
    form.append("doc_key", docKey);
    form.append("file", file);

    try {
      const res = await fetch(`/api/magic/${token}/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploads((prev) => ({
          ...prev,
          [docKey]: { ...prev[docKey], status: "error", error: data.error || "Upload failed" },
        }));
        return;
      }

      setSlots((prev) =>
        prev.map((s) => (s.key === docKey ? { ...s, uploaded: true } : s))
      );
      setUploads((prev) => ({
        ...prev,
        [docKey]: { ...prev[docKey], progress: 100, status: "done" },
      }));
    } catch {
      setUploads((prev) => ({
        ...prev,
        [docKey]: { ...prev[docKey], status: "error", error: "Network error" },
      }));
    }
  }

  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;

    if (selectedDocKey) {
      uploadFile(selectedDocKey, files[0]);
      setSelectedDocKey("");
      return;
    }

    for (const file of Array.from(files)) {
      const name = file.name.toLowerCase();
      let matched = false;
      for (const slot of slots) {
        if (slot.uploaded) continue;
        const upload = uploads[slot.key];
        if (upload && upload.status !== "error") continue;
        const patterns: Record<string, string[]> = {
          mjop: ["mjop"],
          notulen: ["notulen", "verslag"],
          jaarrekening: ["jaarrekening", "jr"],
          reservefonds: ["reserve", "fonds"],
          opstal: ["opstal"],
          splitsingsakte: ["splitsing", "splitsingsakte"],
          leveringsakte: ["levering", "leveringsakte"],
          kvk: ["kvk"],
          hypotheek: ["hypotheek"],
          erfpacht: ["erfpacht"],
          garanties: ["garantie"],
          "cv-onderhoud": ["cv", "onderhoud", "ketel"],
          zonnepanelen: ["zonnepanelen", "solar", "pv"],
          vergunningen: ["vergunning", "omgevings"],
          bouwtekeningen: ["bouwtekening", "tekening"],
          asbest: ["asbest"],
          fundering: ["fundering", "kcaf"],
          seller_id_masked: ["kopieid", "kopie-id", "id_masked"],
        };
        const keywords = patterns[slot.key] ?? [slot.key];
        if (keywords.some((kw) => name.includes(kw))) {
          uploadFile(slot.key, file);
          matched = true;
          break;
        }
      }
      if (!matched && files.length === 1 && neededDocs.length === 1) {
        uploadFile(neededDocs[0].key, file);
      }
    }
  }

  const pendingCount = slots.filter((s) => s.uploaded).length;
  const totalCount = slots.length;
  const showSuccess = allUploaded && Object.values(uploads).some((u) => u.status === "done");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <img src="/images/5a9afd14-27a5-40d8-a185-fac727f64fdf.png" alt="" className={styles.headerLogo} />
            <span className={styles.brandText}>ApartmentHub</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 500, letterSpacing: "0.02em" }}>
            {isNl ? "Veilig uploaden" : "Secure upload"}
          </span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.infoCard}>
          <span className={styles.roleBadge}>{roleLabel}</span>
          <h1 className={styles.title}>
            {isNl ? "Documenten uploaden" : "Upload documents"}
          </h1>
          <p className={styles.address}>{address}</p>
          {recipientName && (
            <p className={styles.recipient}>
              {isNl ? "Voor" : "For"}: {recipientName}
            </p>
          )}
          <p className={styles.expires}>
            {isNl ? "Link geldig tot" : "Link valid until"}: {expiresDate}
          </p>
        </div>

        {showSuccess && (
          <div className={styles.successCard}>
            <div className={styles.successIcon}>&#10003;</div>
            <h2>{isNl ? "Bedankt!" : "Thank you!"}</h2>
            <p>{isNl ? "ApartmentHub heeft uw documenten ontvangen." : "ApartmentHub has received your documents."}</p>
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {isNl ? "Gevraagde documenten" : "Required documents"} ({pendingCount}/{totalCount})
          </h2>
          <ul className={styles.docList}>
            {slots.map((slot) => {
              const upload = uploads[slot.key];
              return (
                <li key={slot.key} className={`${styles.docItem} ${slot.uploaded ? styles.docUploaded : ""}`}>
                  <span className={styles.docStatus}>
                    {slot.uploaded ? (
                      <span className={styles.checkIcon}>&#10003;</span>
                    ) : upload?.status === "uploading" ? (
                      <span className={styles.spinner} />
                    ) : upload?.status === "error" ? (
                      <span className={styles.errorIcon}>&#10007;</span>
                    ) : (
                      <span className={styles.pendingIcon}>&#9675;</span>
                    )}
                  </span>
                  <span className={styles.docLabel}>
                    {slot.label}
                    {slot.existingFile && (
                      <span className={styles.existingFile}>
                        &nbsp;({slot.existingFile.filename}, {Math.round((slot.existingFile.size_bytes || 0) / 1024)} KB)
                      </span>
                    )}
                  </span>
                  {upload?.status === "uploading" && (
                    <span className={styles.progressLabel}>
                      {isNl ? "Bezig met uploaden..." : "Uploading..."}
                    </span>
                  )}
                  {upload?.status === "error" && (
                    <span className={styles.errorLabel}>{upload.error}</span>
                  )}
                  {upload?.status === "done" && !slot.uploaded && (
                    <span className={styles.replacingLabel}>
                      ({isNl ? "vervangen" : "replacing"})
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {neededDocs.length > 0 && (
          <div className={styles.section} style={{ opacity: isUploading ? 0.5 : 1, pointerEvents: isUploading ? "none" : "auto", transition: "opacity 0.15s" }}>
            <h2 className={styles.sectionTitle}>
              {isNl ? "Document toevoegen" : "Add document"}
            </h2>
            <div className={styles.uploadForm}>
              <select
                className={styles.docSelect}
                value={selectedDocKey}
                onChange={(e) => setSelectedDocKey(e.target.value)}
                disabled={isUploading}
              >
                <option value="">{isNl ? "Kies documenttype..." : "Select document type..."}</option>
                {neededDocs
                  .filter((s) => {
                    const u = uploads[s.key];
                    return !u || u.status === "error";
                  })
                  .map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
              </select>

              <div
                className={`${styles.dropzone}${!selectedDocKey && !isUploading ? ` ${styles.dropzoneDisabled}` : ""}`}
                onClick={() => {
                  if (selectedDocKey && !isUploading) fileInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!selectedDocKey) e.dataTransfer.dropEffect = "none";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (selectedDocKey && !isUploading) handleFileSelect(e.dataTransfer.files);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  disabled={isUploading}
                />
                <div className={styles.dropzoneIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#009B8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className={styles.dropzoneText}>
                  {isUploading
                    ? (isNl ? "Bezig met uploaden..." : "Uploading...")
                    : !selectedDocKey
                      ? (isNl ? "Selecteer eerst een documenttype" : "Select a document type first")
                      : (isNl ? "Sleep bestanden hierheen of klik om te selecteren" : "Drag files here or click to select")}
                </p>
                <p className={styles.dropzoneHint}>
                  {isNl ? "PDF, afbeeldingen, Office-bestanden — max 50 MB" : "PDF, images, Office files — max 50 MB"}
                </p>
              </div>
            </div>

            {isUploading && (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        ApartmentHub Makelaardij &middot; Amsterdam
      </footer>
    </div>
  );
}