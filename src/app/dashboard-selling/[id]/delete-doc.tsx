"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard-selling.module.css";

export function DeleteDocButton({
  dossierId,
  fileId,
  filename,
  canEdit,
}: {
  dossierId: string;
  fileId: string;
  filename?: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy]);

  if (!canEdit) return null;

  async function confirmDelete() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/dashboard-selling/dossiers/${dossierId}/files/${fileId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        setErr(data.error || "Delete failed");
        setBusy(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setErr(null); setOpen(true); }}
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 6px",
          borderRadius: 4,
          border: "1px solid var(--danger)",
          background: "#fff",
          color: "var(--danger)",
          cursor: "pointer",
          marginLeft: 6,
          verticalAlign: "middle",
        }}
        title="Delete document"
      >
        Delete
      </button>

      {open && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-doc-title"
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
            <h3 id="delete-doc-title" className={styles.modalTitle}>
              Delete this document?
            </h3>
            <p className={styles.modalBody}>
              This will permanently remove{filename ? <> <strong>{filename}</strong></> : " this document"}. This action <strong>cannot be undone</strong>.
            </p>
            {err && <p className={styles.modalError}>{err}</p>}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ padding: "9px 16px" }}
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnPrimary} ${styles.btnDangerSolid}`}
                style={{ padding: "9px 18px" }}
                onClick={confirmDelete}
                disabled={busy}
              >
                {busy ? "Deleting\u2026" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}