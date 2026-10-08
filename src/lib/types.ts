export type PackageId = "basic" | "standard" | "premium";

export type QuoteStep = "chat" | "package" | "quote";

export type ProductType = "web" | "app" | "both";

export type QuoteStatus = "draft" | "sent" | "revision" | "accepted" | "declined";

export type RequirementTagId =
  | "gallery"
  | "whatsapp"
  | "maps"
  | "seo"
  | "contact_form"
  | "social"
  | "products"
  | "cms"
  | "dynamic"
  | "hosting"
  | "performance"
  | "online_menu";

export interface PackageFeature {
  description: string;
  amount: number;
}

export interface Package {
  id: PackageId;
  name: string;
  price: string;
  baseAmount: number;
  medal: string;
  features: PackageFeature[];
  highlighted?: boolean;
}

export interface QuoteDraft {
  service: string;
  clientName: string;
  mobile: string;
  city: string;
  packageId: PackageId | null;
  step: QuoteStep;
  briefNotes: string;
  requirementTags: RequirementTagId[];
  /** When true, buildQuote applies requirement optimization */
  optimizeForRequirements: boolean;
  productType: ProductType | null;
  outcomeIds: string[];
}

export interface QuoteLineItem {
  id: string;
  description: string;
  amount: number;
}

export interface Quote {
  id: string;
  companyName: "Nemora";
  title: string;
  service: string;
  clientName: string;
  mobile: string;
  city: string;
  packageId: PackageId;
  packageName: string;
  price: string;
  subtotalAmount: number;
  gstAmount: number;
  totalAmount: number;
  gstEnabled: boolean;
  gstPercent: number;
  lineItems: QuoteLineItem[];
  features: string[];
  createdAt: string;
  paymentTerms: string;
  validityDays: number;
  validityEndsAt: string;
  advancePercent: number;
  deliveryPercent: number;
  status: QuoteStatus;
  revision: number;
  parentQuoteId: string | null;
  briefNotes: string;
  requirementTags: RequirementTagId[];
  statusUpdatedAt: string;
  productType: ProductType | null;
  outcomeIds: string[];
}

export interface AppSettings {
  gstEnabledDefault: boolean;
  gstPercent: number;
  quotePrefix: string;
  validityDays: number;
}
