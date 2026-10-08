import defaultPackages from "../../data/packages.json";
import type { Package, PackageFeature, PackageId } from "./types";
import { formatINR } from "./money";

const PACKAGES_KEY = "nemora-packages-config";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function normalizeFeature(raw: unknown): PackageFeature | null {
  if (typeof raw === "string") {
    return { description: raw, amount: 0 };
  }
  if (raw && typeof raw === "object") {
    const item = raw as Partial<PackageFeature>;
    if (!item.description) return null;
    return {
      description: String(item.description),
      amount: Number.isFinite(item.amount) ? Number(item.amount) : 0,
    };
  }
  return null;
}

export function normalizePackage(raw: Partial<Package> & { features?: unknown[] }): Package {
  const features = (raw.features ?? [])
    .map(normalizeFeature)
    .filter((item): item is PackageFeature => item !== null);

  const baseAmount =
    typeof raw.baseAmount === "number" && raw.baseAmount > 0
      ? raw.baseAmount
      : features.reduce((sum, f) => sum + f.amount, 0);

  return {
    id: (raw.id ?? "basic") as PackageId,
    name: raw.name ?? "Package",
    price: raw.price ?? formatINR(baseAmount),
    baseAmount,
    medal: raw.medal ?? "•",
    highlighted: Boolean(raw.highlighted),
    features,
  };
}

export const DEFAULT_PACKAGES = (defaultPackages as Partial<Package>[]).map(normalizePackage);

export function loadPackages(): Package[] {
  if (!canUseStorage()) return DEFAULT_PACKAGES;

  try {
    const raw = localStorage.getItem(PACKAGES_KEY);
    if (!raw) return DEFAULT_PACKAGES;
    const parsed = JSON.parse(raw) as Partial<Package>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PACKAGES;
    return parsed.map(normalizePackage);
  } catch {
    return DEFAULT_PACKAGES;
  }
}

export function savePackages(packages: Package[]): Package[] {
  if (!canUseStorage()) return packages;
  const normalized = packages.map(normalizePackage);
  localStorage.setItem(PACKAGES_KEY, JSON.stringify(normalized));
  return normalized;
}

export function resetPackages(): Package[] {
  if (!canUseStorage()) return DEFAULT_PACKAGES;
  localStorage.removeItem(PACKAGES_KEY);
  return DEFAULT_PACKAGES;
}

export function getPackageById(id: PackageId, list?: Package[]): Package {
  const packages = list ?? loadPackages();
  const pkg = packages.find((item) => item.id === id);
  if (!pkg) {
    throw new Error(`Unknown package: ${id}`);
  }
  return pkg;
}

/** Features in `next` that are not in `prev` (by description). */
export function featureDiff(prev: Package, next: Package): string[] {
  const prevSet = new Set(prev.features.map((f) => f.description));
  return next.features
    .map((f) => f.description)
    .filter((description) => !prevSet.has(description));
}
