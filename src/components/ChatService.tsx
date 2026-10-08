"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
}

interface ChatServiceProps {
  initialService?: string;
  onSubmitService: (service: string) => void;
}

const SUGGESTIONS = ["Coffee shop", "Ice cream shop", "Salon", "Clinic", "Restaurant"];

export default function ChatService({ initialService = "", onSubmitService }: ChatServiceProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hi — I’m Nemora Quote. What business or service should we quote for?",
    },
  ]);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialService.trim()) {
      setMessages((current) => {
        if (current.some((m) => m.role === "user")) return current;
        return [
          ...current,
          { id: "prior", role: "user", text: initialService.trim() },
          {
            id: "prior-bot",
            role: "bot",
            text: `Got it — ${initialService.trim()}. Continue to optimize requirements for this client.`,
          },
        ];
      });
    }
  }, [initialService]);

  function sendService(serviceRaw: string) {
    const service = serviceRaw.trim();
    if (!service) {
      setError("Type a service, e.g. Coffee shop.");
      return;
    }
    setError("");
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", text: service },
      {
        id: `b-${Date.now()}`,
        role: "bot",
        text: `Great — quoting for “${service}”. Next, pick what the client needs so we can optimize the package.`,
      },
    ]);
    setInput("");
    window.setTimeout(() => onSubmitService(service), 450);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    sendService(input);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="mb-6 text-center sm:mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-forest/70">
          Nemora Quote
        </p>
        <h1 className="font-serif text-3xl text-forest sm:text-4xl">What are we building?</h1>
        <p className="mt-2 text-sm text-charcoal/60">
          Chat your service — then optimize, pick a package, fill client details on the PDF, and download.
        </p>
      </div>

      <div className="flex min-h-[420px] flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 shadow-[0_24px_60px_-28px_rgba(27,67,50,0.35)] backdrop-blur">
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={[
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              ].join(" ")}
            >
              <div
                className={[
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:text-[15px]",
                  message.role === "user"
                    ? "rounded-br-md bg-forest text-white"
                    : "rounded-bl-md bg-sage-soft text-charcoal",
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
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-charcoal/8 bg-white px-4 py-4 sm:px-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => sendService(hint)}
                className="rounded-full border border-charcoal/10 bg-sage-soft/50 px-3 py-1.5 text-xs font-medium text-charcoal/70 transition hover:border-forest/30 hover:text-forest"
              >
                {hint}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Coffee shop"
              className="min-w-0 flex-1 rounded-full border border-charcoal/10 bg-sage-soft/40 px-5 py-3.5 text-base outline-none transition placeholder:text-charcoal/35 focus:border-forest/40 focus:bg-white focus:ring-4 focus:ring-forest/10"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-forest px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-forest/20 transition hover:bg-forest-deep"
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
