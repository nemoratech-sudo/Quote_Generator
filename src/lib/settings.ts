import type { AppSettings } from "./types";

const SETTINGS_KEY = "nemora-app-settings";
const COUNTER_KEY = "nemora-quote-counter";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export const DEFAULT_SETTINGS: AppSettings = {
  gstEnabledDefault: false,
  gstPercent: 18,
  quotePrefix: "NMR",
  validityDays: 15,
};

export function loadSettings(): AppSettings {
  if (!canUseStorage()) return { ...DEFAULT_SETTINGS };

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): AppSettings {
  if (!canUseStorage()) return settings;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

/** Sequential quote IDs: NMR-2026-0001 */
export function nextQuoteId(prefix?: string): string {
  const settings = loadSettings();
  const usePrefix = (prefix ?? settings.quotePrefix ?? "NMR").toUpperCase();
  const year = new Date().getFullYear();

  let counter = 1;
  if (canUseStorage()) {
    try {
      const raw = localStorage.getItem(COUNTER_KEY);
      counter = raw ? Number(raw) + 1 : 1;
      if (!Number.isFinite(counter) || counter < 1) counter = 1;
      localStorage.setItem(COUNTER_KEY, String(counter));
    } catch {
      counter = Date.now() % 10000;
    }
  }

  return `${usePrefix}-${year}-${String(counter).padStart(4, "0")}`;
}
