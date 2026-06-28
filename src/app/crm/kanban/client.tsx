"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useLeads,
  useUpdateLead,
  fullName,
  relativeTime,
  LEAD_TYPE_LABELS,
  PIPELINE_FOR_TYPE,
  TYPE_ORDER,
} from "@/hooks/useKanbanQueries";
import type { Lead, PipelineStage, TeamMember, PipelineKey, LeadType } from "@/hooks/useKanbanQueries";
import type { StaffUser } from "@/app/lib/auth";
import styles from "./kanban.module.css";

export function KanbanClient({ staff }: { staff: StaffUser }) {
  const [activeType, setActiveType] = useState<LeadType>("sale");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters = useMemo<Record<string, string>>(() => {
    const f: Record<string, string> = { type: activeType };
    if (search) f.search = search;
    if (assignee) f.assignee = assignee;
    return f;
  }, [activeType, search, assignee]);

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useLeads(filters);
  const updateLead = useUpdateLead();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const leads = data?.leads ?? [];
  const pipelines = data?.pipelines ?? { sale: [], buyer: [], meta: [] };
  const sourceData = data?.sourceData ?? {};
  const teamMembers = data?.teamMembers ?? [];

  const activePipeline = useMemo<PipelineKey>(
    () => PIPELINE_FOR_TYPE[activeType] ?? "sale",
    [activeType]
  );

  const activeStages = pipelines[activePipeline] ?? [];
  const activeStageSet = useMemo(
    () => new Set(activeStages.map((s) => s.stage)),
    [activeStages]
  );

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    const firstStage = activeStages[0]?.stage;
    for (const stage of activeStages) {
      map[stage.stage] = [];
    }
    for (const lead of leads) {
      const arr = map[lead.stage];
      if (arr) {
        arr.push(lead);
      } else if (firstStage) {
        map[firstStage].push(lead);
      }
    }
    return map;
  }, [leads, activeStages]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;
      if (over.data.current?.type !== "column") return;

      const leadId = String(active.id);
      const newStage = String(over.id);

      const validStages = activeStages.map((s) => s.stage);
      if (!validStages.includes(newStage)) return;

      const lead = leads.find((l) => l.id === leadId);
      if (!lead || lead.stage === newStage) return;

      updateLead.mutate({ id: leadId, stage: newStage });
    },
    [leads, updateLead, activeStages]
  );

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/crm/leads/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Sync failed");
      }
      const result = await res.json();
      toast.success(
        `Synced ${result.total ?? 0} lead${result.total === 1 ? "" : "s"}`
      );
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading leads&hellip;</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load leads: {error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.board}>
      <Toolbar
        activeType={activeType}
        onTypeChange={setActiveType}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        assignee={assignee}
        onAssigneeChange={setAssignee}
        teamMembers={teamMembers}
        isAdmin={staff.role === "admin"}
        syncing={syncing}
        onSync={handleSync}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.columns}>
          {activeStages.map((stage) => (
            <KanbanColumn
              key={stage.stage}
              stage={stage}
              leads={leadsByStage[stage.stage] ?? []}
              sourceData={sourceData}
              teamMembers={teamMembers}
              activeStageSet={activeStageSet}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? (
            <LeadCardOverlay lead={activeLead} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Toolbar({
  activeType,
  onTypeChange,
  searchInput,
  onSearchInputChange,
  assignee,
  onAssigneeChange,
  teamMembers,
  isAdmin,
  syncing,
  onSync,
}: {
  activeType: LeadType;
  onTypeChange: (type: LeadType) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  assignee: string;
  onAssigneeChange: (value: string) => void;
  teamMembers: TeamMember[];
  isAdmin: boolean;
  syncing: boolean;
  onSync: () => void;
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchWrap}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search leads..."
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
        />
      </div>
      <select
        className={styles.assigneeSelect}
        value={assignee}
        onChange={(e) => onAssigneeChange(e.target.value)}
      >
        <option value="">All assignees</option>
        {teamMembers.map((m) => (
          <option key={m.phone_e164} value={m.phone_e164}>
            {m.display_name || m.phone_e164}
          </option>
        ))}
      </select>
      <div className={styles.filterChips}>
        {TYPE_ORDER.map((value) => (
          <button
            key={value}
            className={`${styles.chip} ${activeType === value ? styles.chipActive : ""}`}
            onClick={() => onTypeChange(value)}
          >
            {LEAD_TYPE_LABELS[value]}
          </button>
        ))}
      </div>
      {isAdmin && (
        <button
          className={styles.syncBtn}
          onClick={onSync}
          disabled={syncing}
        >
          {syncing ? "Syncing\u2026" : "Sync leads"}
        </button>
      )}
    </div>
  );
}

function KanbanColumn({
  stage,
  leads,
  sourceData,
  teamMembers,
  activeStageSet,
}: {
  stage: PipelineStage;
  leads: Lead[];
  sourceData: Record<string, Record<string, unknown>>;
  teamMembers: TeamMember[];
  activeStageSet: Set<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.stage,
    data: { type: "column", stage: stage.stage },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.column} ${isOver ? styles.columnOver : ""}`}
      data-stage={stage.stage}
    >
      <div className={styles.columnHeader} style={{ borderTopColor: stage.color || "#718096" }}>
        <span className={styles.columnLabel}>{stage.label}</span>
        <span className={styles.columnCount}>{leads.length}</span>
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className={styles.columnCards}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              sourceData={sourceData[String(lead.source_type) + ":" + String(lead.source_id)]}
              teamMembers={teamMembers}
              isBucketed={!activeStageSet.has(lead.stage)}
            />
          ))}
          {leads.length === 0 && (
            <div className={styles.emptyColumn}>No leads</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function LeadCard({
  lead,
  sourceData,
  teamMembers,
  isBucketed,
}: {
  lead: Lead;
  sourceData?: Record<string, unknown>;
  teamMembers: TeamMember[];
  isBucketed: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: "lead", lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignee = lead.assignee_id
    ? teamMembers.find((m) => m.phone_e164 === lead.assignee_id)
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.card}
      {...attributes}
      {...listeners}
    >
      <div className={styles.cardTop}>
        <span className={styles.cardTime}>{relativeTime(lead.stage_changed_at)}</span>
        {isBucketed && (
          <span
            className={styles.bucketBadge}
            title={`Stage "${lead.stage}" is not in this pipeline; shown in the first column`}
          >
            ?
          </span>
        )}
      </div>
      <div className={styles.cardName}>{fullName(lead)}</div>
      {(lead.email || lead.phone) && (
        <div className={styles.cardContact}>
          {lead.email && <span className={styles.contactLine}>{lead.email}</span>}
          {lead.phone && <span className={styles.contactLine}>{lead.phone}</span>}
        </div>
      )}
      {lead.address && (
        <div className={styles.cardAddress}>{lead.address}{lead.city ? `, ${lead.city}` : ""}</div>
      )}
      <div className={styles.cardBottom}>
        {assignee && (
          <span className={styles.assignee} title={assignee.display_name ?? ""}>
            {assignee.display_name?.split(" ").map((w) => w[0]).join("").slice(0, 2) || "?"}
          </span>
        )}
        <Link
          href={`/crm/kanban/${lead.id}`}
          className={styles.cardLink}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          View
        </Link>
      </div>
    </div>
  );
}

function LeadCardOverlay({ lead }: { lead: Lead }) {
  return (
    <div className={`${styles.card} ${styles.cardOverlay}`}>
      <div className={styles.cardName}>{fullName(lead)}</div>
      {lead.email && <div className={styles.cardContact}>{lead.email}</div>}
    </div>
  );
}