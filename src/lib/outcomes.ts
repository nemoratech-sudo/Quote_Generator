import outcomesData from "../../data/outcomes.json";
import type { ProductType, RequirementTagId } from "./types";

export interface OutcomeOption {
  id: string;
  label: string;
  tags: RequirementTagId[];
}

export interface PlatformOption {
  id: ProductType;
  label: string;
  hint: string;
}

interface Niche {
  id: string;
  keywords: string[];
  web: OutcomeOption[];
  app: OutcomeOption[];
}

const data = outcomesData as {
  platforms: PlatformOption[];
  niches: Niche[];
  fallback: { web: OutcomeOption[]; app: OutcomeOption[] };
};

export const PLATFORM_OPTIONS = data.platforms;

export function matchNiche(service: string): Niche | null {
  const lower = service.toLowerCase();
  return (
    data.niches.find((niche) => niche.keywords.some((keyword) => lower.includes(keyword))) ?? null
  );
}

export function listOutcomes(service: string, productType: ProductType): OutcomeOption[] {
  const niche = matchNiche(service);
  const web = niche?.web ?? data.fallback.web;
  const app = niche?.app ?? data.fallback.app;

  if (productType === "web") return web;
  if (productType === "app") return app;

  const byId = new Map<string, OutcomeOption>();
  for (const item of [...web, ...app]) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

export function outcomesToTags(outcomes: OutcomeOption[]): RequirementTagId[] {
  const tags = new Set<RequirementTagId>();
  for (const outcome of outcomes) {
    for (const tag of outcome.tags) tags.add(tag);
  }
  return Array.from(tags);
}

export function platformLabel(type: ProductType): string {
  return PLATFORM_OPTIONS.find((p) => p.id === type)?.label ?? type;
}
