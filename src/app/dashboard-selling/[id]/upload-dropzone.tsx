"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DOC_KEYS, DOC_DESCRIPTIONS } from "@/app/lib/doc-descriptions";
import styles from "../dashboard-selling.module.css";

type ClassificationResult = {
  doc_key: string;
  confidence: "high" | "medium" | "low";
  reason: string;
};

type UploadResult = {
  id: string;
  doc_key: string;
  version: number;
  classification: ClassificationResult | null;
  manuallyRenamed: boolean;
};

export function StaffUploadDropzone({
  dossierId,
  onUploaded,
}: {
  dossierId: string;
  onUploaded?: (result: { doc_key: string; version: number }) => void;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameKey, setRenameKey] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!deleteModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleting) setDeleteModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [deleteModalOpen, deleting]);

  const doUpload = useCallback(
    async (file: File) => {
      if (!file) return;
      setUploading(true);
      setError(null);
      setUploadResult(null);
      setRenaming(false);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(
          `/api/dashboard-selling/dossiers/${dossierId}/upload`,
          { method: "POST", body: fd }
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Upload failed");
          return;
        }
        const result: UploadResult = {
          id: data.id,
          doc_key: data.doc_key,
          version: data.version,
          classification: data.classification || null,
          manuallyRenamed: false,
        };
        setUploadResult(result);
        setRenameKey(data.doc_key);
        onUploaded?.({ doc_key: data.doc_key, version: data.version });
      } catch {
        setError("Network error");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [dossierId, onUploaded]
  );

  const handleRename = useCallback(async () => {
    if (!uploadResult || renameKey === uploadResult.doc_key) {
      setRenaming(false);
      return;
    }
    setRenameLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard-selling/dossiers/${dossierId}/files/${uploadResult.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc_key: renameKey }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.detail || "Rename failed");
        return;
      }
      setUploadResult((prev) =>
        prev
          ? { ...prev, doc_key: renameKey, classification: null, manuallyRenamed: true }
          : prev
      );
      setRenaming(false);
      router.refresh();
    } catch {
      setError("Network error renaming document");
    } finally {
      setRenameLoading(false);
    }
  }, [dossierId, uploadResult, renameKey, router]);

  const handleDelete = useCallback(async () => {
    if (!uploadResult) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard-selling/dossiers/${dossierId}/files/${uploadResult.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Delete failed");
        setDeleteModalOpen(false);
        return;
      }
      setUploadResult(null);
      setRenameKey("");
      setDeleteModalOpen(false);
      router.refresh();
    } catch {
      setError("Network error deleting document");
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [dossierId, uploadResult, router]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) doUpload(file);
    },
    [doUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) doUpload(file);
    },
    [doUpload]
  );

  const confidenceColors: Record<string, { bg: string; text: string; border: string }> = {
    high: { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC" },
    medium: { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
    low: { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" },
  };

  const confidenceLabels: Record<string, string> = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
  };

  return (
    <div style={{
      border: "1px solid var(--line)",
      borderRadius: 10,
      padding: 16,
      background: "#fff",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>
        Upload document
      </div>

      {uploadResult && !renaming ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "#FAFBFC",
            flexWrap: "wrap",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
              {DOC_DESCRIPTIONS[uploadResult.doc_key]?.en ?? uploadResult.doc_key}
            </span>
            {uploadResult.manuallyRenamed ? (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#E8E8E8",
                color: "#555",
                border: "1px solid #CCC",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                Manually set
              </span>
            ) : uploadResult.classification ? (
              <>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: confidenceColors[uploadResult.classification.confidence]?.bg,
                  color: confidenceColors[uploadResult.classification.confidence]?.text,
                  border: `1px solid ${confidenceColors[uploadResult.classification.confidence]?.border}`,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                  {confidenceLabels[uploadResult.classification.confidence]}
                </span>
                {uploadResult.classification.reason && (
                  <span style={{ fontSize: 11, color: "var(--grey-soft)", fontStyle: "italic" }}>
                    {uploadResult.classification.reason}
                  </span>
                )}
              </>
            ) : null}
            <button
              onClick={() => {
                setRenameKey(uploadResult.doc_key);
                setRenaming(true);
              }}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "#fff",
                color: "var(--ink)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Change type
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid var(--danger)",
                background: "#fff",
                color: "var(--danger)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Delete
            </button>
          </div>
          <button
            onClick={() => { setUploadResult(null); setRenameKey(""); setError(null); }}
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "var(--teal)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Upload another file
          </button>
        </div>
      ) : renaming && uploadResult ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--teal)",
            background: "#F0FFFE",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
              Change document type from &ldquo;{DOC_DESCRIPTIONS[uploadResult.doc_key]?.en ?? uploadResult.doc_key}&rdquo; to:
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={renameKey}
                onChange={(e) => setRenameKey(e.target.value)}
                disabled={renameLoading}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  fontSize: 13,
                  minWidth: 240,
                  background: "#fff",
                }}
              >
                {DOC_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {DOC_DESCRIPTIONS[k]?.en ?? k}
                  </option>
                ))}
              </select>
              <button
                onClick={handleRename}
                disabled={renameLoading || renameKey === uploadResult.doc_key}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: renameLoading || renameKey === uploadResult.doc_key ? "var(--grey-soft)" : "var(--teal)",
                  color: "#fff",
                  cursor: renameLoading || renameKey === uploadResult.doc_key ? "not-allowed" : "pointer",
                }}
              >
                {renameLoading ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => { setRenaming(false); setRenameKey(uploadResult.doc_key); setError(null); }}
                disabled={renameLoading}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "#fff",
                  color: "var(--ink)",
                  cursor: renameLoading ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!uploadResult && (
        <div
          onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          style={{
            border: dragOver && !uploading ? "2px dashed var(--teal)" : "2px dashed var(--line)",
            borderRadius: 10,
            padding: "24px 16px",
            textAlign: "center",
            cursor: uploading ? "not-allowed" : "pointer",
            background: dragOver && !uploading ? "var(--soft)" : uploading ? "#F0F0F0" : "#FAFBFC",
            opacity: uploading ? 0.6 : 1,
            transition: "background .12s, border-color .12s, opacity .12s",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.heic"
            onChange={handleFileInput}
            disabled={uploading}
            style={{ display: "none" }}
          />
          <div style={{ marginBottom: 6 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={uploading ? "#718096" : "#009B8A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: uploading ? "var(--grey-soft)" : "var(--ink)" }}>
            {uploading ? "Uploading & classifying..." : "Drop a file here or click to select"}
          </div>
          <div style={{ fontSize: 12, color: "var(--grey)", marginTop: 2 }}>
            PDF, images, HEIC — max 50 MB — AI will identify the document type
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger)" }}>{error}</div>
      )}

      {deleteModalOpen && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-upload-doc-title"
        >
          <div className={styles.modalCard}>
            <div className={styles.modalIcon} aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3 id="delete-upload-doc-title" className={styles.modalTitle}>
              Delete this document?
            </h3>
            <p className={styles.modalBody}>
              This will permanently remove the uploaded document. This action <strong>cannot be undone</strong>.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ padding: "9px 16px" }}
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnPrimary} ${styles.btnDangerSolid}`}
                style={{ padding: "9px 18px" }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting\u2026" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}