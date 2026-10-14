import termsData from "../../data/terms.json";
import { matchNiche } from "./outcomes";
import type { PackageId } from "./types";

export interface TermsCatalog {
  common: string[];
  niches: Record<string, string[]>;
  packages?: Partial<Record<PackageId, string[]>>;
}

const catalog = termsData as TermsCatalog;

/** Shared legal lines for every quote. */
export function getCommonTerms(): string[] {
  return [...(catalog.common ?? [])];
}

/** Extra lines for a business niche (salon, cafe, …). */
export function getNicheTerms(nicheId: string | null | undefined): string[] {
  if (!nicheId) return [];
  const list = catalog.niches?.[nicheId];
  return Array.isArray(list) ? [...list] : [];
}

/** Optional package-specific lines (e.g. Premium hosting). */
export function getPackageTerms(packageId: PackageId | null | undefined): string[] {
  if (!packageId || !catalog.packages) return [];
  const list = catalog.packages[packageId];
  return Array.isArray(list) ? [...list] : [];
}

/** Prefer saved nicheId; otherwise infer from service text (legacy quotes). */
export function resolveNicheId(
  nicheId: string | null | undefined,
  service?: string,
): string | null {
  if (nicheId && nicheId !== "fallback") return nicheId;
  if (!service?.trim()) return null;
  return matchNiche(service.trim())?.id ?? null;
}

/**
 * Final T&Cs for a quote: common → niche → package.
 * Dedupes identical lines while preserving order.
 */
export function resolveQuoteTerms(options: {
  nicheId?: string | null;
  packageId?: PackageId | null;
  service?: string;
}): string[] {
  const nicheId = resolveNicheId(options.nicheId, options.service);
  const merged = [
    ...getCommonTerms(),
    ...getNicheTerms(nicheId),
    ...getPackageTerms(options.packageId),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of merged) {
    const key = term.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
