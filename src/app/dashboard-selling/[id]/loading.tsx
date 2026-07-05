import Link from "next/link";
import styles from "../dashboard-selling.module.css";

export default function Loading() {
  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <Link href="/dashboard-selling" className={styles.brand}>
          <span className={styles.sub}>Dashboard</span>
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.titleRow}>
          <div style={{ minWidth: 0 }}>
            <Link href="/dashboard-selling" className={styles.backLink}>
              <span className={styles.backArrow}>←</span> All dossiers
            </Link>
            <div
              style={{
                height: 28,
                width: 240,
                borderRadius: 6,
                background: "#E2E8F0",
                marginTop: 10,
              }}
            />
            <div
              style={{
                height: 14,
                width: 180,
                borderRadius: 6,
                background: "#E2E8F0",
                marginTop: 8,
                opacity: 0.7,
              }}
            />
          </div>
        </div>

        <div className={styles.grid}>
          <div style={{ display: "grid", gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={styles.section}
                style={{ height: 140, opacity: 0.65 }}
              />
            ))}
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={styles.section}
                style={{ height: 180, opacity: 0.65 }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}