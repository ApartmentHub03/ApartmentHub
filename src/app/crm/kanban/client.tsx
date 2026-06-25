"use client";

import { useCallback, useMemo, useState } from "react";
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
import { useLeads, useUpdateLead, fullName, relativeTime, LEAD_TYPE_LABELS, PIPELINE_FOR_TYPE } from "@/hooks/useKanbanQueries";
import type { Lead, PipelineStage, TeamMember, PipelineKey, LeadType } from "@/hooks/useKanbanQueries";
import type { StaffUser } from "@/app/lib/auth";
import styles from "./kanban.module.css";

const TYPE_ORDER: LeadType[] = ["sale", "buyer_intake", "meta_ads"];

export function KanbanClient({ staff }: { staff: StaffUser }) {
  const [activeType, setActiveType] = useState<LeadType>("sale");
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("");
  const filters = useMemo<Record<string, string>>(() => {
    const f: Record<string, string> = { type: activeType };
    if (search) f.search = search;
    if (assignee) f.assignee = assignee;
    return f;
  }, [activeType, search, assignee]);

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
        search={search}
        onSearchChange={setSearch}
        assignee={assignee}
        onAssigneeChange={setAssignee}
        teamMembers={teamMembers}
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
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? (
            <LeadCardOverlay
              lead={activeLead}
              sourceData={sourceData[String(activeLead.source_type) + ":" + String(activeLead.source_id)]}
              teamMembers={teamMembers}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Toolbar({
  activeType,
  onTypeChange,
  search,
  onSearchChange,
  assignee,
  onAssigneeChange,
  teamMembers,
}: {
  activeType: LeadType;
  onTypeChange: (type: LeadType) => void;
  search: string;
  onSearchChange: (value: string) => void;
  assignee: string;
  onAssigneeChange: (value: string) => void;
  teamMembers: TeamMember[];
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
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
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
    </div>
  );
}

function KanbanColumn({
  stage,
  leads,
  sourceData,
  teamMembers,
}: {
  stage: PipelineStage;
  leads: Lead[];
  sourceData: Record<string, Record<string, unknown>>;
  teamMembers: TeamMember[];
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
}: {
  lead: Lead;
  sourceData?: Record<string, unknown>;
  teamMembers: TeamMember[];
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
    ? teamMembers.find((m) => m.user_id === lead.assignee_id)
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
        <Link href={`/crm/kanban/${lead.id}`} className={styles.cardLink} onClick={(e) => e.stopPropagation()}>
          View
        </Link>
      </div>
    </div>
  );
}

function LeadCardOverlay({
  lead,
  sourceData,
  teamMembers,
}: {
  lead: Lead;
  sourceData?: Record<string, unknown>;
  teamMembers: TeamMember[];
}) {
  return (
    <div className={`${styles.card} ${styles.cardOverlay}`}>
      <div className={styles.cardName}>{fullName(lead)}</div>
      {lead.email && <div className={styles.cardContact}>{lead.email}</div>}
    </div>
  );
}

