"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QuotePreview from "@/components/QuotePreview";
import SiteHeader from "@/components/SiteHeader";
import Stepper from "@/components/Stepper";
import {
  buildQuote,
  createRevision,
  quotesFingerprint,
  resetQuoteToPackage,
  setQuoteStatus,
} from "@/lib/quote";
import { nextQuoteId } from "@/lib/settings";
import {
  loadDraft,
  loadWorkingQuote,
  saveDraft,
  saveQuote,
  saveWorkingQuote,
} from "@/lib/storage";
import type { Quote, QuoteStatus } from "@/lib/types";

export default function QuotePreviewPage() {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [savedFingerprint, setSavedFingerprint] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [stepperReady, setStepperReady] = useState({
    serviceReady: false,
    packageReady: false,
  });
  const assignedId = useRef(false);

  useEffect(() => {
    try {
      const existing = loadWorkingQuote();
      const draft = loadDraft();
      setStepperReady({
        serviceReady: draft.service.trim().length > 0,
        packageReady: draft.packageId !== null,
      });

      if (existing && draft.packageId && existing.packageId === draft.packageId) {
        // Refresh brief from draft if working quote is older
        const merged = {
          ...existing,
          briefNotes: existing.briefNotes || draft.briefNotes,
          requirementTags:
            existing.requirementTags?.length > 0
              ? existing.requirementTags
              : draft.requirementTags,
        };
        setQuote(merged);
        setSavedFingerprint(quotesFingerprint(merged));
        return;
      }

      if (!draft.service.trim() || !draft.packageId) {
        setError("missing");
        return;
      }

      if (!assignedId.current) {
        assignedId.current = true;
      }
      const built = buildQuote(draft, nextQuoteId());
      saveWorkingQuote(built);
      setQuote(built);
      setSavedFingerprint("");
    } catch {
      setError("missing");
    }
  }, []);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!quote || !savedFingerprint) return;
      if (quotesFingerprint(quote) !== savedFingerprint) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [quote, savedFingerprint]);

  function handleChange(next: Quote) {
    setQuote(next);
    saveWorkingQuote(next);
    setSaved(false);
  }

  function handleSave() {
    if (!quote) return;
    saveQuote(quote);
    saveWorkingQuote(quote);
    setSavedFingerprint(quotesFingerprint(quote));
    setSaved(true);
    setMessage("Quote saved to library.");
  }

  function handleReset() {
    if (!quote) return;
    handleChange(resetQuoteToPackage(quote));
  }

  function handleStatusChange(status: QuoteStatus) {
    if (!quote) return;
    const next = setQuoteStatus(quote, status);
    handleChange(next);
    saveQuote(next);
    setSavedFingerprint(quotesFingerprint(next));
    setSaved(true);
    setMessage(`Status: ${status}.`);
  }

  function handleCreateRevision() {
    if (!quote) return;
    // Keep original as sent/accepted in library
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
      productType: revision.productType,
      outcomeIds: revision.outcomeIds,
    });
    setQuote(revision);
    setSavedFingerprint(quotesFingerprint(revision));
    setSaved(true);
    setMessage(`Revision ${revision.revision} created (${revision.id}). Adjust rates, then send.`);
  }

  const isDirty =
    !!quote &&
    (savedFingerprint === "" || quotesFingerprint(quote) !== savedFingerprint);

  if (error === "missing") {
    return (
      <div className="page-atmosphere">
        <SiteHeader compact />
        <main className="mx-auto max-w-lg px-5 py-20 text-center">
          <h1 className="font-serif text-3xl text-forest">No draft found</h1>
          <p className="mt-3 text-charcoal/65">
            Capture the service, client brief, and package — then your quotation appears here.
          </p>
          <Link
            href="/quote/new"
            className="mt-8 inline-flex rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white"
          >
            Create quotation
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
          Building quote…
        </main>
      </div>
    );
  }

  return (
    <div className="page-atmosphere">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-4 sm:px-8">
        <div className="mb-8">
          <Stepper
            current="quote"
            serviceReady={stepperReady.serviceReady}
            packageReady={stepperReady.packageReady}
          />
        </div>
        {message && (
          <p className="print:hidden mb-4 rounded-xl bg-sage/60 px-4 py-3 text-sm font-medium text-forest">
            {message}
          </p>
        )}
        <QuotePreview
          quote={quote}
          editable
          isDirty={isDirty && !saved}
          onChange={handleChange}
          onSave={handleSave}
          onResetPackage={handleReset}
          onStatusChange={handleStatusChange}
          onCreateRevision={handleCreateRevision}
          saveLabel={saved ? "Saved ✓" : "Save"}
        />
        <div className="print:hidden mt-8 text-center">
          <button
            type="button"
            onClick={() => router.push("/quotes")}
            className="text-sm font-semibold text-forest underline-offset-4 hover:underline"
          >
            Go to saved quotes
          </button>
        </div>
      </main>
    </div>
  );
}
