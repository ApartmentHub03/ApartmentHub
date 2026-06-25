import { redirect } from "next/navigation";
import { getStaffUser } from "@/app/lib/auth";
import type { StaffUser } from "@/app/lib/auth";
import { KanbanClient } from "./client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "CRM — Kanban Board",
};

export default async function KanbanPage() {
  const staff: StaffUser | null = await getStaffUser();
  if (!staff) redirect("/crm/login");

  return <KanbanClient staff={staff} />;
}