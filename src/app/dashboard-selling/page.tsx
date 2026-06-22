import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./dashboard-selling.module.css";
import { getStaffUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { DashboardClient } from "./client";
import { Logo } from "@/app/lib/components/Logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "ApartmentHub — Dashboard",
};

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

async function loadDossiers(): Promise<Dossier[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("verkoop_dossiers")
    .select(
      "id, status, naam, email, telefoon, straat, postcode, woonplaats, taal, created_at, last_activity_at"
    )
    .order("last_activity_at", { ascending: false, nullsFirst: false });
  if (error || !data) return [];

  const ids = data.map((d) => d.id);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: files } = await sb
      .from("verkoop_files")
      .select("dossier_id")
      .in("dossier_id", ids)
      .eq("is_current", true);
    files?.forEach((f) => {
      counts[f.dossier_id] = (counts[f.dossier_id] ?? 0) + 1;
    });
  }
  return data.map((d) => ({ ...d, file_count: counts[d.id] ?? 0 }));
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase().slice(0, 2);
}

function shortName(name: string | null | undefined): string {
  if (!name) return "Staff";
  const first = name.trim().split(/[\s(—]/)[0];
  return first || "Staff";
}

export default async function DashboardPage() {
  const staff = await getStaffUser();
  if (!staff) redirect("/sell/login?next=/dashboard-selling");

  const dossiers = await loadDossiers();
  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <Link href="/admin/dashboard" className={styles.brand}>
         <img src={"/images/horizontal-logo.png"} />
        </Link>
        <span className={styles.topbarRight}>
          <span className={styles.userPill}>
            <span className={styles.avatar}>{initials(staff.display_name ?? staff.phone_e164)}</span>
            <span>{shortName(staff.display_name)}</span>
            <span className={styles.role}>{staff.role}</span>
          </span>
          {staff.role === "admin" && (
            <Link href="/dashboard-selling/admin" className={styles.topbarBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Staff
            </Link>
          )}
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
        <DashboardClient initialDossiers={dossiers} canDownload={staff.role !== "viewer"} />
      </main>
    </div>
  );
}
