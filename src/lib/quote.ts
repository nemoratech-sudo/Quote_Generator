import { formatINR, parseMoney, percentOf } from "./money";
import { DEFAULT_PACKAGES, getPackageById, loadPackages } from "./packages";
import { optimizeLineItems } from "./requirements";
import type {
  Package,
  PackageId,
  Quote,
  QuoteDraft,
  QuoteLineItem,
  QuoteStatus,
  RequirementTagId,
} from "./types";
import { loadSettings } from "./settings";

export const COMPANY_NAME = "Nemora" as const;
export const PAYMENT_TERMS = "40% advance / 60% on delivery";
export const VALIDITY_DAYS = 15;
export const ADVANCE_PERCENT = 40;
export const DELIVERY_PERCENT = 60;

export const DEFAULT_TERMS: string[] = [
  "This quotation is valid for the period stated above unless extended in writing by Nemora.",
  "Work begins after receipt of the advance payment as per the payment terms.",
  "Scope is limited to the deliverables listed. Additional features will be quoted separately.",
  "Client shall provide required content, branding assets, and feedback within agreed timelines.",
  "Final files / website access are handed over after clearance of the remaining balance.",
  "Nemora retains ownership of unused design concepts; licensed deliverables transfer on full payment.",
];

/** @deprecated use loadPackages() — kept for PackageCards SSR fallback */
export const packages = DEFAULT_PACKAGES;

export { formatINR, getPackageById };

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
    mobile: "",
    city: "",
    packageId: null,
    step: "chat",
    briefNotes: "",
    requirementTags: [],
    optimizeForRequirements: true,
  };
}

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  revision: "Revision",
  accepted: "Accepted",
  declined: "Declined",
};

export function setQuoteStatus(quote: Quote, status: QuoteStatus): Quote {
  return {
    ...quote,
    status,
    statusUpdatedAt: new Date().toISOString(),
  };
}

export function createRevision(quote: Quote, newId: string): Quote {
  const createdAt = new Date().toISOString();
  return withRecalculatedTotal({
    ...quote,
    id: newId,
    status: "revision",
    revision: (quote.revision || 1) + 1,
    parentQuoteId: quote.parentQuoteId ?? quote.id,
    createdAt,
    statusUpdatedAt: createdAt,
    validityEndsAt: validityEndDate(createdAt, quote.validityDays),
    lineItems: quote.lineItems.map((item) => ({
      ...item,
      id: createLineItemId(),
    })),
  });
}

