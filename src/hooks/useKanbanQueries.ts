"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type LeadStage = string;

export type PipelineKey = "sale" | "buyer" | "meta";

export const PIPELINE_FOR_TYPE: Record<LeadType, PipelineKey> = {
  sale: "sale",
  buyer_intake: "buyer",
  meta_ads: "meta",
};

export type LeadType =
  | "sale"
  | "buyer_intake"
  | "meta_ads";

export interface Lead {
  id: string;
  type: LeadType;
  stage: LeadStage;
  source_type: string;
  source_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
  neighborhood: string | null;
  assignee_id: string | null;
  notes: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  stage_changed_at: string;
}

export interface PipelineStage {
  id: string;
  pipeline: PipelineKey;
  stage: string;
  label: string;
  position: number;
  color: string | null;
}

export interface TeamMember {
  user_id: string;
  display_name: string | null;
  role: string;
}

export interface LeadEvent {
  id: string;
  lead_id: string;
  type: string;
  actor_id: string | null;
  description: string | null;
  meta: Record<string, unknown>;
  client_visible: boolean;
  created_at: string;
}

export interface KanbanData {
  leads: Lead[];
  sourceData: Record<string, Record<string, unknown>>;
  stages: PipelineStage[];
  pipelines: Record<PipelineKey, PipelineStage[]>;
  teamMembers: TeamMember[];
}

export interface LeadsFilters {
  stage?: string;
  type?: string;
  search?: string;
  assignee?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useLeads(filters: LeadsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.type) params.set("type", filters.type);
  if (filters.search) params.set("search", filters.search);
  if (filters.assignee) params.set("assignee", filters.assignee);

  const qs = params.toString();
  const url = `/api/crm/leads${qs ? `?${qs}` : ""}`;

  return useQuery<KanbanData>({
    queryKey: ["leads", filters],
    queryFn: async () => {
      const data = await fetchJson<{
        leads: Lead[];
        sourceData: Record<string, Record<string, unknown>>;
        stages: PipelineStage[];
        teamMembers: TeamMember[];
      }>(url);

      const pipelines: Record<PipelineKey, PipelineStage[]> = {
        sale: [],
        buyer: [],
        meta: [],
      };
      for (const stage of data.stages) {
        const key = stage.pipeline as PipelineKey;
        if (key in pipelines) pipelines[key].push(stage);
      }
      for (const key of Object.keys(pipelines) as PipelineKey[]) {
        pipelines[key].sort((a, b) => a.position - b.position);
      }

      return {
        leads: data.leads,
        sourceData: data.sourceData,
        stages: data.stages,
        pipelines,
        teamMembers: data.teamMembers,
      };
    },
  });
}

export function usePipelineStages() {
  return useQuery<PipelineStage[]>({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const data = await fetchJson<{ stages: PipelineStage[] }>("/api/crm/pipeline");
      return data.stages;
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      stage?: string;
      assignee_id?: string | null;
      notes?: string;
    }) => {
      const res = await fetch(`/api/crm/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update lead");
      }
      return res.json();
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previousData = queryClient.getQueryData(["leads"]);

      queryClient.setQueriesData({ queryKey: ["leads"] }, (old: unknown) => {
        if (!old) return old;
        const typedOld = old as KanbanData;
        return {
          ...typedOld,
          leads: typedOld.leads.map((lead) =>
            lead.id === variables.id
              ? { ...lead, ...variables, stage: (variables.stage ?? lead.stage) as LeadStage }
              : lead
          ),
        };
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueriesData({ queryKey: ["leads"] }, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useLeadEvents(leadId: string | null) {
  return useQuery<{ events: LeadEvent[] }>({
    queryKey: ["lead-events", leadId],
    queryFn: () => fetchJson(`/api/crm/leads/${leadId}/events`),
    enabled: !!leadId,
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      description,
    }: {
      leadId: string;
      description: string;
    }) => {
      const res = await fetch(`/api/crm/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add note");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lead-events", variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  sale: "Sale",
  buyer_intake: "Buyer",
  meta_ads: "Meta Ads",
};

export function relativeTime(iso: string | null): string {
  if (!iso) return "\u2014";
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function fullName(lead: Lead): string {
  return [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";
}