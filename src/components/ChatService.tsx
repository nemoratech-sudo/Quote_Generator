"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  listOutcomes,
  outcomesToTags,
  PLATFORM_OPTIONS,
  platformLabel,
  type OutcomeOption,
} from "@/lib/outcomes";
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

type Phase = "service" | "platform" | "outcomes" | "done";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
}

const SUGGESTIONS = [
  "Coffee shop",
  "Ice cream shop",
  "Salon",
  "Clinic",
  "Restaurant",
  "Gym",
  "Fashion store",
  "Tuition centre",
  "Real estate",
];

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
          Confirm ({selected.length})
        </button>
      </div>
    </div>
  );
}

export default function ChatService({ initialService = "", onComplete }: ChatServiceProps) {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("service");
  const [service, setService] = useState("");
  const [platformSelected, setPlatformSelected] = useState<ProductType[]>([]);
  const [outcomeSelected, setOutcomeSelected] = useState<string[]>([]);
  const [outcomeOptions, setOutcomeOptions] = useState<OutcomeOption[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hi — I’m Nemora Quote. What business should we quote for? (e.g. Coffee shop)",
    },
  ]);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase, platformSelected, outcomeSelected]);

  useEffect(() => {
    if (!initialService.trim() || bootstrapped.current) return;
    bootstrapped.current = true;
    beginWithService(initialService.trim(), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialService]);

  function pushMessages(...next: ChatMessage[]) {
    setMessages((current) => [...current, ...next]);
  }

  function beginWithService(value: string, addUserBubble: boolean) {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Type a service, e.g. Coffee shop.");
      return;
    }
    setError("");
    setService(trimmed);
    setInput("");
    setPlatformSelected([]);
    setOutcomeSelected([]);

    const nextMessages: ChatMessage[] = [];
    if (addUserBubble) {
      nextMessages.push({ id: `u-${Date.now()}`, role: "user", text: trimmed });
    }
    nextMessages.push({
      id: `b-platform-${Date.now()}`,
      role: "bot",
      text: `I understand you’re looking for a digital presence for “${trimmed}”. Choose what we should build:`,
    });
    pushMessages(...nextMessages);
    setPhase("platform");
  }

  function togglePlatform(id: string) {
    const typed = id as ProductType;
    setPlatformSelected((current) => (current[0] === typed ? [] : [typed]));
  }

  function confirmPlatform() {
    const productType = platformSelected[0];
    if (!productType) return;

    const options = listOutcomes(service, productType);
    setOutcomeOptions(options);
    // Pre-select a sensible starter set; user can Select all / Clear
    setOutcomeSelected(options.slice(0, Math.min(4, options.length)).map((o) => o.id));

    pushMessages(
      { id: `u-plat-${Date.now()}`, role: "user", text: platformLabel(productType) },
      {
        id: `b-out-${Date.now()}`,
        role: "bot",
        text: `Great — ${platformLabel(productType)} for “${service}”. Select the outcomes the client needs:`,
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
        text: "Perfect. I’ll open packages optimized for these outcomes.",
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (phase !== "service") return;
    beginWithService(input, true);
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
          Chat the business → choose Website or App → pick outcomes → get an optimized quote.
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
                  "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:text-[15px]",
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
              </div>
            </div>
          ))}

          {phase === "platform" && (
            <div className="flex justify-start">
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
            </div>
          )}

          {phase === "outcomes" && (
            <div className="flex justify-start">
              <SelectionPanel
                title="Select all that apply for this client"
                options={outcomeOptions.map((o) => ({ id: o.id, label: o.label }))}
                selected={outcomeSelected}
                multi
                onToggle={toggleOutcome}
                onSelectAll={() => setOutcomeSelected(outcomeOptions.map((o) => o.id))}
                onClear={() => setOutcomeSelected([])}
                onConfirm={confirmOutcomes}
                confirmDisabled={outcomeSelected.length === 0}
              />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-charcoal/8 bg-white px-4 py-4 sm:px-5">
          {phase === "service" && (
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => beginWithService(hint, true)}
                  className="rounded-full border border-charcoal/10 bg-sage-soft/50 px-3 py-1.5 text-xs font-medium text-charcoal/70 transition hover:border-forest/30 hover:text-forest"
                >
                  {hint}
                </button>
              ))}
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
