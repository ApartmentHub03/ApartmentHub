import { getStaffUser } from "@/app/lib/auth";
import type { StaffUser } from "@/app/lib/auth";
import type { ReactNode } from "react";
import styles from "./crm.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "ApartmentHub CRM",
};

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const staff: StaffUser | null = await getStaffUser();
  if (!staff) return <>{children}</>;

  return (
    <LayoutInner staff={staff}>{children}</LayoutInner>
  );
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

function LayoutInner({ staff, children }: { staff: StaffUser; children: ReactNode }) {
  return (
    <div className={styles.crmRoot}>
      <header className={styles.crmTopbar}>
        <a href="/crm/kanban" className={styles.crmBrand}>
          <img src="/images/site-logo.png" alt="ApartmentHub" />
          <span className={styles.crmBrandText}>Pipeline Dashboard</span>
        </a>
        <span className={styles.crmTopbarRight}>
          {staff.role === "admin" && (
            <a href="/dashboard-selling/admin" className={styles.crmTopbarBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Staff
            </a>
          )}

          <span className={styles.crmUserPill}>
            <span className={styles.crmAvatar}>{initials(staff.display_name ?? staff.phone_e164)}</span>
            <span>{shortName(staff.display_name)}</span>
            <span className={styles.crmRole}>{staff.role}</span>
          </span>
          <a href="/api/auth/signout?redirect=/crm/login" rel="nofollow" className={`${styles.crmTopbarBtn} ${styles.crmDanger}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </a>
        </span>
      </header>
      <main className={styles.crmMain}>{children}</main>
    </div>
  );
}