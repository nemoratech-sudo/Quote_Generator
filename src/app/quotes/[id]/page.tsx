"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import QuotePreview from "@/components/QuotePreview";
import SiteHeader from "@/components/SiteHeader";
import {
  createRevision,
  quotesFingerprint,
  resetQuoteToPackage,
  setQuoteStatus,
} from "@/lib/quote";
import { nextQuoteId } from "@/lib/settings";
import {
  getSavedQuote,
  saveDraft,
  saveQuote,
  saveWorkingQuote,
} from "@/lib/storage";
import type { Quote, QuoteStatus } from "@/lib/types";

export default function SavedQuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [missing, setMissing] = useState(false);
  const [savedFingerprint, setSavedFingerprint] = useState("");
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const found = getSavedQuote(id);
    if (!found) {
      setMissing(true);
      return;
    }
    setQuote(found);
    setSavedFingerprint(quotesFingerprint(found));
    saveWorkingQuote(found);
    saveDraft({
      service: found.service,
      clientName: found.clientName,
      mobile: found.mobile ?? "",
      city: found.city,
      packageId: found.packageId,
      step: "quote",
      briefNotes: found.briefNotes,
      requirementTags: found.requirementTags,
      optimizeForRequirements: true,
    });
  }, [id]);

  function handleChange(next: Quote) {
    setQuote(next);
    saveWorkingQuote(next);
    setSaved(false);
  }

  function handleSave() {
    if (!quote) return;
    saveQuote(quote);
    setSavedFingerprint(quotesFingerprint(quote));
    setSaved(true);
  }

  function handleStatusChange(status: QuoteStatus) {
    if (!quote) return;
    const next = setQuoteStatus(quote, status);
    handleChange(next);
    saveQuote(next);
    setSavedFingerprint(quotesFingerprint(next));
    setSaved(true);
    setMessage(`Marked as ${status}.`);
  }

  function handleCreateRevision() {
    if (!quote) return;
    saveQuote(quote);
    const revision = createRevision(quote, nextQuoteId());
    saveQuote(revision);
    saveWorkingQuote(revision);
    saveDraft({
      service: revision.service,
      clientName: revision.clientName,
      mobile: revision.mobile,
      city: revision.city,
      packageId: revision.packageId,
      step: "quote",
      briefNotes: revision.briefNotes,
      requirementTags: revision.requirementTags,
      optimizeForRequirements: true,
    });
    router.push(`/quotes/${encodeURIComponent(revision.id)}`);
  }

  if (missing) {
    return (
      <div className="page-atmosphere">
        <SiteHeader compact />
        <main className="mx-auto max-w-lg px-5 py-20 text-center">
          <h1 className="font-serif text-3xl text-forest">Quote not found</h1>
          <p className="mt-3 text-charcoal/65">
            This ID is not in your local library — it may have been deleted on this device.
          </p>
          <Link
            href="/quotes"
            className="mt-8 inline-flex rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white"
          >
            Back to saved quotes
          </Link>
        </main>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="page-atmosphere">
        <SiteHeader compact />
        <main className="flex min-h-[40vh] items-center justify-center text-charcoal/50">
          Loading quote…
        </main>
      </div>
    );
  }

  const isDirty = quotesFingerprint(quote) !== savedFingerprint;

  return (
    <div className="page-atmosphere">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-6 sm:px-8">
        <div className="print:hidden mb-4">
          <Link href="/quotes" className="text-sm font-semibold text-forest hover:underline">
            ← Saved quotes
          </Link>
        </div>
        {message && (
          <p className="print:hidden mb-4 rounded-xl bg-sage/60 px-4 py-3 text-sm font-medium text-forest">
            {message}
          </p>
        )}
        <QuotePreview
          quote={quote}
          editable
          showActions
          showStepHeading={false}
          isDirty={isDirty && !saved}
          onChange={handleChange}
          onSave={handleSave}
          onResetPackage={() => handleChange(resetQuoteToPackage(quote))}
          onStatusChange={handleStatusChange}
          onCreateRevision={handleCreateRevision}
          saveLabel={saved ? "Saved ✓" : "Save changes"}
        />
      </main>
    </div>
  );
}