export function createLineItemId(): string {
  return `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildLineItemsFromPackage(pkg: Package): QuoteLineItem[] {
  const stamp = Date.now();
  return pkg.features.map((feature, index) => ({
    id: `li-${stamp}-${index}`,
    description: feature.description,
    amount: feature.amount,
  }));
}

export function sumLineItems(lineItems: QuoteLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
}

export function validityEndDate(createdAt: string, validityDays: number): string {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + validityDays);
  return date.toISOString();
}

export function withRecalculatedTotal(quote: Quote): Quote {
  const subtotalAmount = sumLineItems(quote.lineItems);
  const gstPercent = quote.gstPercent ?? 18;
  const gstAmount = quote.gstEnabled ? Math.round((subtotalAmount * gstPercent) / 100) : 0;
  const totalAmount = subtotalAmount + gstAmount;
  const validityDays = quote.validityDays ?? VALIDITY_DAYS;

  return {
    ...quote,
    subtotalAmount,
    gstAmount,
    totalAmount,
    price: formatINR(totalAmount),
    features: quote.lineItems.map((item) => item.description),
    validityEndsAt: validityEndDate(quote.createdAt, validityDays),
    title: buildQuoteTitle(quote.service, quote.packageName),
  };
}

export function paymentSplit(totalAmount: number, advancePercent = ADVANCE_PERCENT) {
  const advance = percentOf(totalAmount, advancePercent);
  return {
    advance,
    onDelivery: Math.max(0, totalAmount - advance),
  };
}

export function buildQuote(draft: QuoteDraft, quoteId?: string): Quote {
  if (!draft.service.trim()) {
    throw new Error("Service is required to build a quote.");
  }
  if (!draft.packageId) {
    throw new Error("Package is required to build a quote.");
  }

  const settings = loadSettings();
  const pkg = getPackageById(draft.packageId, loadPackages());
  const now = new Date();
  const createdAt = now.toISOString();
  const tags = draft.requirementTags ?? [];
  const lineItems =
    draft.optimizeForRequirements && tags.length > 0
      ? optimizeLineItems(pkg, tags)
      : buildLineItemsFromPackage(pkg);

  const quote: Quote = {
    id: quoteId ?? `TEMP-${now.getTime()}`,
    companyName: COMPANY_NAME,
    title: buildQuoteTitle(draft.service, pkg.name),
    service: draft.service.trim(),
    clientName: draft.clientName.trim(),
    mobile: (draft.mobile ?? "").trim(),
    city: draft.city.trim(),
    packageId: pkg.id,
    packageName: pkg.name,
    price: formatINR(0),
    subtotalAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    gstEnabled: settings.gstEnabledDefault,
    gstPercent: settings.gstPercent,
    lineItems,
    features: lineItems.map((item) => item.description),
    createdAt,
    paymentTerms: PAYMENT_TERMS,
    validityDays: settings.validityDays,
    validityEndsAt: validityEndDate(createdAt, settings.validityDays),
    advancePercent: ADVANCE_PERCENT,
    deliveryPercent: DELIVERY_PERCENT,
    status: "draft",
    revision: 1,
    parentQuoteId: null,
    briefNotes: (draft.briefNotes ?? "").trim(),
    requirementTags: tags,
    statusUpdatedAt: createdAt,
  };

  return withRecalculatedTotal(quote);
}

export function resetQuoteToPackage(quote: Quote): Quote {
  const pkg = getPackageById(quote.packageId, loadPackages());
  const lineItems =
    quote.requirementTags.length > 0
      ? optimizeLineItems(pkg, quote.requirementTags)
      : buildLineItemsFromPackage(pkg);
  return withRecalculatedTotal({
    ...quote,
    packageName: pkg.name,
    lineItems,
  });
}

export function duplicateQuote(quote: Quote, newId: string): Quote {
  const createdAt = new Date().toISOString();
  return withRecalculatedTotal({
    ...quote,
    id: newId,
    status: "draft",
    revision: 1,
    parentQuoteId: null,
    createdAt,
    statusUpdatedAt: createdAt,
    validityEndsAt: validityEndDate(createdAt, quote.validityDays),
    lineItems: quote.lineItems.map((item) => ({
      ...item,
      id: createLineItemId(),
    })),
  });
}

export function moveLineItem(items: QuoteLineItem[], from: number, to: number): QuoteLineItem[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

/** Normalize older saved quotes that only had string features. */
export function normalizeQuote(raw: Partial<Quote> & { features?: unknown[] }): Quote {
  const packageId = (raw.packageId ?? "basic") as PackageId;
  let pkg: Package;
  try {
    pkg = getPackageById(packageId, DEFAULT_PACKAGES);
  } catch {
    pkg = DEFAULT_PACKAGES[0];
  }

  let lineItems: QuoteLineItem[] = Array.isArray(raw.lineItems) ? raw.lineItems : [];

  if (lineItems.length === 0 && Array.isArray(raw.features) && raw.features.length > 0) {
    lineItems = raw.features.map((feature, index) => {
      if (typeof feature === "string") {
        const match = pkg.features.find((f) => f.description === feature);
        return {
          id: `li-legacy-${index}`,
          description: feature,
          amount: match?.amount ?? 0,
        };
      }
      const item = feature as Partial<QuoteLineItem>;
      return {
        id: item.id ?? `li-legacy-${index}`,
        description: String(item.description ?? "Item"),
        amount: Number(item.amount) || 0,
      };
    });
  }

  if (lineItems.length === 0) {
    lineItems = buildLineItemsFromPackage(pkg);
  }

  const createdAt = raw.createdAt ?? new Date().toISOString();
  const validityDays = raw.validityDays ?? VALIDITY_DAYS;

  const base: Quote = {
    id: raw.id ?? `QT-${Date.now()}`,
    companyName: "Nemora",
    title: raw.title ?? buildQuoteTitle(raw.service ?? "Service", pkg.name),
    service: raw.service ?? "",
    clientName: raw.clientName ?? "",
    mobile: raw.mobile ?? "",
    city: raw.city ?? "",
    packageId,
    packageName: raw.packageName ?? pkg.name,
    price: raw.price ?? formatINR(0),
    subtotalAmount: raw.subtotalAmount ?? 0,
    gstAmount: raw.gstAmount ?? 0,
    totalAmount: raw.totalAmount ?? 0,
    gstEnabled: Boolean(raw.gstEnabled),
    gstPercent: typeof raw.gstPercent === "number" ? raw.gstPercent : 18,
    lineItems,
    features: Array.isArray(raw.features)
      ? raw.features.map((f) => (typeof f === "string" ? f : String((f as QuoteLineItem).description)))
      : lineItems.map((item) => item.description),
    createdAt,
    paymentTerms: raw.paymentTerms ?? PAYMENT_TERMS,
    validityDays,
    validityEndsAt: raw.validityEndsAt ?? validityEndDate(createdAt, validityDays),
    advancePercent: raw.advancePercent ?? ADVANCE_PERCENT,
    deliveryPercent: raw.deliveryPercent ?? DELIVERY_PERCENT,
    status: (raw.status as QuoteStatus) || "draft",
    revision: typeof raw.revision === "number" && raw.revision > 0 ? raw.revision : 1,
    parentQuoteId: raw.parentQuoteId ?? null,
    briefNotes: raw.briefNotes ?? "",
    requirementTags: Array.isArray(raw.requirementTags)
      ? (raw.requirementTags as RequirementTagId[])
      : [],
    statusUpdatedAt: raw.statusUpdatedAt ?? createdAt,
  };

  return withRecalculatedTotal(base);
}

export function formatQuoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function quotesFingerprint(quote: Quote): string {
  return JSON.stringify({
    id: quote.id,
    service: quote.service,
    clientName: quote.clientName,
    mobile: quote.mobile,
    city: quote.city,
    lineItems: quote.lineItems,
    gstEnabled: quote.gstEnabled,
    gstPercent: quote.gstPercent,
    status: quote.status,
    briefNotes: quote.briefNotes,
    requirementTags: quote.requirementTags,
  });
}

export function parsePackagePrice(price: string): number {
  return parseMoney(price);
}
