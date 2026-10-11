"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  allNicheOptions,
  commonOutcomeIds,
  listOutcomesForNiche,
  nicheLabel,
  outcomesToTags,
  PLATFORM_OPTIONS,
  platformLabel,
  type OutcomeOption,
  type ServiceAnalysis,
} from "@/lib/outcomes";
import {
  analyzingMessage,
  CHAT_QUICK_ACTIONS,
  classifyUserInput,
  explainAfterAnalysis,
  isGuideIntent,
  NICHE_PICK_EXAMPLES,
  nicheConfirmPrompt,
  replyForIntent,
  SERVICE_SUGGESTIONS,
  type ChatLocale,
} from "@/lib/chat-guide";
import {
  defaultChatMessages,
  loadChatHistory,
  saveChatHistory,
} from "@/lib/chat-history";
import { saveNicheFeedback } from "@/lib/niche-feedback";
import type { ProductType, RequirementTagId } from "@/lib/types";

export interface ChatQuoteResult {
  service: string;
  productType: ProductType;
  outcomeIds: string[];
  requirementTags: RequirementTagId[];
  briefNotes: string;
}

interface ChatServiceProps {
  initialService?: string;
  onComplete: (result: ChatQuoteResult) => void;
}

type Phase =
  | "service"
  | "analyzing"
  | "confirm_niche"
  | "platform"
  | "outcomes"
  | "done";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
  /** Show niche + example chips under this bot reply */
  picker?: "services";
}

