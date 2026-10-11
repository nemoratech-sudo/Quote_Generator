import OpenAI from "openai";
import { NextResponse } from "next/server";
import { fewShotsForPrompt } from "@/lib/fewshots";
import {
  analyzeServiceLocal,
  commonOutcomeIds,
  getNicheById,
  nicheLabel,
  nichesForPrompt,
  type ServiceAnalysis,
} from "@/lib/outcomes";
import type { ProductType } from "@/lib/types";

/**
 * Prefer small/fast NIM models for classify-under-10s.
 * IDs must match what integrate.api.nvidia.com currently lists (EOL → 410).
 * Override with NVIDIA_MODEL in .env; on 410 we try the next candidate.
 */
const DEFAULT_MODEL = "deepseek-ai/deepseek-v4.1-flash";
/** Only try extras if the preferred model is EOL / not enabled (fast 4xx). */
const MODEL_FALLBACKS = [
  "z-ai/glm-5.3-flash",
  "openai/gpt-oss-20b",
  "nvidia/nemotron-3.5-lightning-30b-a3b",
] as const;
/** Hard SLA: AI must finish or we fall back to local. */
const WAIT_FOR_NVIDIA_MS = 10_000;
/** Give almost the full SLA to one live model (small models often 404 on free keys). */
const PER_MODEL_MS = 9_500;

/** Short-lived cache so repeat services don't hit NVIDIA again. */
const CACHE_TTL_MS = 10 * 60_000;
const analysisCache = new Map<string, { at: number; result: ServiceAnalysis }>();
/** Sticky model after first success — avoids burning the 10s budget on dead IDs. */
let workingModel: string | null = null;
const deadModels = new Set<string>();

function cacheKey(service: string): string {
  return service.trim().toLowerCase();
}

function getCached(service: string): ServiceAnalysis | null {
  const key = cacheKey(service);
  const hit = analysisCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    analysisCache.delete(key);
    return null;
  }
  return hit.result;
}

function setCached(service: string, result: ServiceAnalysis): void {
  analysisCache.set(cacheKey(service), { at: Date.now(), result });
}

interface AnalyzeBody {
  service?: string;
}

interface NvidiaAnalysisJson {
  nicheId?: string | null;
  confidence?: "high" | "medium" | "low";
  summary?: string;
  suggestedPlatform?: ProductType | null;
}

function createNvidiaClient(): OpenAI | null {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  return new OpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
    timeout: WAIT_FOR_NVIDIA_MS,
  });
}

function resolveModels(): string[] {
  const preferred = process.env.NVIDIA_MODEL?.trim() || DEFAULT_MODEL;
  const seen = new Set<string>();
  const models: string[] = [];
  for (const id of [workingModel, preferred, DEFAULT_MODEL, ...MODEL_FALLBACKS]) {
    if (!id || seen.has(id) || deadModels.has(id)) continue;
    seen.add(id);
    models.push(id);
  }
  return models;
}

function isUnavailableModelError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error ? Number(error.status) : NaN;
  // 410 = EOL; 404 = listed but not enabled for this NVIDIA account.
  if (status === 410 || status === 404) return true;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('"status":410') ||
    message.includes('"status":404') ||
    message.toLowerCase().includes("end of life") ||
    message.toLowerCase().includes("not found for account")
  );
}

function extractJson(text: string): NvidiaAnalysisJson | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as NvidiaAnalysisJson;
  } catch {
    return null;
  }
}

function sanitizeAnalysis(
  service: string,
  raw: NvidiaAnalysisJson | null,
  fallback: ServiceAnalysis,
): ServiceAnalysis {
  if (!raw) return fallback;

  const nicheId =
    raw.nicheId && (raw.nicheId === "fallback" || getNicheById(raw.nicheId))
      ? raw.nicheId === "fallback"
        ? null
        : raw.nicheId
      : fallback.nicheId;

  const platform =
    raw.suggestedPlatform === "web" ||
    raw.suggestedPlatform === "app" ||
    raw.suggestedPlatform === "both"
      ? raw.suggestedPlatform
      : fallback.suggestedPlatform;

  const confidence =
    raw.confidence === "high" || raw.confidence === "medium" || raw.confidence === "low"
      ? raw.confidence
      : fallback.confidence;

  const summary =
    typeof raw.summary === "string" && raw.summary.trim()
      ? raw.summary.trim()
      : `For “${service}” (${nicheLabel(nicheId)}), here are common requirements clients usually need.`;

  const selectedCommon = commonOutcomeIds(nicheId, platform === "both" ? null : platform);

  return {
    nicheId,
    nicheLabel: nicheLabel(nicheId),
    confidence,
    summary,
    suggestedPlatform: platform,
    commonOutcomeIds: selectedCommon.length ? selectedCommon : fallback.commonOutcomeIds,
    source: "nvidia",
  };
}

