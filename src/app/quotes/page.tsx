"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import {
  deleteSavedQuote,
  exportQuotesJson,
  importQuotesJson,
  loadSavedQuotes,
  saveDraft,
  saveQuote,
  saveWorkingQuote,
} from "@/lib/storage";
import {
  createRevision,
  duplicateQuote,
  formatQuoteDate,
  STATUS_LABELS,
} from "@/lib/quote";
import { nextQuoteId } from "@/lib/settings";
import type { PackageId, Quote, QuoteStatus } from "@/lib/types";

function draftFromQuote(quote: Quote) {
  return {
    service: quote.service,
    clientName: quote.clientName,
    mobile: quote.mobile ?? "",
    city: quote.city,
    packageId: quote.packageId,
    step: "quote" as const,
    briefNotes: quote.briefNotes,
    requirementTags: quote.requirementTags,
    optimizeForRequirements: true,
  };
}

export default function SavedQuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [query, setQuery] = useState("");
  const [packageFilter, setPackageFilter] = useState<PackageId | "all">("all");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuotes(loadSavedQuotes());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (packageFilter !== "all" && quote.packageId !== packageFilter) return false;
      if (statusFilter !== "all" && quote.status !== statusFilter) return false;
      if (!q) return true;
      return (
        quote.title.toLowerCase().includes(q) ||
        quote.clientName.toLowerCase().includes(q) ||
        quote.service.toLowerCase().includes(q) ||
        quote.city.toLowerCase().includes(q) ||
        quote.id.toLowerCase().includes(q) ||
        quote.briefNotes.toLowerCase().includes(q)
      );
    });
  }, [quotes, query, packageFilter, statusFilter]);

  function handleDelete(id: string) {
    setQuotes(deleteSavedQuote(id));
  }

  function handleEdit(quote: Quote) {
    saveDraft({
      ...draftFromQuote(quote),
      step: "optimize",
    });
  }

  function handleDuplicate(quote: Quote) {
    const copy = duplicateQuote(quote, nextQuoteId());
    setQuotes(saveQuote(copy));
    setMessage(`Duplicated as ${copy.id}`);
  }

  function handleRevision(quote: Quote) {
    saveQuote(quote);
    const revision = createRevision(quote, nextQuoteId());
    setQuotes(saveQuote(revision));
    saveWorkingQuote(revision);
    saveDraft(draftFromQuote(revision));
    setMessage(`Revision ${revision.revision} created — opening…`);
    router.push(`/quotes/${encodeURIComponent(revision.id)}`);
  }

  function handleExport() {
    const blob = new Blob([exportQuotesJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nemora-quotes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Backup downloaded.");
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const next = importQuotesJson(text, "merge");
      setQuotes(next);
      setMessage(`Imported — ${next.length} quote(s) in library.`);
    } catch {
      setMessage("Import failed. Check the JSON file.");
    }
    event.target.value = "";
  }

  function openAsWorking(quote: Quote) {
    saveWorkingQuote(quote);
    saveDraft(draftFromQuote(quote));
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
            <p className="mt-2 max-w-lg text-charcoal/65">
              Track Draft → Sent → Revision → Accepted. Duplicate or revise after client feedback.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-full border border-charcoal/15 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-forest/30"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-charcoal/15 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-forest/30"
            >
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />
            <Link
              href="/quote/new"
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-forest/20 transition hover:bg-forest-deep"
            >
              Create quotation
            </Link>
          </div>
        </div>

        {message && (
          <p className="mb-4 rounded-xl bg-sage/60 px-4 py-3 text-sm font-medium text-forest">
            {message}
          </p>
        )}

        {quotes.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 lg:flex-row">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client, service, brief, ID…"
              className="w-full flex-1 rounded-full border border-charcoal/10 bg-white px-5 py-3 text-sm outline-none focus:border-forest/30"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | "all")}
              className="rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-medium text-charcoal outline-none focus:border-forest/30"
            >
              <option value="all">All statuses</option>
              {(Object.keys(STATUS_LABELS) as QuoteStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value as PackageId | "all")}
              className="rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-medium text-charcoal outline-none focus:border-forest/30"
            >
              <option value="all">All packages</option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        )}

        {quotes.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-forest/25 bg-white/70 px-8 py-16 text-center">
            <p className="font-serif text-2xl text-forest">Your quote library is empty</p>
            <p className="mx-auto mt-2 max-w-md text-charcoal/60">
              Capture a client brief, generate an optimized quote, then Save.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/quote/new"
                className="inline-flex rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white"
              >
                Start a quote
              </Link>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex rounded-full border border-charcoal/15 bg-white px-5 py-3 text-sm font-semibold text-charcoal"
              >
                Import backup
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[1.5rem] border border-charcoal/10 bg-white/70 px-8 py-12 text-center">
            <p className="font-serif text-xl text-forest">No matches</p>
            <p className="mt-2 text-charcoal/60">Try a different search or filter.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((quote) => (
              <li
                key={quote.id}
                className="rounded-2xl border border-charcoal/10 bg-white/90 px-5 py-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/quotes/${encodeURIComponent(quote.id)}`}
                      onClick={() => openAsWorking(quote)}
                      className="font-semibold text-charcoal hover:text-forest"
                    >
                      {quote.title}
                    </Link>
                    <p className="mt-1 text-sm text-charcoal/55">
                      {quote.id}
                      {quote.revision > 1 ? ` · Rev ${quote.revision}` : ""} ·{" "}
                      {formatQuoteDate(quote.createdAt)} · {quote.price}
                      {quote.clientName ? ` · ${quote.clientName}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-charcoal/8 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-charcoal/70">
                      {STATUS_LABELS[quote.status]}
                    </span>
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
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/quotes/${encodeURIComponent(quote.id)}`}
                    onClick={() => openAsWorking(quote)}
                    className="text-xs font-semibold text-forest hover:underline"
                  >
                    Open
                  </Link>
                  <Link
                    href="/quote/new?step=optimize"
                    onClick={() => handleEdit(quote)}
                    className="text-xs font-semibold text-forest hover:underline"
                  >
                    Edit as draft
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRevision(quote)}
                    className="text-xs font-semibold text-[#8A6D12] hover:underline"
                  >
                    Create revision
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(quote)}
                    className="text-xs font-semibold text-forest hover:underline"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(quote.id)}
                    className="text-xs font-semibold text-red-700/80 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
