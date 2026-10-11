import vocabulary from "../../data/chat-vocabulary.json";
import {
  correctionNoteForLocale,
  detectReplyLocale,
  type ChatLocale,
} from "./reply-locale";

const DICTIONARY = new Set(
  (vocabulary.dictionary as string[]).map((w) => w.toLowerCase()),
);
const TYPO_ALIASES = vocabulary.typoAliases as Record<string, string>;
const TANGLISH_PHRASES = Object.entries(
  vocabulary.tanglishPhrases as Record<string, string>,
).sort((a, b) => b[0].length - a[0].length);
const TANGLISH_BUSINESS = Object.entries(
  vocabulary.tanglishBusiness as Record<string, string>,
).sort((a, b) => b[0].length - a[0].length);

export interface NormalizeResult {
  original: string;
  normalized: string;
  corrected: boolean;
  note: string | null;
  locale: ChatLocale;
  mappedFromTanglish: boolean;
}

function collapseSpaces(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Levenshtein distance — small chat tokens only. */
export function editDistance(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const prev = new Array<number>(t.length + 1);
  const curr = new Array<number>(t.length + 1);
  for (let j = 0; j <= t.length; j++) prev[j] = j;

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= t.length; j++) prev[j] = curr[j];
  }
  return prev[t.length];
}

function maxDistanceFor(word: string): number {
  if (word.length <= 3) return 0;
  if (word.length <= 5) return 1;
  if (word.length <= 8) return 2;
  return 2;
}

function correctToken(token: string): string {
  const lower = token.toLowerCase();
  if (!/[a-z]/i.test(lower)) return token;
  if (TYPO_ALIASES[lower]) return TYPO_ALIASES[lower];
  if (DICTIONARY.has(lower)) return lower;

  let best: string | null = null;
  let bestDist = Infinity;
  const limit = maxDistanceFor(lower);

  for (const candidate of DICTIONARY) {
    if (Math.abs(candidate.length - lower.length) > limit) continue;
    const dist = editDistance(lower, candidate);
    if (dist < bestDist && dist <= limit) {
      bestDist = dist;
      best = candidate;
    }
  }

  return best ?? token;
}

function mapExactOrContained(
  text: string,
  phrases: [string, string][],
): { text: string; mapped: boolean; from: string | null } {
  const lower = collapseSpaces(text).toLowerCase();

  for (const [from, to] of phrases) {
    if (lower === from) {
      return { text: to, mapped: true, from };
    }
  }

  for (const [from, to] of phrases) {
    if (from.length < 4) continue;
    if (!lower.includes(from)) continue;
    return {
      text: collapseSpaces(lower.split(from).join(to)),
      mapped: true,
      from,
    };
  }

  return { text: collapseSpaces(text), mapped: false, from: null };
}

/**
 * Fix typos + map Tanglish → English so help / list / salon still work.
 * Also detects whether replies should be Tanglish or English.
 */
export function normalizeUserText(raw: string): NormalizeResult {
  const original = collapseSpaces(raw);
  if (!original) {
    return {
      original: "",
      normalized: "",
      corrected: false,
      note: null,
      locale: "en",
      mappedFromTanglish: false,
    };
  }

  const command = mapExactOrContained(original, TANGLISH_PHRASES);
  if (command.mapped) {
    const locale = detectReplyLocale(original, { mappedFromTanglish: true });
    return {
      original,
      normalized: command.text,
      corrected: true,
      note: correctionNoteForLocale(
        locale,
        original,
        command.text,
        "tanglish_map",
        command.from,
      ),
      locale,
      mappedFromTanglish: true,
    };
  }

  const fixedTokens = original.split(" ").map(correctToken);
  let afterTypos = collapseSpaces(fixedTokens.join(" "));

  // Re-check Tanglish commands after typo fix (vanakam → vanakkam → hi)
  const commandAfterTypo = mapExactOrContained(afterTypos, TANGLISH_PHRASES);
  if (commandAfterTypo.mapped) {
    const locale = detectReplyLocale(original, { mappedFromTanglish: true });
    return {
      original,
      normalized: commandAfterTypo.text,
      corrected: true,
      note: correctionNoteForLocale(
        locale,
        original,
        commandAfterTypo.text,
        "tanglish_map",
        commandAfterTypo.from ?? original,
      ),
      locale,
      mappedFromTanglish: true,
    };
  }

  const business = mapExactOrContained(afterTypos, TANGLISH_BUSINESS);
  afterTypos = business.text;

  const normalized = afterTypos;
  const corrected = normalized.toLowerCase() !== original.toLowerCase();
  const mappedFromTanglish = business.mapped;
  const locale = detectReplyLocale(original, { mappedFromTanglish });

  let note: string | null = null;
  if (corrected) {
    if (business.mapped && business.from) {
      note = correctionNoteForLocale(
        locale,
        original,
        normalized,
        "business_map",
        business.from,
      );
    } else {
      note = correctionNoteForLocale(locale, original, normalized, "typo");
    }
  }

  return { original, normalized, corrected, note, locale, mappedFromTanglish };
}

/** Original + corrected + Tanglish expansions for niche keyword search. */
export function searchableServiceText(raw: string): string {
  const { original, normalized } = normalizeUserText(raw);
  const parts = new Set<string>([original.toLowerCase(), normalized.toLowerCase()]);
  for (const [from, to] of TANGLISH_BUSINESS) {
    const hay = `${original} ${normalized}`.toLowerCase();
    if (hay.includes(from)) parts.add(to.toLowerCase());
  }
  return Array.from(parts).join(" ");
}
