"use client";

import { useMemo, useState } from "react";
import styles from "./dashboard-selling.module.css";

type Dossier = {
  id: string;
  status: string | null;
  naam: string;
  email: string;
  telefoon: string | null;
  straat: string;
  postcode: string;
  woonplaats: string | null;
  taal: string;
  created_at: string;
  last_activity_at: string | null;
  file_count: number;
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In progress",
  awaiting_followups: "Awaiting follow-ups",
  complete: "Complete",
  archived: "Archived",
};

const STATUS_ORDER = ["all", "in_progress", "awaiting_followups", "complete", "archived"];

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function DashboardClient({ initialDossiers }: { initialDossiers: Dossier[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: initialDossiers.length };
    for (const s of ["in_progress", "awaiting_followups", "complete", "archived"]) c[s] = 0;
    for (const d of initialDossiers) {
      const s = d.status ?? "in_progress";
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [initialDossiers]);

  const filtered = useMemo(() => {
    return initialDossiers.filter((d) => {
      if (filter !== "all" && (d.status ?? "in_progress") !== filter) return false;
      if (q) {
        const hay =
          `${d.naam} ${d.email} ${d.telefoon ?? ""} ${d.straat} ${d.postcode} ${d.woonplaats ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [initialDossiers, filter, q]);

  return (
    <>
      <div className={styles.titleRow}>
        <h1 className={styles.pageTitle}>
          Dossiers
          <span className={styles.titleCount}>({initialDossiers.length})</span>
        </h1>
      </div>

      <div className={styles.toolbar2}>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.chip2} ${filter === s ? styles.active : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
            <span className={styles.count}>{counts[s] ?? 0}</span>
          </button>
        ))}
        <span className={styles.searchBox}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search name, address, postcode, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </span>
      </div>

      <div className={styles.dossierGrid}>
        {filtered.length === 0 ? (
          <div className={styles.emptyCard}>
            <h3>No dossiers yet</h3>
            <p>
              Sellers who complete the wizard will appear here.
              {filter !== "all" && q === "" && " Try the 'All' filter."}
            </p>
          </div>
        ) : (
          filtered.map((d) => {
            const status = d.status ?? "in_progress";
            return (
              <button
                key={d.id}
                type="button"
                className={styles.dossierCard}
                onClick={() => {
                  window.location.href = `/dashboard-selling/${d.id}`;
                }}
              >
                <div className={styles.cardTop}>
                  <div style={{ minWidth: 0 }}>
                    <h3 className={styles.cardName}>{d.naam}</h3>
                    <div className={styles.cardSub}>{d.email}</div>
                  </div>
                  <span className={`${styles.status} ${styles[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                </div>

                <div className={styles.cardMeta}>
                  <div>
                    <span className={styles.label}>Address</span>
                    <span className={styles.value} style={{ display: "block" }}>{d.straat}</span>
                    <span className={styles.cardCity}>
                      {d.postcode}{d.woonplaats ? ` · ${d.woonplaats}` : ""}
                    </span>
                  </div>
                  <div>
                    <span className={styles.label}>Phone</span>
                    <span className={styles.value}>{d.telefoon || "—"}</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.filechip}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.4 11l-9 9a5.7 5.7 0 0 1-8-8l9-9a3.8 3.8 0 0 1 5.4 5.4L9.9 17.3a1.9 1.9 0 1 1-2.7-2.7L15.3 6.5" />
                    </svg>
                    {d.file_count} file{d.file_count === 1 ? "" : "s"}
                  </span>
                  <span title={new Date(d.last_activity_at ?? d.created_at).toLocaleString()}>
                    Active {relativeTime(d.last_activity_at ?? d.created_at)}
                  </span>
                  <span style={{ marginLeft: "auto", fontWeight: 600, color: "var(--grey)" }}>
                    {(d.taal ?? "nl").toUpperCase()}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