function SelectionPanel({
  title,
  options,
  selected,
  multi,
  onToggle,
  onSelectAll,
  onClear,
  onConfirm,
  confirmDisabled,
  confirmLabel = "Confirm",
}: {
  title?: string;
  options: { id: string; label: string; hint?: string }[];
  selected: string[];
  multi: boolean;
  onToggle: (id: string) => void;
  onSelectAll?: () => void;
  onClear: () => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
  confirmLabel?: string;
}) {
  return (
    <div className="mt-2 w-full max-w-md overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-charcoal/8 px-3 py-2 text-xs">
        <div className="flex gap-3">
          {multi && onSelectAll && (
            <button
              type="button"
              onClick={onSelectAll}
              className="font-semibold text-forest hover:underline"
            >
              Select all
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="font-medium text-charcoal/50 hover:text-charcoal hover:underline"
          >
            Clear
          </button>
        </div>
        <span className="font-semibold text-charcoal/55">
          {selected.length} selected
        </span>
      </div>

      {title && (
        <p className="border-b border-charcoal/6 px-3 py-2 text-xs font-medium text-charcoal/55">
          {title}
        </p>
      )}

      <div className="grid max-h-64 gap-2 overflow-y-auto p-3 sm:max-h-80 sm:grid-cols-2">
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className={[
                "flex items-start gap-2.5 rounded-xl border px-3 py-3 text-left transition",
                active
                  ? "border-forest bg-sage-soft/80 ring-1 ring-forest/30"
                  : "border-charcoal/10 bg-white hover:border-forest/25",
              ].join(" ")}
            >
              <span
                className={[
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold",
                  multi ? "rounded" : "rounded-full",
                  active
                    ? "border-forest bg-forest text-white"
                    : "border-charcoal/25 text-transparent",
                ].join(" ")}
              >
                ✓
              </span>
              <span>
                <span className="block text-sm font-semibold text-charcoal">{option.label}</span>
                {option.hint && (
                  <span className="mt-0.5 block text-xs text-charcoal/50">{option.hint}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          disabled={confirmDisabled}
          onClick={onConfirm}
          className="w-full rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white transition enabled:hover:bg-forest-deep disabled:cursor-not-allowed disabled:bg-charcoal/25"
        >
          {confirmLabel} ({selected.length})
        </button>
      </div>
    </div>
  );
}

export default function ChatService({ initialService = "", onComplete }: ChatServiceProps) {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("service");
  const [service, setService] = useState("");
  const [analysis, setAnalysis] = useState<ServiceAnalysis | null>(null);
  const [platformSelected, setPlatformSelected] = useState<ProductType[]>([]);
  const [outcomeSelected, setOutcomeSelected] = useState<string[]>([]);
  const [outcomeOptions, setOutcomeOptions] = useState<OutcomeOption[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(defaultChatMessages);
  const [error, setError] = useState("");
  const [replyLocale, setReplyLocale] = useState<ChatLocale>("en");
  const [hydrated, setHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    const saved = loadChatHistory();
    if (saved?.messages?.length) {
      setMessages(saved.messages);
      setReplyLocale(saved.replyLocale);
    }
    setHydrated(true);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveChatHistory(messages, replyLocale);
  }, [messages, replyLocale, hydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase, platformSelected, outcomeSelected]);

  useEffect(() => {
    if (!initialService.trim() || bootstrapped.current) return;
    bootstrapped.current = true;
    void beginWithService(initialService.trim(), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialService]);

  function pushMessages(...next: ChatMessage[]) {
    setMessages((current) => [...current, ...next]);
  }

  async function beginWithService(
    value: string,
    addUserBubble: boolean,
    options?: {
      displayAs?: string;
      correctionNote?: string | null;
      locale?: ChatLocale;
    },
  ) {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Type a service, e.g. Coffee shop.");
      return;
    }
    const locale = options?.locale ?? replyLocale;
    setReplyLocale(locale);
    setError("");
    setService(trimmed);
    setInput("");
    setPlatformSelected([]);
    setOutcomeSelected([]);
    setAnalysis(null);
    setOutcomeOptions([]);

    const nextMessages: ChatMessage[] = [];
    if (addUserBubble) {
      nextMessages.push({
        id: `u-${Date.now()}`,
        role: "user",
        text: options?.displayAs?.trim() || trimmed,
      });
    }
    if (options?.correctionNote) {
      nextMessages.push({
        id: `b-fix-${Date.now()}`,
        role: "bot",
        text: options.correctionNote,
      });
    }
    nextMessages.push({
      id: `b-analyze-${Date.now()}`,
      role: "bot",
      text: analyzingMessage(trimmed, locale),
    });
    pushMessages(...nextMessages);
    setPhase("analyzing");

    let result: ServiceAnalysis;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: trimmed }),
      });
      if (!response.ok) throw new Error("Analyze failed");
      result = (await response.json()) as ServiceAnalysis;
    } catch {
      result = {
        nicheId: null,
        nicheLabel: "General business",
        confidence: "low",
        summary: `Couldn’t reach AI just now. Showing common needs for “${trimmed}” from our local catalog.`,
        suggestedPlatform: "web",
        commonOutcomeIds: [],
        source: "local",
      };
    }

    setAnalysis(result);
    if (result.suggestedPlatform) {
      setPlatformSelected([result.suggestedPlatform]);
    }

    pushMessages(
      {
        id: `b-summary-${Date.now()}`,
        role: "bot",
        text: explainAfterAnalysis(trimmed, result, locale),
      },
      {
        id: `b-niche-q-${Date.now()}`,
        role: "bot",
        text: nicheConfirmPrompt(result.nicheLabel, locale),
      },
    );
    setPhase("confirm_niche");
  }

  function confirmNicheCorrect() {
    if (!analysis) return;
    saveNicheFeedback({
      service,
      predictedNicheId: analysis.nicheId,
      correctedNicheId: analysis.nicheId,
      confirmed: true,
      source: analysis.source,
    });
    pushMessages(
      {
        id: `u-niche-ok-${Date.now()}`,
        role: "user",
        text: replyLocale === "tanglish" ? "Aama — niche correct" : "Yes, niche is right",
      },
      {
        id: `b-plat-${Date.now()}`,
        role: "bot",
        text:
          replyLocale === "tanglish"
            ? "Super. Inga enna build pannanum choose pannunga:"
            : "Great. Choose what we should build:",
      },
    );
    setPhase("platform");
  }

  function correctNiche(nicheId: string) {
    if (!analysis) return;
    const label = nicheLabel(nicheId);
    saveNicheFeedback({
      service,
      predictedNicheId: analysis.nicheId,
      correctedNicheId: nicheId,
      confirmed: false,
      source: analysis.source,
    });

    const platform = analysis.suggestedPlatform ?? "web";
    const next: ServiceAnalysis = {
      ...analysis,
      nicheId,
      nicheLabel: label,
      confidence: "high",
      summary: `Updated niche to ${label} for “${service}”.`,
      commonOutcomeIds: commonOutcomeIds(nicheId, platform === "both" ? null : platform),
      source: analysis.source,
    };
    setAnalysis(next);

    pushMessages(
      {
        id: `u-niche-fix-${Date.now()}`,
        role: "user",
        text:
          replyLocale === "tanglish"
            ? `Niche change → ${label}`
            : `Change niche → ${label}`,
      },
      {
        id: `b-plat-${Date.now()}`,
        role: "bot",
        text:
          replyLocale === "tanglish"
            ? `Save aachu. Ippo ${label} use panrom. Enna build pannanum choose pannunga:`
            : `Saved. Using ${label} now. Choose what we should build:`,
      },
    );
    setPhase("platform");
  }

  /** Reset quote steps only — never delete chat history. */
  function resetToService(options?: { locale?: ChatLocale; announce?: boolean }) {
    const locale = options?.locale ?? replyLocale;
    const announce = options?.announce !== false;
    setPhase("service");
    setService("");
    setAnalysis(null);
    setPlatformSelected([]);
    setOutcomeSelected([]);
    setOutcomeOptions([]);
    setError("");
    setReplyLocale(locale);
    if (announce) {
      pushMessages({
        id: `continue-${Date.now()}`,
        role: "bot",
        text:
          locale === "tanglish"
            ? "Seri — puthu business ku continue panrom. Chat history delete aagala. Client business type sollunga."
            : "Sure — let’s quote another business. Your chat history stays. What should we quote for next?",
      });
    }
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function togglePlatform(id: string) {
    const typed = id as ProductType;
    setPlatformSelected((current) => (current[0] === typed ? [] : [typed]));
  }

  function confirmPlatform() {
    const productType = platformSelected[0];
    if (!productType || !analysis) return;

    const options = listOutcomesForNiche(analysis.nicheId, productType);
    setOutcomeOptions(options);

    const commonForPlatform = analysis.commonOutcomeIds.filter((id) =>
      options.some((o) => o.id === id),
    );
    const fallbackCommon = options.filter((o) => o.common).map((o) => o.id);
    const preselected =
      commonForPlatform.length > 0
        ? commonForPlatform
        : fallbackCommon.length > 0
          ? fallbackCommon
          : options.slice(0, Math.min(4, options.length)).map((o) => o.id);

    setOutcomeSelected(preselected);

    pushMessages(
      { id: `u-plat-${Date.now()}`, role: "user", text: platformLabel(productType) },
      {
        id: `b-out-${Date.now()}`,
        role: "bot",
        text: `Common requirements for ${platformLabel(productType)} · ${analysis.nicheLabel} are pre-selected. Add or remove, then confirm:`,
      },
    );
    setPhase("outcomes");
  }

  function toggleOutcome(id: string) {
    setOutcomeSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function confirmOutcomes() {
    const productType = platformSelected[0];
    if (!productType || outcomeSelected.length === 0) return;

    const selectedOutcomes = outcomeOptions.filter((o) => outcomeSelected.includes(o.id));
    const tags = outcomesToTags(selectedOutcomes);
    const labels = selectedOutcomes.map((o) => o.label);

    pushMessages(
      {
        id: `u-out-${Date.now()}`,
        role: "user",
        text: labels.slice(0, 3).join(", ") + (labels.length > 3 ? ` +${labels.length - 3}` : ""),
      },
      {
        id: `b-done-${Date.now()}`,
        role: "bot",
        text: "Perfect. Opening packages optimized for these requirements.",
      },
    );
    setPhase("done");

    window.setTimeout(() => {
      onComplete({
        service,
        productType,
        outcomeIds: outcomeSelected,
        requirementTags: tags,
        briefNotes: `${platformLabel(productType)} · ${labels.join(", ")}`,
      });
    }, 500);
  }

  function handleUserMessage(raw: string, options?: { skipUserBubble?: boolean }) {
    const classified = classifyUserInput(raw);
    const { intent, serviceText, original, correctionNote, locale } = classified;
    const trimmed = original || raw.trim();
    if (!trimmed) {
      setError("Type a message or pick a suggestion below.");
      return;
    }
    setError("");
    setInput("");
    setReplyLocale(locale);

    if (intent === "start_over") {
      pushMessages(
        { id: `u-${Date.now()}`, role: "user", text: trimmed },
        ...(correctionNote
          ? [{ id: `b-fix-${Date.now()}`, role: "bot" as const, text: correctionNote }]
          : []),
        {
          id: `b-guide-${Date.now()}`,
          role: "bot",
          text: replyForIntent("start_over", locale),
        },
      );
      resetToService({ locale, announce: false });
      return;
    }

    if (isGuideIntent(intent)) {
      const userBubble: ChatMessage[] = options?.skipUserBubble
        ? []
        : [{ id: `u-${Date.now()}`, role: "user", text: trimmed }];
      const noteBubble: ChatMessage[] = correctionNote
        ? [{ id: `b-fix-${Date.now()}`, role: "bot", text: correctionNote }]
        : [];
      const showPicker = intent === "list_services" || intent === "quote_capability";
      pushMessages(...userBubble, ...noteBubble, {
        id: `b-guide-${Date.now()}`,
        role: "bot",
        text: replyForIntent(intent, locale),
        picker: showPicker ? "services" : undefined,
      });
      return;
    }

    void beginWithService(serviceText, true, {
      displayAs: trimmed,
      correctionNote,
      locale,
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (phase !== "service") return;
    handleUserMessage(input);
  }

  const inputDisabled = phase !== "service";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="mb-6 text-center sm:mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-forest/70">
          Nemora Quote
        </p>
        <h1 className="font-serif text-3xl text-forest sm:text-4xl">What are we building?</h1>
        <p className="mt-2 text-sm text-charcoal/60">
          Chatbot analyzes the business → suggests common needs → package → optimized PDF.
        </p>
      </div>

      <div className="flex min-h-[480px] flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/95 shadow-[0_24px_60px_-28px_rgba(27,67,50,0.35)] backdrop-blur">
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={["flex", message.role === "user" ? "justify-end" : "justify-start"].join(
                " ",
              )}
            >
              <div
                className={[
                  "max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed sm:text-[15px]",
                  message.role === "user"
                    ? "rounded-br-md bg-forest text-white"
                    : "rounded-bl-md border-l-4 border-forest bg-white text-charcoal shadow-sm ring-1 ring-charcoal/8",
                ].join(" ")}
              >
                {message.role === "bot" && (
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-forest/55">
                    Nemora
                  </p>
                )}
                {message.text}
                {message.role === "bot" && message.picker === "services" && (
                  <div className="mt-3 space-y-3 border-t border-charcoal/8 pt-3">
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-forest/65">
                        Business types
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {allNicheOptions().map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            disabled={phase !== "service"}
                            onClick={() =>
                              void beginWithService(
                                NICHE_PICK_EXAMPLES[n.id] ?? n.label,
                                true,
                                { locale: replyLocale },
                              )
                            }
                            className="rounded-full border border-forest/25 bg-forest/5 px-3 py-1.5 text-xs font-semibold text-forest transition hover:border-forest/40 hover:bg-forest/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {n.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/45">
                        Quick examples
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SERVICE_SUGGESTIONS.map((hint) => (
                          <button
                            key={hint}
                            type="button"
                            disabled={phase !== "service"}
                            onClick={() =>
                              void beginWithService(hint, true, { locale: replyLocale })
                            }
                            className="rounded-full border border-charcoal/10 bg-sage-soft/50 px-3 py-1.5 text-xs font-medium text-charcoal/70 transition hover:border-forest/30 hover:text-forest disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {hint}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {phase === "analyzing" && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border-l-4 border-forest bg-sage-soft/60 px-4 py-3 text-sm text-charcoal/70 ring-1 ring-charcoal/8">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-forest" />
                  Running AI analysis…
                </span>
              </div>
            </div>
          )}

          {phase === "confirm_niche" && analysis && (
            <div className="flex w-full max-w-md flex-col items-start gap-3">
              <button
                type="button"
                onClick={confirmNicheCorrect}
                className="w-full rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white transition hover:bg-forest-deep"
              >
                {replyLocale === "tanglish"
                  ? `Aama — ${analysis.nicheLabel} correct`
                  : `Yes — ${analysis.nicheLabel} is right`}
              </button>
              <p className="text-xs font-medium text-charcoal/55">
                {replyLocale === "tanglish"
                  ? "Illa correct niche choose pannunga:"
                  : "Or pick the correct niche:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {allNicheOptions().map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => correctNiche(n.id)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      analysis.nicheId === n.id
                        ? "border-forest bg-forest/10 text-forest"
                        : "border-charcoal/10 bg-white text-charcoal/70 hover:border-forest/30 hover:text-forest",
                    ].join(" ")}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={resetToService}
                className="text-xs font-semibold text-forest hover:underline"
              >
                Change service
              </button>
            </div>
          )}

          {phase === "platform" && (
            <div className="flex flex-col items-start gap-2">
              <SelectionPanel
                options={PLATFORM_OPTIONS.map((p) => ({
                  id: p.id,
                  label: p.label,
                  hint: p.hint,
                }))}
                selected={platformSelected}
                multi={false}
                onToggle={togglePlatform}
                onClear={() => setPlatformSelected([])}
                onConfirm={confirmPlatform}
                confirmDisabled={platformSelected.length === 0}
              />
              <button
                type="button"
                onClick={resetToService}
                className="text-xs font-semibold text-forest hover:underline"
              >
                Change service
              </button>
            </div>
          )}

          {phase === "outcomes" && (
            <div className="flex flex-col items-start gap-2">
              <SelectionPanel
                title="Common needs are pre-selected — adjust for this client"
                options={outcomeOptions.map((o) => ({
                  id: o.id,
                  label: o.label,
                  hint: o.common ? "Common for this niche" : undefined,
                }))}
                selected={outcomeSelected}
                multi
                onToggle={toggleOutcome}
                onSelectAll={() => setOutcomeSelected(outcomeOptions.map((o) => o.id))}
                onClear={() => setOutcomeSelected([])}
                onConfirm={confirmOutcomes}
                confirmDisabled={outcomeSelected.length === 0}
                confirmLabel="Continue to packages"
              />
              <button
                type="button"
                onClick={resetToService}
                className="text-xs font-semibold text-forest hover:underline"
              >
                Change service
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-charcoal/8 bg-white px-4 py-4 sm:px-5">
          {phase === "service" && (
            <div className="mb-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                {CHAT_QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() =>
                      handleUserMessage(action.message, { skipUserBubble: false })
                    }
                    className="rounded-full border border-forest/25 bg-forest/5 px-3 py-1.5 text-xs font-semibold text-forest transition hover:border-forest/40"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {SERVICE_SUGGESTIONS.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => void beginWithService(hint, true)}
                    className="rounded-full border border-charcoal/10 bg-sage-soft/50 px-3 py-1.5 text-xs font-medium text-charcoal/70 transition hover:border-forest/30 hover:text-forest"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              disabled={inputDisabled}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                inputDisabled
                  ? "Use the options above to continue…"
                  : "e.g. Coffee shop"
              }
              className="min-w-0 flex-1 rounded-full border border-charcoal/10 bg-sage-soft/40 px-5 py-3.5 text-base outline-none transition placeholder:text-charcoal/35 focus:border-forest/40 focus:bg-white focus:ring-4 focus:ring-forest/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={inputDisabled}
              className="shrink-0 rounded-full bg-forest px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-forest/20 transition hover:bg-forest-deep disabled:cursor-not-allowed disabled:bg-charcoal/25 disabled:shadow-none"
            >
              Send
            </button>
          </form>
          {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}
