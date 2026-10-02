export type PackageId = "basic" | "standard" | "premium";

export type QuoteStep = "service" | "package" | "quote";

export interface Package {
  id: PackageId;
  name: string;
  price: string;
  medal: string;
  features: string[];
  highlighted?: boolean;
}

export interface QuoteDraft {
  service: string;
  clientName: string;
  city: string;
  packageId: PackageId | null;
  step: QuoteStep;
}

export interface Quote {
  id: string;
  companyName: "Nemora";
  title: string;
  service: string;
  clientName: string;
  city: string;
  packageId: PackageId;
  packageName: string;
  price: string;
  features: string[];
  createdAt: string;
  paymentTerms: string;
  validityDays: number;
}
