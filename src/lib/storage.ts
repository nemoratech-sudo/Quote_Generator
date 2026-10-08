import type { Quote, QuoteDraft } from "./types";
import { createEmptyDraft, normalizeQuote } from "./quote";

const DRAFT_KEY = "nemora-quote-draft";
const WORKING_QUOTE_KEY = "nemora-working-quote";
const SAVED_KEY = "nemora-saved-quotes";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function loadDraft(): QuoteDraft {
  if (!canUseStorage()) return createEmptyDraft();

  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return createEmptyDraft();
    const parsed = JSON.parse(raw) as Partial<QuoteDraft>;
    return {
      ...createEmptyDraft(),
      ...parsed,
    };
  } catch {
    return createEmptyDraft();
  }
}

export function saveDraft(draft: QuoteDraft): void {
  if (!canUseStorage()) return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  if (!canUseStorage()) return;
  sessionStorage.removeItem(DRAFT_KEY);
}

export function loadWorkingQuote(): Quote | null {
  if (!canUseStorage()) return null;

  try {
    const raw = sessionStorage.getItem(WORKING_QUOTE_KEY);
    if (!raw) return null;
    return normalizeQuote(JSON.parse(raw) as Partial<Quote>);
  } catch {
    return null;
  }
}

export function saveWorkingQuote(quote: Quote): void {
  if (!canUseStorage()) return;
  sessionStorage.setItem(WORKING_QUOTE_KEY, JSON.stringify(quote));
}

export function clearWorkingQuote(): void {
  if (!canUseStorage()) return;
  sessionStorage.removeItem(WORKING_QUOTE_KEY);
}

export function loadSavedQuotes(): Quote[] {
  if (!canUseStorage()) return [];

  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Quote>[];
    return Array.isArray(parsed) ? parsed.map((item) => normalizeQuote(item)) : [];
  } catch {
    return [];
  }
}

export function saveQuote(quote: Quote): Quote[] {
  if (!canUseStorage()) return [];

  const normalized = normalizeQuote(quote);
  const existing = loadSavedQuotes();
  const withoutDuplicate = existing.filter((item) => item.id !== normalized.id);
  const next = [normalized, ...withoutDuplicate];
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return next;
}

export function deleteSavedQuote(id: string): Quote[] {
  if (!canUseStorage()) return [];

  const next = loadSavedQuotes().filter((item) => item.id !== id);
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return next;
}

export function getSavedQuote(id: string): Quote | null {
  return loadSavedQuotes().find((item) => item.id === id) ?? null;
}

export function replaceAllQuotes(quotes: Quote[]): Quote[] {
  if (!canUseStorage()) return quotes;
  const normalized = quotes.map((q) => normalizeQuote(q));
  localStorage.setItem(SAVED_KEY, JSON.stringify(normalized));
  return normalized;
}

export function exportQuotesJson(): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      quotes: loadSavedQuotes(),
    },
    null,
    2,
  );
}

export function importQuotesJson(raw: string, mode: "merge" | "replace" = "merge"): Quote[] {
  const parsed = JSON.parse(raw) as { quotes?: Partial<Quote>[] } | Partial<Quote>[];
  const list = Array.isArray(parsed) ? parsed : parsed.quotes;
  if (!Array.isArray(list)) {
    throw new Error("Invalid backup file.");
  }

  const incoming = list.map((item) => normalizeQuote(item));
  if (mode === "replace") {
    return replaceAllQuotes(incoming);
  }

  const existing = loadSavedQuotes();
  const byId = new Map<string, Quote>();
  for (const quote of existing) byId.set(quote.id, quote);
  for (const quote of incoming) byId.set(quote.id, quote);
  return replaceAllQuotes(Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}
