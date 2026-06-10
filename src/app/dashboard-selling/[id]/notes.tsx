"use client";

import { useState, useCallback } from "react";
import styles from "../dashboard-selling.module.css";

type Note = {
  id: string;
  author: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string | null;
};

function friendlyAuthor(actor: string): string {
  if (actor.startsWith("staff:")) return "Staff";
  if (actor.startsWith("agent:")) return "Agent";
  return actor;
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotesSection({
  dossierId,
  initialNotes,
  canEdit,
}: {
  dossierId: string;
  initialNotes: Note[];
  canEdit: boolean;
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addNote = useCallback(async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossier_id: dossierId, content: newContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add note");
        return;
      }
      setNotes((prev) => [data as Note, ...prev]);
      setNewContent("");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }, [dossierId, newContent]);

  const deleteNote = useCallback(
    async (noteId: string) => {
      try {
        const res = await fetch("/api/admin/notes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note_id: noteId }),
        });
        if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } catch {}
    },
    []
  );

  const togglePin = useCallback(
    async (noteId: string, currentPinned: boolean) => {
      try {
        const res = await fetch("/api/admin/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note_id: noteId, pinned: !currentPinned }),
        });
        const data = await res.json();
        if (res.ok) {
          setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, pinned: !currentPinned } : n)));
        }
      } catch {}
    },
    []
  );

  const saveEdit = useCallback(
    async (noteId: string) => {
      if (!editContent.trim()) return;
      try {
        const res = await fetch("/api/admin/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note_id: noteId, content: editContent.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          setNotes((prev) =>
            prev.map((n) => (n.id === noteId ? { ...n, content: editContent.trim(), updated_at: new Date().toISOString() } : n))
          );
          setEditingId(null);
        }
      } catch {}
    },
    [editContent]
  );

  const pinnedNotes = notes.filter((n) => n.pinned);
  const otherNotes = notes.filter((n) => !n.pinned);

  const renderNote = (n: Note) => (
    <li
      key={n.id}
      style={{
        padding: "12px 14px",
        marginBottom: 8,
        borderRadius: 10,
        border: `1px solid ${n.pinned ? "var(--teal)" : "var(--line)"}`,
        background: n.pinned ? "var(--soft)" : "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 12, color: "var(--grey-soft)" }}>
          {friendlyAuthor(n.author)} · {relativeTime(n.updated_at || n.created_at)}
          {n.updated_at && !n.pinned && <span style={{ marginLeft: 6, fontStyle: "italic" }}>(edited)</span>}
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className={styles.btnSecondary}
              style={{ fontSize: 11, padding: "3px 8px" }}
              onClick={() => togglePin(n.id, n.pinned)}
              title={n.pinned ? "Unpin" : "Pin"}
            >
              {n.pinned ? "📌" : "Pin"}
            </button>
            <button
              className={styles.btnSecondary}
              style={{ fontSize: 11, padding: "3px 8px" }}
              onClick={() => {
                setEditingId(n.id);
                setEditContent(n.content);
              }}
            >
              Edit
            </button>
            <button
              className={styles.btnSecondary}
              style={{ fontSize: 11, padding: "3px 8px", color: "var(--danger)" }}
              onClick={() => deleteNote(n.id)}
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {editingId === n.id ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 13,
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button className={styles.btnPrimary} style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => saveEdit(n.id)}>
              Save
            </button>
            <button className={styles.btnSecondary} style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{n.content}</div>
      )}
    </li>
  );

  return (
    <div className={styles.section}>
      <h2>Notes</h2>
      {canEdit && (
        <div style={{ marginBottom: 14 }}>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={2}
            placeholder="Add a note…"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 13,
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <button
            className={styles.btnPrimary}
            style={{ fontSize: 12, padding: "6px 14px", marginTop: 6 }}
            onClick={addNote}
            disabled={saving || !newContent.trim()}
          >
            {saving ? "Saving…" : "Add note"}
          </button>
          {error && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{error}</div>}
        </div>
      )}
      {pinnedNotes.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--teal)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Pinned
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {pinnedNotes.map(renderNote)}
          </ul>
        </>
      )}
      {otherNotes.length > 0 && (
        <>
          {pinnedNotes.length > 0 && (
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--grey-soft)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "12px 0 8px" }}>
              Other notes
            </div>
          )}
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {otherNotes.map(renderNote)}
          </ul>
        </>
      )}
      {notes.length === 0 && <div style={{ fontSize: 13, color: "var(--grey-soft)" }}>No notes yet.</div>}
    </div>
  );
}