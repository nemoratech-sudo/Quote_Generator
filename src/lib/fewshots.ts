import fewshots from "../../data/chat-fewshots.json";

interface ClassifyExample {
  input: string;
  nicheId?: string | null;
  confidence?: string;
  suggestedPlatform?: string;
  summary?: string;
  note?: string;
}

/** Compact few-shots for NVIDIA classify prompt (keeps under token budget). */
export function fewShotsForPrompt(limit = 8): string {
  const examples = (fewshots.classifyExamples as ClassifyExample[])
    .filter((e) => !e.note && "nicheId" in e)
    .slice(0, limit);

  return examples
    .map((e) => {
      const niche = e.nicheId === null || e.nicheId === undefined ? "null" : e.nicheId;
      return `Q:${e.input} → {"nicheId":${JSON.stringify(niche === "null" ? null : niche)},"confidence":"${e.confidence}","suggestedPlatform":"${e.suggestedPlatform}"}`;
    })
    .join("\n");
}
