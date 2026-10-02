import type { Quote, QuoteDraft } from "./types";
import { createEmptyDraft } from "./quote";

const DRAFT_KEY = "nemora-quote-draft";
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

export function loadSavedQuotes(): Quote[] {
  if (!canUseStorage()) return [];

  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Quote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuote(quote: Quote): Quote[] {
  if (!canUseStorage()) return [];

  const existing = loadSavedQuotes();
  const withoutDuplicate = existing.filter((item) => item.id !== quote.id);
  const next = [quote, ...withoutDuplicate];
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
