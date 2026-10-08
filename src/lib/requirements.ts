import type {
  Package,
  PackageId,
  QuoteLineItem,
  RequirementTagId,
} from "./types";

function createLineItemId(): string {
  return `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface RequirementTag {
  id: RequirementTagId;
  label: string;
  /** Match against package feature descriptions (lowercase) */
  keywords: string[];
  /** Packages that typically include this */
  typicalPackages: PackageId[];
  /** Default rate when added as an extra */
  amount: number;
}

export const REQUIREMENT_TAGS: RequirementTag[] = [
  {
    id: "gallery",
    label: "Photos / Gallery",
    keywords: ["gallery", "photos"],
    typicalPackages: ["basic", "standard", "premium"],
    amount: 700,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    keywords: ["whatsapp"],
    typicalPackages: ["basic", "standard", "premium"],
    amount: 500,
  },
  {
    id: "maps",
    label: "Google Maps",
    keywords: ["maps", "google maps"],
    typicalPackages: ["basic", "standard", "premium"],
    amount: 400,
  },
  {
    id: "seo",
    label: "Basic SEO",
    keywords: ["seo"],
    typicalPackages: ["basic", "standard", "premium"],
    amount: 1000,
  },
  {
    id: "contact_form",
    label: "Contact form",
    keywords: ["contact form", "contact"],
    typicalPackages: ["standard", "premium"],
    amount: 900,
  },
  {
    id: "social",
    label: "Social media",
    keywords: ["social"],
    typicalPackages: ["standard", "premium"],
    amount: 1300,
  },
  {
    id: "products",
    label: "Services / Products",
    keywords: ["services", "products", "gallery / services"],
    typicalPackages: ["standard", "premium"],
    amount: 1200,
  },
  {
    id: "cms",
    label: "Admin / CMS",
    keywords: ["admin", "content management"],
    typicalPackages: ["premium"],
    amount: 2000,
  },
  {
    id: "dynamic",
    label: "Dynamic features",
    keywords: ["dynamic"],
    typicalPackages: ["premium"],
    amount: 1500,
  },
  {
    id: "hosting",
    label: "Hosting included",
    keywords: ["hosting"],
    typicalPackages: ["premium"],
    amount: 1000,
  },
  {
    id: "performance",
    label: "Performance",
    keywords: ["performance"],
    typicalPackages: ["premium"],
    amount: 1000,
  },
  {
    id: "online_menu",
    label: "Online menu / ordering",
    keywords: ["menu", "ordering"],
    typicalPackages: [],
    amount: 1500,
  },
];

const CORE_KEYWORDS = ["page", "design", "responsive", "business details"];

export function getTag(id: RequirementTagId): RequirementTag {
  const tag = REQUIREMENT_TAGS.find((t) => t.id === id);
  if (!tag) throw new Error(`Unknown tag: ${id}`);
  return tag;
}

function featureMatchesKeywords(description: string, keywords: string[]): boolean {
  const lower = description.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function isCoreFeature(description: string): boolean {
  return featureMatchesKeywords(description, CORE_KEYWORDS);
}

export function packageCoversTag(pkg: Package, tag: RequirementTag): boolean {
  if (tag.typicalPackages.includes(pkg.id) && tag.keywords.length === 0) {
    return false;
  }
  return pkg.features.some((f) => featureMatchesKeywords(f.description, tag.keywords));
}

export interface PackageFit {
  packageId: PackageId;
  packageName: string;
  price: string;
  baseAmount: number;
  covered: RequirementTag[];
  missing: RequirementTag[];
  notNeeded: string[];
  score: number;
  coverageRatio: number;
}

export function evaluatePackageFit(
  pkg: Package,
  tagIds: RequirementTagId[],
): PackageFit {
  const tags = tagIds.map(getTag);
  const covered = tags.filter((tag) => packageCoversTag(pkg, tag));
  const missing = tags.filter((tag) => !packageCoversTag(pkg, tag));

  const coveredDescriptions = new Set(
    pkg.features
      .filter((f) =>
        tags.some((tag) => featureMatchesKeywords(f.description, tag.keywords)),
      )
      .map((f) => f.description),
  );

  const notNeeded =
    tags.length === 0
      ? []
      : pkg.features
          .filter((f) => !isCoreFeature(f.description) && !coveredDescriptions.has(f.description))
          .map((f) => f.description);

  const score = covered.length * 10 - missing.length * 3 - notNeeded.length;
  const coverageRatio = tags.length === 0 ? 0 : covered.length / tags.length;

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    price: pkg.price,
    baseAmount: pkg.baseAmount,
    covered,
    missing,
    notNeeded,
    score,
    coverageRatio,
  };
}

export function recommendPackage(
  packages: Package[],
  tagIds: RequirementTagId[],
): PackageFit | null {
  if (packages.length === 0) return null;

  const fits = packages.map((pkg) => evaluatePackageFit(pkg, tagIds));

  if (tagIds.length === 0) {
    return fits.find((f) => f.packageId === "standard") ?? fits[0];
  }

  fits.sort((a, b) => {
    if (b.covered.length !== a.covered.length) return b.covered.length - a.covered.length;
    if (b.coverageRatio !== a.coverageRatio) return b.coverageRatio - a.coverageRatio;
    if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length;
    return a.baseAmount - b.baseAmount;
  });

  return fits[0];
}

/** Build optimized line items: keep relevant package lines + add missing extras. */
export function optimizeLineItems(
  pkg: Package,
  tagIds: RequirementTagId[],
): QuoteLineItem[] {
  const stamp = Date.now();
  const tags = tagIds.map(getTag);

  if (tags.length === 0) {
    return pkg.features.map((feature, index) => ({
      id: `li-${stamp}-${index}`,
      description: feature.description,
      amount: feature.amount,
    }));
  }

  const kept = pkg.features.filter((feature) => {
    if (isCoreFeature(feature.description)) return true;
    return tags.some((tag) => featureMatchesKeywords(feature.description, tag.keywords));
  });

  const lineItems: QuoteLineItem[] = kept.map((feature, index) => ({
    id: `li-${stamp}-${index}`,
    description: feature.description,
    amount: feature.amount,
  }));

  const missing = tags.filter((tag) => !packageCoversTag(pkg, tag));
  for (const tag of missing) {
    lineItems.push({
      id: createLineItemId(),
      description: tag.label,
      amount: tag.amount,
    });
  }

  return lineItems;
}

export function formatFitSummary(fit: PackageFit): string {
  const covered = `${fit.covered.length} covered`;
  const missing =
    fit.missing.length > 0
      ? `${fit.missing.length} to add (${fit.missing.map((m) => m.label).slice(0, 2).join(", ")}${fit.missing.length > 2 ? "…" : ""})`
      : "nothing missing";
  return `${fit.packageName} ${fit.price} · ${covered} · ${missing}`;
}

export function tagsLabelList(tagIds: RequirementTagId[]): string {
  return tagIds.map((id) => getTag(id).label).join(", ");
}
