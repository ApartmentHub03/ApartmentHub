"use client";

import { useState } from "react";
import Link from "next/link";
import { useUpdateLead, useAddNote, useLead, useLeadEvents, fullName, relativeTime, LEAD_TYPE_LABELS } from "@/hooks/useKanbanQueries";
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

  const leadQuery = useLead(lead.id, lead);
  const currentLead = leadQuery.data ?? lead;

  const eventsQuery = useLeadEvents(lead.id, events);
  const currentEvents = eventsQuery.data?.events ?? events;

  function handleStageChange(newStage: string) {
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

  const stageColor = stages.find((s) => s.stage === currentLead.stage)?.color || "#718096";

  function actorName(event: LeadEvent): string | null {
    if (!event.actor_id) return null;
    const member = teamMembers.find((m) => m.phone_e164 === event.actor_id);
    return member?.display_name ?? null;
  }

  return (
    <div className={styles.root}>
      <Link href="/crm/kanban" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back to board
      </Link>

      <div className={styles.grid}>
        <div className={styles.main}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.name}>{fullName(currentLead)}</h1>
              <div className={styles.meta}>
                <span className={styles.typeBadge} style={{ background: typeColor(currentLead.type) }}>
                  {LEAD_TYPE_LABELS[currentLead.type] || currentLead.type}
                </span>
                <span className={styles.stageBadge} style={{ background: stageColor }}>
                  {stages.find((s) => s.stage === currentLead.stage)?.label || currentLead.stage}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact</h2>
            {currentLead.email && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Email</span>
                <a href={`mailto:${currentLead.email}`} className={styles.fieldValue}>{currentLead.email}</a>
              </div>
            )}
            {currentLead.phone && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Phone</span>
                <a href={`tel:${currentLead.phone}`} className={styles.fieldValue}>{currentLead.phone}</a>
              </div>
            )}
            {currentLead.address && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Address</span>
                <span className={styles.fieldValue}>{currentLead.address}{currentLead.city ? `, ${currentLead.city}` : ""}</span>
              </div>
            )}
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Created</span>
              <span className={styles.fieldValue}>{new Date(currentLead.created_at).toLocaleString()}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Source</span>
              <span className={styles.fieldValue}>{currentLead.source_type} / {currentLead.source}</span>
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
                  className={`${styles.stageBtn} ${currentLead.stage === s.stage ? styles.stageBtnActive : ""}`}
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
              value={currentLead.assignee_id || ""}
              onChange={(e) => updateLead.mutate({ id: lead.id, assignee_id: e.target.value || null })}
              disabled={staff.role === "viewer"}
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.phone_e164} value={m.phone_e164}>
                  {m.display_name || m.phone_e164}
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
              {currentEvents.length === 0 && (
                <div className={styles.timelineEmpty}>No events yet</div>
              )}
              {currentEvents.map((event) => {
                const actor = actorName(event);
                return (
                  <div key={event.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot} />
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineDesc}>
                        {actor && <span className={styles.timelineActor}>{actor}</span>}
                        {event.description || event.type}
                      </div>
                      <div className={styles.timelineTime}>{relativeTime(event.created_at)}</div>
                    </div>
                  </div>
                );
              })}
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