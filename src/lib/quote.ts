import packagesData from "../../data/packages.json";
import type { Package, PackageId, Quote, QuoteDraft } from "./types";

export const COMPANY_NAME = "Nemora" as const;
export const PAYMENT_TERMS = "40% advance / 60% on delivery";
export const VALIDITY_DAYS = 15;

export const packages = packagesData as Package[];

export function getPackageById(id: PackageId): Package {
  const pkg = packages.find((item) => item.id === id);
  if (!pkg) {
    throw new Error(`Unknown package: ${id}`);
  }
  return pkg;
}

export function titleCaseService(service: string): string {
  return service
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function buildQuoteTitle(service: string, packageName: string): string {
  return `Quotation for ${titleCaseService(service)} — ${packageName}`;
}

export function createEmptyDraft(): QuoteDraft {
  return {
    service: "",
    clientName: "",
    city: "",
    packageId: null,
    step: "service",
  };
}

export function buildQuote(draft: QuoteDraft): Quote {
  if (!draft.service.trim()) {
    throw new Error("Service is required to build a quote.");
  }
  if (!draft.packageId) {
    throw new Error("Package is required to build a quote.");
  }

  const pkg = getPackageById(draft.packageId);
  const now = new Date();

  return {
    id: `QT-${now.getTime()}`,
    companyName: COMPANY_NAME,
    title: buildQuoteTitle(draft.service, pkg.name),
    service: draft.service.trim(),
    clientName: draft.clientName.trim(),
    city: draft.city.trim(),
    packageId: pkg.id,
    packageName: pkg.name,
    price: pkg.price,
    features: [...pkg.features],
    createdAt: now.toISOString(),
    paymentTerms: PAYMENT_TERMS,
    validityDays: VALIDITY_DAYS,
  };
}

export function formatQuoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
