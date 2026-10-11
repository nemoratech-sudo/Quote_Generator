const STORAGE_KEY = "nemora-niche-feedback-v1";
const MAX_ENTRIES = 200;

export interface NicheFeedbackEntry {
  id: string;
  at: number;
  service: string;
  predictedNicheId: string | null;
  correctedNicheId: string | null;
  /** true = user confirmed prediction */
  confirmed: boolean;
  source: "local" | "nvidia" | "unknown";
}

function readAll(): NicheFeedbackEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NicheFeedbackEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: NicheFeedbackEntry[]): void {
  if (typeof window === "undefined") return;
  const trimmed = entries.slice(-MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/** Save “Was this niche right?” answers for keyword training later. */
export function saveNicheFeedback(input: {
  service: string;
  predictedNicheId: string | null;
  correctedNicheId: string | null;
  confirmed: boolean;
  source?: "local" | "nvidia";
}): NicheFeedbackEntry {
  const entry: NicheFeedbackEntry = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    service: input.service.trim(),
    predictedNicheId: input.predictedNicheId,
    correctedNicheId: input.correctedNicheId,
    confirmed: input.confirmed,
    source: input.source ?? "unknown",
  };
  const all = readAll();
  all.push(entry);
  writeAll(all);
  return entry;
}

export function listNicheFeedback(): NicheFeedbackEntry[] {
  return readAll();
}

/** Keyword hints from corrections — for Admin / future auto-train. */
export function correctionHints(): { service: string; toNicheId: string }[] {
  return readAll()
    .filter((e) => !e.confirmed && e.correctedNicheId)
    .map((e) => ({
      service: e.service,
      toNicheId: e.correctedNicheId as string,
    }));
}
