"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
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

const EXPLORE_CHIPS = [
  { label: "Help", message: "help" },
  { label: "List services", message: "list all services" },
  { label: "E-commerce?", message: "do you do ecommerce" },
] as const;

/** Deterministic 12h clock — avoids SSR/client locale casing mismatches (PM vs pm). */
function formatChatTime(at: number): string {
  const d = new Date(at);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const hour12 = hours % 12 || 12;
  const period = hours < 12 ? "AM" : "PM";
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export interface ChatQuoteResult {
  service: string;
  productType: ProductType;
  outcomeIds: string[];
  requirementTags: RequirementTagId[];
  briefNotes: string;
  nicheId: string | null;
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
  at?: number;
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
    <div className="mt-2 w-full max-w-md overflow-hidden rounded-2xl border border-ocean/15 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-ocean/10 px-3 py-2 text-xs">
        <div className="flex gap-3">
          {multi && onSelectAll && (
            <button
              type="button"
              onClick={onSelectAll}
              className="font-semibold text-ocean hover:underline"
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
        <p className="border-b border-ocean/8 px-3 py-2 text-xs font-medium text-charcoal/55">
          {title}
        </p>
      )}

      <div className="grid max-h-52 gap-2 overflow-y-auto p-3 sm:max-h-72 sm:grid-cols-2">
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
                  ? "border-nemo bg-nemo/10 ring-1 ring-nemo/25"
                  : "border-ocean/10 bg-white hover:border-ocean/30",
              ].join(" ")}
            >
              <span
                className={[
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold",
                  multi ? "rounded" : "rounded-full",
                  active
                    ? "border-nemo bg-nemo text-white"
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
          className="w-full rounded-xl bg-nemo px-4 py-3 text-sm font-semibold text-white transition enabled:hover:bg-nemo-deep disabled:cursor-not-allowed disabled:bg-charcoal/25"
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
  /** -1 = live draft; 0..n-1 indexes into sent user messages (oldest → newest) */
  const historyIndexRef = useRef(-1);
  const draftBeforeHistoryRef = useRef("");

  useEffect(() => {
    const stamp = Date.now();
    const saved = loadChatHistory();
    if (saved?.messages?.length) {
      setMessages(
        saved.messages.map((m) => ({
          ...m,
          at: typeof m.at === "number" ? m.at : stamp,
        })),
      );
      setReplyLocale(saved.replyLocale);
    } else {
      setMessages((current) =>
        current.map((m) => ({ ...m, at: m.at ?? stamp })),
      );
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
    const stamped = next.map((m) => ({ ...m, at: m.at ?? Date.now() }));
    setMessages((current) => [...current, ...stamped]);
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
        nicheId: analysis?.nicheId ?? null,
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
    historyIndexRef.current = -1;
    draftBeforeHistoryRef.current = "";
    handleUserMessage(input);
  }

  function sentInputHistory(): string[] {
    return messages.filter((m) => m.role === "user").map((m) => m.text);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (inputDisabled) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    const history = sentInputHistory();
    if (history.length === 0) return;

    // Terminal-style: browse prior sends; don't move the text caret
    event.preventDefault();

    if (event.key === "ArrowUp") {
      if (historyIndexRef.current === -1) {
        draftBeforeHistoryRef.current = input;
        historyIndexRef.current = history.length - 1;
      } else if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
      } else {
        return;
      }
      setInput(history[historyIndexRef.current] ?? "");
      return;
    }

    // ArrowDown
    if (historyIndexRef.current === -1) return;
    if (historyIndexRef.current < history.length - 1) {
      historyIndexRef.current += 1;
      setInput(history[historyIndexRef.current] ?? "");
      return;
    }
    historyIndexRef.current = -1;
    setInput(draftBeforeHistoryRef.current);
  }

  const inputDisabled = phase !== "service";

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* Full-width top bar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ocean/10 bg-white px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex min-w-0 items-center gap-2.5">
          <Image
            src="/brand/nemora-logo.jpg"
            alt="Nemora"
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
            priority
          />
          <span className="min-w-0">
            <span className="block font-serif text-2xl leading-none tracking-tight text-ocean sm:text-[1.75rem]">
              Nemora
            </span>
            <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal/40 sm:block">
              Quotes
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => handleUserMessage("help")}
            className="rounded-full px-2.5 py-2 text-sm font-medium text-charcoal/65 transition hover:bg-sky-mist hover:text-ocean sm:px-3"
          >
            Help
          </button>
          <Link
            href="/admin"
            className="rounded-full px-2.5 py-2 text-sm font-medium text-charcoal/65 transition hover:bg-sky-mist hover:text-ocean sm:px-3"
          >
            Admin
          </Link>
          <Link
            href="/quotes"
            className="rounded-full px-2.5 py-2 text-sm font-medium text-charcoal/65 transition hover:bg-sky-mist hover:text-ocean sm:px-3"
          >
            Saved
          </Link>
          <Link
            href="/quote/new"
            className="rounded-full bg-ocean px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ocean-deep sm:px-4"
          >
            New quote
          </Link>
        </nav>
      </header>

      {/* Full-screen chat: messages scroll; composer stays pinned */}
      <section className="nemo-chat-pane min-h-0 flex-1">
          <div className="nemo-chat-scroll w-full space-y-4 px-3 py-4 sm:px-5 sm:py-5 lg:px-8">
            {messages.map((message) => (
              <div
                key={message.id}
                className={[
                  "flex flex-col",
                  message.role === "user" ? "items-end" : "items-start",
                ].join(" ")}
              >
                <div
                  className={[
                    "max-w-[min(100%,48rem)] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed sm:text-[15px]",
                    message.role === "user"
                      ? "rounded-[1.25rem] rounded-br-md bg-nemo text-white shadow-md shadow-nemo/25"
                      : "w-full rounded-[1.25rem] rounded-bl-md border border-sky-mist bg-white text-charcoal shadow-sm sm:w-auto sm:max-w-[min(100%,48rem)]",
                  ].join(" ")}
                >
                  {message.text}
                  {message.role === "bot" && message.picker === "services" && (
                    <div className="mt-3 space-y-3 border-t border-sky-mist pt-3">
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-nemo">
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
                              className="rounded-full border border-nemo/45 bg-white px-3 py-1.5 text-xs font-semibold text-nemo transition hover:bg-nemo/10 disabled:opacity-40"
                            >
                              {n.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ocean/55">
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
                              className="rounded-full border border-ocean/15 bg-sky-mist/80 px-3 py-1.5 text-xs font-medium text-ocean transition hover:border-ocean/35 disabled:opacity-40"
                            >
                              {hint}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {hydrated && message.at != null && (
                  <p className="mt-1 px-1 text-[11px] text-charcoal/40">
                    {formatChatTime(message.at)}
                  </p>
                )}
              </div>
            ))}

            {phase === "analyzing" && (
              <div className="flex justify-start" role="status" aria-label="Analyzing">
                <div className="nemo-swim-stage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/chat/nemo-swim.svg" alt="" width={36} height={22} />
                </div>
              </div>
            )}

            {phase === "confirm_niche" && analysis && (
              <div className="flex w-full max-w-md flex-col items-start gap-3">
                <button
                  type="button"
                  onClick={confirmNicheCorrect}
                  className="w-full rounded-xl bg-nemo px-4 py-3 text-sm font-semibold text-white transition hover:bg-nemo-deep"
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
                          ? "border-nemo bg-nemo/10 text-nemo-deep"
                          : "border-ocean/15 bg-white text-charcoal/70 hover:border-ocean/40",
                      ].join(" ")}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => resetToService()}
                  className="text-xs font-semibold text-ocean hover:underline"
                >
                  Change service
                </button>
              </div>
            )}

            {phase === "platform" && (
              <div className="flex w-full flex-col items-start gap-2">
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
                  onClick={() => resetToService()}
                  className="text-xs font-semibold text-ocean hover:underline"
                >
                  Change service
                </button>
              </div>
            )}

            {phase === "outcomes" && (
              <div className="flex w-full flex-col items-start gap-2">
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
                  onClick={() => resetToService()}
                  className="text-xs font-semibold text-ocean hover:underline"
                >
                  Change service
                </button>
              </div>
            )}

            {phase === "service" && (
              <div className="pt-1">
                <p className="mb-2 text-xs font-medium text-charcoal/45">
                  You might want to explore:
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXPLORE_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleUserMessage(chip.message)}
                      className="rounded-full border border-nemo/50 bg-white px-3.5 py-1.5 text-xs font-semibold text-nemo transition hover:bg-nemo/10"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="nemo-chat-composer px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:py-4 lg:px-8">
            <form
              onSubmit={handleSubmit}
              className="flex w-full items-center gap-2.5"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                disabled={inputDisabled}
                onChange={(e) => {
                  historyIndexRef.current = -1;
                  setInput(e.target.value);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={
                  inputDisabled
                    ? "Use the options above to continue…"
                    : "Type your message..."
                }
                className="min-w-0 flex-1 rounded-full border border-charcoal/10 bg-[#f7fafc] px-5 py-3.5 text-base outline-none transition placeholder:text-charcoal/35 focus:border-ocean/30 focus:bg-white focus:ring-4 focus:ring-ocean/10 disabled:opacity-60"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={inputDisabled || !input.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nemo text-white shadow-md shadow-nemo/30 transition hover:bg-nemo-deep disabled:cursor-not-allowed disabled:bg-charcoal/25 disabled:shadow-none"
                aria-label="Send"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 12L20 4L13 20L11 13L4 12Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </form>
            {error && (
              <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
            )}
          </div>
      </section>
    </div>
  );
}
