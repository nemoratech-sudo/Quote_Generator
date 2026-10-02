"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QuotePreview from "@/components/QuotePreview";
import SiteHeader from "@/components/SiteHeader";
import Stepper from "@/components/Stepper";
import { buildQuote } from "@/lib/quote";
import { loadDraft, saveQuote } from "@/lib/storage";
import type { Quote } from "@/lib/types";

export default function QuotePreviewPage() {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const draft = loadDraft();
      if (!draft.service.trim() || !draft.packageId) {
        setError("missing");
        return;
      }
      setQuote(buildQuote(draft));
    } catch {
      setError("missing");
    }
  }, []);

  function handleSave() {
    if (!quote) return;
    saveQuote(quote);
    setSaved(true);
  }

  if (error === "missing") {
    return (
      <div className="page-atmosphere">
        <SiteHeader compact />
        <main className="mx-auto max-w-lg px-5 py-20 text-center">
          <h1 className="font-serif text-3xl text-forest">No draft found</h1>
          <p className="mt-3 text-charcoal/65">
            Start a new quotation to generate a preview.
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
          <Stepper current="quote" />
        </div>
        <QuotePreview
          quote={quote}
          onSave={handleSave}
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
