export type ChatLocale = "en" | "tanglish";

/** Words / stems that strongly signal Tanglish (Tamil in English letters). */
const TANGLISH_MARKERS = [
  "vanakkam",
  "vanakam",
  "epdi",
  "iruka",
  "irukinga",
  "enna",
  "venum",
  "venuma",
  "pannu",
  "panrathu",
  "podu",
  "keka",
  "mudiyuma",
  "puthu",
  "puthuya",
  "marupi",
  "nandri",
  "seri",
  "sari",
  "anna",
  "da",
  "di",
  "unga",
  "ungal",
  "kadai",
  "angadi",
  "kovil",
  "mandir",
  "maruthuva",
  "padippu",
  "unavu",
  "veedu",
  "ella",
  "ellam",
  "romba",
  "nalla",
  "illai",
  "illa",
  "aama",
  "aamaam",
  "sollu",
  "paru",
  "parkalam",
  "sapadu",
  "salon",
];

const ENGLISH_GREETINGS = /^(hi|hello|hey|good\s+(morning|afternoon|evening))[\s!.?]*$/i;

/**
 * Detect reply language from user text.
 * Tanglish markers / mapped Tanglish phrases → tanglish; else English.
 */
export function detectReplyLocale(
  original: string,
  options?: { mappedFromTanglish?: boolean },
): ChatLocale {
  if (options?.mappedFromTanglish) return "tanglish";

  const lower = original.trim().toLowerCase();
  if (!lower) return "en";
  if (ENGLISH_GREETINGS.test(lower)) return "en";

  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  let hits = 0;
  for (const t of tokens) {
    if (TANGLISH_MARKERS.includes(t)) hits += 1;
    // fuzzy short forms like vanakam
    if (t.startsWith("vanak") || t.startsWith("epdi") || t.startsWith("enna")) hits += 1;
  }
  if (hits >= 1) return "tanglish";

  // Multi-word Tanglish cues
  if (
    /\b(ella|venum|pannu|enna|epdi|kadai|kovil|mudiyuma|panrathu)\b/i.test(lower)
  ) {
    return "tanglish";
  }

  return "en";
}

export function correctionNoteForLocale(
  locale: ChatLocale,
  original: string,
  normalized: string,
  kind: "typo" | "tanglish_map" | "business_map",
  from?: string | null,
): string {
  if (locale === "tanglish") {
    if (kind === "tanglish_map" && from) {
      return `Seri — “${from}” nu purinjiduchu → “${normalized}”.`;
    }
    if (kind === "business_map" && from) {
      return `Tanglish “${from}” → “${normalized}” nu eduthukuren.`;
    }
    return `“${normalized}” nu meaning ah? Adha use panren.`;
  }

  if (kind === "tanglish_map" && from) {
    return `Understood Tanglish: “${from}” → “${normalized}”.`;
  }
  if (kind === "business_map" && from) {
    return `Matched Tanglish “${from}” → treating as “${normalized}”.`;
  }
  return `Did you mean “${normalized}”? Using that.`;
}
