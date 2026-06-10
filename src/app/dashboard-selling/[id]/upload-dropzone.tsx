"use client";

import { useState, useCallback, useRef } from "react";
import styles from "../dashboard-selling.module.css";
import { DOC_KEYS, DOC_DESCRIPTIONS } from "@/app/lib/doc-descriptions";

export function StaffUploadDropzone({
  dossierId,
  onUploaded,
}: {
  dossierId: string;
  onUploaded?: (result: { doc_key: string; version: number }) => void;
}) {
  const [selectedKey, setSelectedKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback(
    async (file: File) => {
      if (!file || !selectedKey) return;
      setUploading(true);
      setError(null);
      setSuccess(null);
      try {
        const fd = new FormData();
        fd.append("doc_key", selectedKey);
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
        setSuccess(`${file.name} uploaded as ${DOC_DESCRIPTIONS[selectedKey]?.en ?? selectedKey}`);
        onUploaded?.({ doc_key: selectedKey, version: data.version });
      } catch {
        setError("Network error");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [dossierId, selectedKey, onUploaded]
  );

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

  const canUpload = !!selectedKey && !uploading;

  return (
    <div style={{
      border: "1px solid var(--line)",
      borderRadius: 10,
      padding: 16,
      background: "#fff",
      opacity: uploading ? 0.6 : 1,
      pointerEvents: uploading ? "none" : "auto",
      transition: "opacity 0.15s",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>
        Upload document
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          disabled={uploading}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            fontSize: 13,
            minWidth: 200,
            background: "#fff",
          }}
        >
          <option value="">Select document type…</option>
          {DOC_KEYS.map((k) => (
            <option key={k} value={k}>
              {DOC_DESCRIPTIONS[k]?.en ?? k}
            </option>
          ))}
        </select>
      </div>
      <div
        onClick={() => { if (canUpload) fileInputRef.current?.click(); }}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (canUpload) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        style={{
          border: dragOver && canUpload ? "2px dashed var(--teal)" : "2px dashed var(--line)",
          borderRadius: 10,
          padding: "24px 16px",
          textAlign: "center",
          cursor: canUpload ? "pointer" : "not-allowed",
          background: dragOver && canUpload ? "var(--soft)" : canUpload ? "#FAFBFC" : "#F0F0F0",
          opacity: canUpload ? 1 : 0.5,
          transition: "background .12s, border-color .12s, opacity .12s",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          onChange={handleFileInput}
          disabled={!canUpload}
          style={{ display: "none" }}
        />
        <div style={{ marginBottom: 6 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={canUpload ? "#009B8A" : "#718096"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: canUpload ? "var(--ink)" : "var(--grey-soft)" }}>
          {uploading ? "Uploading…" : !selectedKey ? "Select a document type first" : "Drag file here or click to select"}
        </div>
        <div style={{ fontSize: 12, color: "var(--grey)", marginTop: 2 }}>
          PDF, images, HEIC — max 50 MB
        </div>
      </div>
      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger)" }}>{error}</div>
      )}
      {success && !uploading && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--ok)" }}>{success}</div>
      )}
    </div>
  );
}