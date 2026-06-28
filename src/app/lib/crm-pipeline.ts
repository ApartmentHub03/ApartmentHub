export type LeadType = "sale" | "buyer_intake" | "meta_ads";

export type PipelineKey = "sale" | "buyer" | "meta";

export const PIPELINE_FOR_TYPE: Record<LeadType, PipelineKey> = {
  sale: "sale",
  buyer_intake: "buyer",
  meta_ads: "meta",
};

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  sale: "Sale",
  buyer_intake: "Buyer",
  meta_ads: "Meta Ads",
};

export function pipelineForType(type: string): PipelineKey {
  return (PIPELINE_FOR_TYPE as Record<string, PipelineKey>)[type] ?? "sale";
}

export const TYPE_ORDER: LeadType[] = ["sale", "buyer_intake", "meta_ads"];