function isTimeoutError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    const msg = error.message.toLowerCase();
    if (name.includes("abort") || name.includes("timeout")) return true;
    if (msg.includes("aborted") || msg.includes("timeout")) return true;
  }
  return false;
}

async function analyzeWithNvidia(
  service: string,
  signal: AbortSignal,
  deadlineMs: number,
): Promise<ServiceAnalysis | null> {
  const openai = createNvidiaClient();
  if (!openai) return null;

  const niches = nichesForPrompt();
  const models = resolveModels();
  const fallback = analyzeServiceLocal(service);
  const nicheIds = niches.map((n) => n.id).join(", ");
  const nicheHints = niches.map((n) => `${n.id}=${n.label}`).join("; ");
  const shots = fewShotsForPrompt(8);
  const messages = [
    {
      role: "system" as const,
      content: [
        "Classify the CLIENT BUSINESS for a quotation chatbot.",
        `nicheId must be one of [${nicheIds}] or null. Labels: ${nicheHints}.`,
        'JSON only: {"nicheId":string|null,"confidence":"high"|"medium"|"low","summary":"one short sentence","suggestedPlatform":"web"|"app"|"both"}.',
        "Rules: prefer web; bakery≠cafe if cakes/pastry; yoga≠gym if yoga/meditation; never invent prices; if unclear use null+low.",
        "Examples:",
        shots,
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: service,
    },
  ];

  let lastError: unknown;
  for (const model of models) {
    if (signal.aborted) throw lastError ?? new Error("Aborted");
    const remaining = deadlineMs - Date.now();
    if (remaining <= 200) break;

    const attemptMs = Math.min(PER_MODEL_MS, remaining);
    const attempt = new AbortController();
    const onParentAbort = () => attempt.abort();
    signal.addEventListener("abort", onParentAbort, { once: true });
    const timer = setTimeout(() => attempt.abort(), attemptMs);

    try {
      const completion = await openai.chat.completions.create(
        {
          model,
          temperature: 0,
          top_p: 0.9,
          max_tokens: 100,
          stream: false,
          messages,
        },
        { signal: attempt.signal },
      );
      const content = completion.choices[0]?.message?.content ?? "";
      workingModel = model;
      return sanitizeAnalysis(service, extractJson(content), fallback);
    } catch (error) {
      lastError = error;
      if (signal.aborted) throw error;
      if (isUnavailableModelError(error)) {
        deadModels.add(model);
        if (workingModel === model) workingModel = null;
        console.warn(`NVIDIA model unavailable: ${model} — trying next.`);
        continue;
      }
      if (isTimeoutError(error) && !signal.aborted) {
        console.warn(`NVIDIA model slow (>${attemptMs}ms): ${model} — trying next.`);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", onParentAbort);
    }
  }

  if (lastError) throw lastError;
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeBody;
    const service = body.service?.trim() ?? "";
    if (!service) {
      return NextResponse.json({ error: "Service is required." }, { status: 400 });
    }

    const cached = getCached(service);
    if (cached) {
      return NextResponse.json(cached);
    }

    const local = analyzeServiceLocal(service);

    // Keyword already matched a niche — skip NVIDIA (instant).
    if (local.confidence === "high" && local.nicheId) {
      setCached(service, local);
      return NextResponse.json(local);
    }

    // Ambiguous only: AI with hard 10s budget, else local.
    const controller = new AbortController();
    const deadlineMs = Date.now() + WAIT_FOR_NVIDIA_MS;
    const timer = setTimeout(() => controller.abort(), WAIT_FOR_NVIDIA_MS);

    try {
      const nvidia = await analyzeWithNvidia(service, controller.signal, deadlineMs);
      if (nvidia) {
        setCached(service, nvidia);
        return NextResponse.json(nvidia);
      }
    } catch (error) {
      const aborted =
        controller.signal.aborted ||
        (error instanceof Error &&
          (error.name === "AbortError" ||
            error.name === "TimeoutError" ||
            error.message.toLowerCase().includes("aborted") ||
            error.message.toLowerCase().includes("timeout")));

      if (aborted) {
        console.warn("NVIDIA exceeded 10s SLA — using local niche match.");
      } else {
        console.error("NVIDIA analyze error", error);
      }
    } finally {
      clearTimeout(timer);
    }

    setCached(service, local);
    return NextResponse.json(local);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
