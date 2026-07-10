"use client";

import { useState, useEffect } from "react";
import { INVENTORY_ITEMS, ITEM_MAP, RADIO_VALUES } from "@/app/lib/inventory-items";

type SubmittedData = {
  items: { key: string; choice: string }[];
  extras: { label: string; category: string; choice: string }[];
  notes: string;
  signature_name?: string;
  signature_place?: string;
  signature_date?: string;
  signature_image?: string | null;
};

type InventoryLink = {
  id: string;
  token: string;
  recipient_email: string;
  status: string;
  submitted_at: string | null;
  submitted_data: SubmittedData | null;
  created_at: string;
  expires_at: string;
};

export function InventoryResponseSection({ dossierId }: { dossierId: string }) {
  const [links, setLinks] = useState<InventoryLink[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/dashboard-selling/dossiers/${dossierId}/inventory-links`, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          setLinks(data.links || []);
        } else {
          setLinks([]);
        }
      } catch {
        setLinks([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dossierId]);

  if (loading) return null;
  if (!links || links.length === 0) return null;

  const submitted = links.find((l) => l.status === "submitted" && l.submitted_data);

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 0,
        border: "1px solid var(--line)",
        borderRadius: 12,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Lijst van zaken</h2>
        <span style={{ fontSize: 12, color: "var(--grey)" }}>
          {links.length} link(s) &middot; {submitted ? "Submitted" : "Pending"}
        </span>
      </div>

      <div style={{ padding: "12px 16px" }}>
        {!submitted ? (
          <div style={{ fontSize: 13, color: "var(--grey)" }}>
            {links.map((l) => (
              <div key={l.id} style={{ marginBottom: 6 }}>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 9px",
                    borderRadius: 999,
                    background: l.status === "sent" ? "var(--amber-soft)" : "#F2F4F7",
                    color: l.status === "sent" ? "var(--amber)" : "var(--grey-soft)",
                    marginRight: 8,
                  }}
                >
                  {l.status === "sent" ? "Awaiting response" : l.status}
                </span>
                Sent to {l.recipient_email} &middot; expires {new Date(l.expires_at).toLocaleDateString()}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: "var(--grey)", marginBottom: 10 }}>
              Submitted {submitted.submitted_at ? new Date(submitted.submitted_at).toLocaleString() : ""}
              {" "}by {submitted.recipient_email}
            </div>
            <SubmittedSummary data={submitted.submitted_data!} />
            <button
              onClick={() => setShowRaw(!showRaw)}
              style={{
                marginTop: 10,
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "#fff",
                color: "var(--grey)",
                cursor: "pointer",
              }}
            >
              {showRaw ? "Hide raw data" : "Show raw data"}
            </button>
            {showRaw && (
              <pre
                style={{
                  marginTop: 8,
                  padding: 10,
                  background: "#F7FAFC",
                  borderRadius: 8,
                  fontSize: 11,
                  overflow: "auto",
                  maxHeight: 300,
                }}
              >
                {JSON.stringify(submitted.submitted_data, null, 2)}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SubmittedSummary({ data }: { data: SubmittedData }) {
  const counts: Record<string, number> = { blijft: 0, mee: 0, overname: 0, nvt: 0 };
  const byChoice: Record<string, { label: string; category: string }[]> = {
    blijft: [],
    mee: [],
    overname: [],
    nvt: [],
  };

  for (const item of data.items) {
    const meta = ITEM_MAP[item.key];
    if (meta && byChoice[item.choice]) {
      counts[item.choice]++;
      byChoice[item.choice].push({ label: meta.label_nl, category: meta.category_nl });
    }
  }
  for (const extra of data.extras) {
    if (byChoice[extra.choice]) {
      counts[extra.choice]++;
      byChoice[extra.choice].push({ label: extra.label + " (extra)", category: extra.category });
    }
  }

  const cardColors: Record<string, string> = {
    blijft: "#009B8A",
    mee: "#FF7D28",
    overname: "#3E6E64",
    nvt: "#b8c4c1",
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {["blijft", "mee", "overname", "nvt"].map((key) => (
          <div
            key={key}
            style={{
              border: "1px solid var(--line)",
              borderTop: `4px solid ${cardColors[key]}`,
              borderRadius: 10,
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: cardColors[key] }}>{counts[key]}</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--grey)", marginTop: 3 }}>
              {RADIO_VALUES[key].nl}
            </div>
          </div>
        ))}
      </div>

      {["blijft", "mee", "overname"].map((key) => {
        const items = byChoice[key];
        return (
          <div
            key={key}
            style={{
              border: "1px solid var(--line)",
              borderLeft: `4px solid ${cardColors[key]}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: cardColors[key],
                  display: "inline-block",
                }}
              />
              {RADIO_VALUES[key].nl}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--grey)" }}>{items.length} items</span>
            </div>
            {items.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--grey-soft)", fontStyle: "italic" }}>Niets aangevinkt</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12, lineHeight: 1.6 }}>
                {items.map((item, i) => (
                  <li key={i} style={{ borderBottom: "1px dotted #e3ecea", paddingBottom: 2, marginBottom: 2 }}>
                    {item.label}
                    <span style={{ color: "var(--grey-soft)", fontSize: 11 }}> &middot; {item.category}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {data.notes && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--teal-dark)", marginBottom: 4 }}>
            Bijzonderheden
          </div>
          <div style={{ fontSize: 13, color: "var(--ink)", background: "var(--soft)", padding: 10, borderRadius: 8 }}>
            {data.notes}
          </div>
        </div>
      )}

      {(data.signature_name || data.signature_image) && (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--teal-dark)", marginBottom: 8 }}>
            Ondertekening
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.6 }}>
              {data.signature_name && (
                <div><span style={{ color: "var(--grey)" }}>Naam:</span> <strong>{data.signature_name}</strong></div>
              )}
              {data.signature_place && (
                <div><span style={{ color: "var(--grey)" }}>Plaats:</span> {data.signature_place}</div>
              )}
              {data.signature_date && (
                <div><span style={{ color: "var(--grey)" }}>Datum:</span> {data.signature_date}</div>
              )}
              {!data.signature_image && (
                <div style={{ fontStyle: "italic", color: "var(--grey-soft)", marginTop: 4 }}>
                  No drawn signature (typed name is legally binding under BW 3:15a).
                </div>
              )}
            </div>
            {data.signature_image && (
              <img
                src={data.signature_image}
                alt="Seller signature"
                style={{
                  maxHeight: 80,
                  maxWidth: 220,
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: 4,
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}