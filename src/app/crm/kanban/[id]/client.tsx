"use client";

import { useState } from "react";
import { useUpdateLead, useAddNote, fullName, relativeTime, LEAD_TYPE_LABELS } from "@/hooks/useKanbanQueries";
import type { Lead, PipelineStage, TeamMember, LeadEvent } from "@/hooks/useKanbanQueries";
import type { StaffUser } from "@/app/lib/auth";
import styles from "./lead-detail.module.css";

export function LeadDetailClient({
  lead,
  sourceData,
  events,
  stages,
  teamMembers,
  staff,
}: {
  lead: Lead;
  sourceData: Record<string, unknown> | null;
  events: LeadEvent[];
  stages: PipelineStage[];
  teamMembers: TeamMember[];
  staff: StaffUser;
}) {
  const updateLead = useUpdateLead();
  const addNote = useAddNote();
  const [note, setNote] = useState("");
  const [selectedStage, setSelectedStage] = useState(lead.stage);

  function handleStageChange(newStage: string) {
    setSelectedStage(newStage);
    updateLead.mutate({ id: lead.id, stage: newStage });
  }

  function handleNoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    addNote.mutate(
      { leadId: lead.id, description: note.trim() },
      {
        onSuccess: () => setNote(""),
      }
    );
  }

  function formatSourceData(data: Record<string, unknown>): { label: string; value: string }[] {
    return Object.entries(data)
      .filter(([, v]) => v !== null && v !== undefined)
      .filter(([k]) => !["id", "created_at"].includes(k))
      .map(([k, v]) => ({
        label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: Array.isArray(v) ? v.join(", ") : String(v),
      }));
  }

  const stageColor = stages.find((s) => s.stage === lead.stage)?.color || "#718096";

  return (
    <div className={styles.root}>
      <a href="/crm/kanban" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back to board
      </a>

      <div className={styles.grid}>
        <div className={styles.main}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.name}>{fullName(lead)}</h1>
              <div className={styles.meta}>
                <span className={styles.typeBadge} style={{ background: typeColor(lead.type) }}>
                  {LEAD_TYPE_LABELS[lead.type] || lead.type}
                </span>
                <span className={styles.stageBadge} style={{ background: stageColor }}>
                  {stages.find((s) => s.stage === lead.stage)?.label || lead.stage}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact</h2>
            {lead.email && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Email</span>
                <a href={`mailto:${lead.email}`} className={styles.fieldValue}>{lead.email}</a>
              </div>
            )}
            {lead.phone && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Phone</span>
                <a href={`tel:${lead.phone}`} className={styles.fieldValue}>{lead.phone}</a>
              </div>
            )}
            {lead.address && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Address</span>
                <span className={styles.fieldValue}>{lead.address}{lead.city ? `, ${lead.city}` : ""}</span>
              </div>
            )}
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Created</span>
              <span className={styles.fieldValue}>{new Date(lead.created_at).toLocaleString()}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Source</span>
              <span className={styles.fieldValue}>{lead.source_type} / {lead.source}</span>
            </div>
          </div>

          {sourceData && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Details</h2>
              {formatSourceData(sourceData).map(({ label, value }) => (
                <div key={label} className={styles.field}>
                  <span className={styles.fieldLabel}>{label}</span>
                  <span className={styles.fieldValue}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Stage</h2>
            <div className={styles.stageButtons}>
              {stages.map((s) => (
                <button
                  key={s.stage}
                  className={`${styles.stageBtn} ${selectedStage === s.stage ? styles.stageBtnActive : ""}`}
                  style={{ borderColor: s.color || "#718096" }}
                  onClick={() => handleStageChange(s.stage)}
                  disabled={staff.role === "viewer" || updateLead.isPending}
                >
                  <span className={styles.stageDot} style={{ background: s.color || "#718096" }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Assign</h2>
            <select
              className={styles.assignSelect}
              value={lead.assignee_id || ""}
              onChange={(e) => updateLead.mutate({ id: lead.id, assignee_id: e.target.value || null })}
              disabled={staff.role === "viewer"}
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name || m.user_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Notes</h2>
            <form onSubmit={handleNoteSubmit} className={styles.noteForm}>
              <textarea
                className={styles.noteInput}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                rows={3}
                disabled={staff.role === "viewer"}
              />
              <button
                type="submit"
                className={styles.noteSubmit}
                disabled={!note.trim() || staff.role === "viewer" || addNote.isPending}
              >
                {addNote.isPending ? "Saving..." : "Add note"}
              </button>
            </form>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Timeline</h2>
            <div className={styles.timeline}>
              {events.length === 0 && (
                <div className={styles.timelineEmpty}>No events yet</div>
              )}
              {events.map((event) => (
                <div key={event.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineDesc}>{event.description || event.type}</div>
                    <div className={styles.timelineTime}>{relativeTime(event.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function typeColor(type: string): string {
  const colors: Record<string, string> = {
    meta_ads: "#1877F2",
    buyer_intake: "#009B8A",
    sale: "#15803D",
  };
  return colors[type] || "#718096";
}