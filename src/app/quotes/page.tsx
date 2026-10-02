"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import QuotePreview from "@/components/QuotePreview";
import { formatQuoteDate } from "@/lib/quote";
import { deleteSavedQuote, loadSavedQuotes, saveDraft } from "@/lib/storage";
import type { Quote } from "@/lib/types";

export default function SavedQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setQuotes(loadSavedQuotes());
  }, []);

  const selected = quotes.find((quote) => quote.id === selectedId) ?? null;

  function handleDelete(id: string) {
    const next = deleteSavedQuote(id);
    setQuotes(next);
    if (selectedId === id) setSelectedId(null);
  }

  function handleEdit(quote: Quote) {
    saveDraft({
      service: quote.service,
      clientName: quote.clientName,
      city: quote.city,
      packageId: quote.packageId,
      step: "package",
    });
  }

  return (
    <div className="page-atmosphere">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-6 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-forest/70">
              Local library
            </p>
            <h1 className="mt-1 font-serif text-4xl text-forest">Saved quotes</h1>
            <p className="mt-2 text-charcoal/65">
              Quotes are stored in your browser&apos;s localStorage.
            </p>
          </div>
          <Link
            href="/quote/new"
            className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-md shadow-forest/20 transition hover:bg-forest-deep"
          >
            Create quotation
          </Link>
        </div>

        {quotes.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-forest/25 bg-white/70 px-8 py-16 text-center">
            <p className="font-serif text-2xl text-forest">No saved quotes yet</p>
            <p className="mt-2 text-charcoal/60">Generate a quotation and tap Save to keep it here.</p>
            <Link
              href="/quote/new"
              className="mt-6 inline-flex rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white"
            >
              Start a quote
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <ul className="space-y-3">
              {quotes.map((quote) => {
                const active = selectedId === quote.id;
                return (
                  <li key={quote.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(quote.id)}
                      className={[
                        "w-full rounded-2xl border px-5 py-4 text-left transition",
                        active
                          ? "border-forest bg-white shadow-md ring-2 ring-forest/20"
                          : "border-charcoal/10 bg-white/80 hover:border-forest/30",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-charcoal">{quote.title}</p>
                          <p className="mt-1 text-sm text-charcoal/55">
                            {formatQuoteDate(quote.createdAt)} · {quote.price}
                          </p>
                        </div>
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
                            quote.packageId === "premium"
                              ? "bg-gold/20 text-[#8A6D12]"
                              : "bg-sage text-forest",
                          ].join(" ")}
                        >
                          {quote.packageName}
                        </span>
                      </div>
                    </button>
                    <div className="mt-2 flex gap-2 px-1">
                      <Link
                        href="/quote/new?step=package"
                        onClick={() => handleEdit(quote)}
                        className="text-xs font-semibold text-forest hover:underline"
                      >
                        Edit as draft
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(quote.id)}
                        className="text-xs font-semibold text-red-700/80 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div>
              {selected ? (
                <QuotePreview quote={selected} showActions showStepHeading={false} />
              ) : (
                <div className="flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-charcoal/8 bg-white/60 text-charcoal/50">
                  Select a quote to preview
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
