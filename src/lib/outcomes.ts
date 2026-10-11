import outcomesData from "../../data/outcomes.json";
import { searchableServiceText } from "./text-normalize";
import type { ProductType, RequirementTagId } from "./types";

export interface OutcomeOption {
  id: string;
  label: string;
  tags: RequirementTagId[];
  common?: boolean;
}

export interface PlatformOption {
  id: ProductType;
  label: string;
  hint: string;
}

export interface Niche {
  id: string;
  keywords: string[];
  web: OutcomeOption[];
  app: OutcomeOption[];
}

export interface ServiceAnalysis {
  nicheId: string | null;
  nicheLabel: string;
  confidence: "high" | "medium" | "low";
  summary: string;
  suggestedPlatform: ProductType | null;
  commonOutcomeIds: string[];
  source: "local" | "nvidia";
}

const NICHE_LABELS: Record<string, string> = {
  cafe: "Cafe / food",
  salon: "Salon / beauty",
  clinic: "Clinic / health",
  shop: "Retail / shop",
  gym: "Gym / fitness",
  education: "Education",
  realestate: "Real estate",
  bakery: "Bakery / sweets",
  yoga: "Yoga / wellness",
  logistics: "Logistics / courier",
  temple: "Temple / trust",
  pg: "PG / hostel",
};

export function allNicheOptions(): { id: string; label: string }[] {
  return data.niches.map((n) => ({
    id: n.id,
    label: NICHE_LABELS[n.id] ?? n.id,
  }));
}

const data = outcomesData as {
  platforms: PlatformOption[];
  niches: Niche[];
  fallback: { web: OutcomeOption[]; app: OutcomeOption[] };
};

export const PLATFORM_OPTIONS = data.platforms;

export function listNiches(): Niche[] {
  return data.niches;
}

export function getFallbackOutcomes(): { web: OutcomeOption[]; app: OutcomeOption[] } {
  return data.fallback;
}

function keywordHits(haystack: string, keyword: string): boolean {
  const k = keyword.toLowerCase().trim();
  if (!k) return false;
  // Whole-phrase match (avoid “pg” inside other words; allow multi-word).
  const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, "i").test(` ${haystack} `);
}

export function matchNiche(service: string): Niche | null {
  // Includes typo fixes + Tanglish expansions (e.g. saloon → salon, kadai → shop).
  // Prefer the longest matching keyword so “mens pg near college” → pg, not education.
  const haystack = searchableServiceText(service);
  let best: Niche | null = null;
  let bestLen = 0;
  for (const niche of data.niches) {
    for (const keyword of niche.keywords) {
      if (!keywordHits(haystack, keyword)) continue;
      const len = keyword.trim().length;
      if (len > bestLen) {
        bestLen = len;
        best = niche;
      }
    }
  }
  return best;
}

export function getNicheById(id: string): Niche | null {
  return data.niches.find((niche) => niche.id === id) ?? null;
}

function outcomesForNiche(niche: Niche | null): { web: OutcomeOption[]; app: OutcomeOption[] } {
  if (!niche) return data.fallback;
  return { web: niche.web, app: niche.app };
}

export function listOutcomes(service: string, productType: ProductType): OutcomeOption[] {
  const niche = matchNiche(service);
  return listOutcomesForNiche(niche?.id ?? null, productType);
}

export function listOutcomesForNiche(
  nicheId: string | null,
  productType: ProductType,
): OutcomeOption[] {
  const niche = nicheId ? getNicheById(nicheId) : null;
  const { web, app } = outcomesForNiche(niche);

  if (productType === "web") return web;
  if (productType === "app") return app;

  const byId = new Map<string, OutcomeOption>();
  for (const item of [...web, ...app]) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

export function commonOutcomeIds(
  nicheId: string | null,
  productType?: ProductType | null,
): string[] {
  const niche = nicheId ? getNicheById(nicheId) : null;
  const { web, app } = outcomesForNiche(niche);
  let pool = [...web, ...app];
  if (productType === "web") pool = web;
  if (productType === "app") pool = app;
  return pool.filter((o) => o.common).map((o) => o.id);
}

/** Compact catalog for NVIDIA prompts — niches + common outcomes only. */
export function catalogForPrompt(): {
  niches: { id: string; label: string; keywords: string[] }[];
  outcomes: { id: string; label: string; nicheId: string; platform: "web" | "app" }[];
} {
  const niches = data.niches.map((n) => ({
    id: n.id,
    label: NICHE_LABELS[n.id] ?? n.id,
    keywords: n.keywords,
  }));

  const outcomes: { id: string; label: string; nicheId: string; platform: "web" | "app" }[] = [];
  const pushCommon = (
    list: OutcomeOption[],
    nicheId: string,
    platform: "web" | "app",
  ) => {
    for (const o of list) {
      if (!o.common) continue;
      outcomes.push({ id: o.id, label: o.label, nicheId, platform });
    }
  };

  for (const niche of data.niches) {
    pushCommon(niche.web, niche.id, "web");
    pushCommon(niche.app, niche.id, "app");
  }
  pushCommon(data.fallback.web, "fallback", "web");
  pushCommon(data.fallback.app, "fallback", "app");

  return { niches, outcomes };
}

/** Tiny niche list for AI classify (ids + labels only — faster prompts). */
export function nichesForPrompt(): { id: string; label: string }[] {
  return data.niches.map((n) => ({
    id: n.id,
    label: NICHE_LABELS[n.id] ?? n.id,
  }));
}

export function analyzeServiceLocal(service: string): ServiceAnalysis {
  const trimmed = service.trim();
  const niche = matchNiche(trimmed);
  const nicheId = niche?.id ?? null;
  const nicheLabel = niche ? (NICHE_LABELS[niche.id] ?? niche.id) : "General business";
  const ids = commonOutcomeIds(nicheId);

  if (niche) {
    return {
      nicheId,
      nicheLabel,
      confidence: "high",
      summary: `For “${trimmed}” (${nicheLabel}), clients usually need the common items below. Tweak, then choose Website or App.`,
      suggestedPlatform: "web",
      commonOutcomeIds: ids,
      source: "local",
    };
  }

  return {
    nicheId: null,
    nicheLabel,
    confidence: "low",
    summary: `“${trimmed}” looks like a general business. Here are common digital needs — adjust to fit the client.`,
    suggestedPlatform: "web",
    commonOutcomeIds: ids,
    source: "local",
  };
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

export function nicheLabel(id: string | null): string {
  if (!id) return "General business";
  return NICHE_LABELS[id] ?? id;
}
