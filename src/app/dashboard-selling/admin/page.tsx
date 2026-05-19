import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "../dashboard-selling.module.css";
import { getStaffUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { AdminClient } from "./client";
import { Logo } from "@/app/lib/components/Logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "ApartmentHub — Manage staff",
};

function shortName(name: string | null | undefined): string {
  if (!name) return "Staff";
  return name.trim().split(/[\s(—]/)[0] || "Staff";
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase().slice(0, 2);
}

export default async function AdminPage() {
  const me = await getStaffUser();
  if (!me) redirect("/sell/login?next=/dashboard-selling/admin");
  if (me.role !== "admin") redirect("/dashboard-selling");

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("verkoop_staff_users")
    .select("phone_e164, display_name, role, created_at, last_login_at")
    .order("created_at", { ascending: true });

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <Link href="/dashboard-selling" className={styles.brand}>
          <span className={styles.logoBox}>
            <Logo variant="light" size={20} />
          </span>
          ApartmentHub
          <span className={styles.sub}>Dashboard</span>
        </Link>
        <span className={styles.topbarRight}>
          <span className={styles.userPill}>
            <span className={styles.avatar}>{initials(me.display_name ?? me.phone_e164)}</span>
            <span>{shortName(me.display_name)}</span>
            <span className={styles.role}>{me.role}</span>
          </span>
          <Link href="/dashboard-selling" className={styles.topbarBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Dossiers
          </Link>
          <a href="/api/auth/signout" rel="nofollow" className={`${styles.topbarBtn} ${styles.danger}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </a>
        </span>
      </header>

      <main className={styles.main}>
        <div className={styles.titleRow}>
          <div>
            <Link href="/dashboard-selling" className={styles.backLink}>
              <span className={styles.backArrow}>←</span>
              All dossiers
            </Link>
            <h1 className={styles.pageTitle} style={{ marginTop: 10 }}>
              Manage staff
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                color: "var(--grey)",
                fontSize: 14,
                maxWidth: 720,
                lineHeight: 1.5,
              }}
            >
              <strong>Admin</strong> manages staff. <strong>Agent</strong> can view dossiers and download
              files. <strong>Viewer</strong> sees dossier metadata only — no files or downloads.
            </p>
          </div>
        </div>

        <AdminClient initialStaff={data ?? []} mePhone={me.phone_e164} />
      </main>
    </div>
  );
}
