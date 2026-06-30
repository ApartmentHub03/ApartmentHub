"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DOC_KEYS, DOC_DESCRIPTIONS } from "@/app/lib/doc-descriptions";

export function RenameDocKeyButton({
  dossierId,
  fileId,
  currentKey,
  canEdit,
}: {
  dossierId: string;
  fileId: string;
  currentKey: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [selectedKey, setSelectedKey] = useState(currentKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) return null;

  const handleSave = async () => {
    if (selectedKey === currentKey) {
      setRenaming(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard-selling/dossiers/${dossierId}/files/${fileId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc_key: selectedKey }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Rename failed");
        return;
      }
      setRenaming(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!renaming) {
    return (
      <button
        onClick={() => setRenaming(true)}
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 6px",
          borderRadius: 4,
          border: "1px solid var(--line)",
          background: "#fff",
          color: "var(--grey-soft)",
          cursor: "pointer",
          marginLeft: 6,
          verticalAlign: "middle",
        }}
        title="Change document type"
      >
        Rename
      </button>
    );
  }

  return (
    <div style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <select
        value={selectedKey}
        onChange={(e) => setSelectedKey(e.target.value)}
        disabled={loading}
        style={{
          padding: "4px 8px",
          border: "1px solid var(--teal)",
          borderRadius: 6,
          fontSize: 12,
          minWidth: 200,
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
        onClick={handleSave}
        disabled={loading || selectedKey === currentKey}
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 6,
          border: "none",
          background: loading || selectedKey === currentKey ? "var(--grey-soft)" : "var(--teal)",
          color: "#fff",
          cursor: loading || selectedKey === currentKey ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "..." : "Save"}
      </button>
      <button
        onClick={() => { setRenaming(false); setSelectedKey(currentKey); setError(null); }}
        disabled={loading}
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid var(--line)",
          background: "#fff",
          color: "var(--ink)",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        Cancel
      </button>
      {error && <span style={{ fontSize: 11, color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}