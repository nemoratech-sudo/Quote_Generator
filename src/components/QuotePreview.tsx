"use client";

import Link from "next/link";
import { formatQuoteDate } from "@/lib/quote";
import type { Quote } from "@/lib/types";

interface QuotePreviewProps {
  quote: Quote;
  onSave?: () => void;
  saveLabel?: string;
  showActions?: boolean;
  showStepHeading?: boolean;
}

export default function QuotePreview({
  quote,
  onSave,
  saveLabel = "Save",
  showActions = true,
  showStepHeading = true,
}: QuotePreviewProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {showActions && (
        <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3">
          {showStepHeading ? (
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-forest/70">
                Step 3 of 3
              </p>
              <h1 className="mt-1 font-serif text-3xl text-forest sm:text-4xl">Quote preview</h1>
            </div>
          ) : (
            <div>
              <h2 className="font-serif text-2xl text-forest">Document</h2>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {showStepHeading && (
              <Link
                href="/quote/new?step=package"
                className="rounded-full border border-charcoal/15 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-forest/30 hover:text-forest"
              >
                Edit
              </Link>
            )}
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                className="rounded-full border border-forest/20 bg-sage-soft px-4 py-2.5 text-sm font-semibold text-forest transition hover:bg-sage"
              >
                {saveLabel}
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-forest/20 transition hover:bg-forest-deep"
            >
              Download PDF
            </button>
          </div>
        </div>
      )}

      <article className="quote-sheet overflow-hidden rounded-2xl border border-charcoal/8 bg-white shadow-[0_30px_80px_-40px_rgba(27,67,50,0.55)] print:rounded-none print:border-0 print:shadow-none">
        <div className="border-b border-sage bg-gradient-to-r from-sage-soft via-white to-[#FFF8E8] px-8 py-8 sm:px-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-charcoal/45">
                Company
              </p>
              <h2 className="mt-1 font-serif text-4xl text-forest">{quote.companyName}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal/45">
                Quotation
              </p>
              <p className="mt-1 font-mono text-sm text-charcoal/70">{quote.id}</p>
              <p className="mt-1 text-sm text-charcoal/65">{formatQuoteDate(quote.createdAt)}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <h3 className="font-serif text-2xl leading-snug text-charcoal sm:text-3xl">
              {quote.title}
            </h3>
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                quote.packageId === "premium"
                  ? "bg-gold/20 text-[#8A6D12]"
                  : "bg-forest/10 text-forest",
              ].join(" ")}
            >
              {quote.packageName}
            </span>
          </div>
        </div>

        <div className="grid gap-8 px-8 py-8 sm:px-10 md:grid-cols-[1.2fr_0.8fr]">
          <section>
            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-charcoal/45">
              Prepared for
            </h4>
            <div className="mt-3 space-y-1 text-base text-charcoal">
              <p className="font-semibold">{quote.clientName || "Valued client"}</p>
              {quote.city && <p className="text-charcoal/70">{quote.city}</p>}
              <p className="text-charcoal/70">Service: {quote.service}</p>
            </div>

            <h4 className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-charcoal/45">
              Deliverables
            </h4>
            <ul className="mt-4 space-y-2.5">
              {quote.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 border-b border-charcoal/6 pb-2.5 text-sm text-charcoal/80 last:border-0"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl bg-forest px-5 py-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Total
              </p>
              <p className="mt-2 font-serif text-4xl tracking-tight">{quote.price}</p>
              <p className="mt-2 text-sm text-white/75">{quote.packageName} package</p>
            </div>

            <div className="rounded-2xl border border-charcoal/8 bg-sage-soft/50 px-5 py-5">
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-charcoal/45">
                Payment terms
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{quote.paymentTerms}</p>
            </div>

            <div className="rounded-2xl border border-charcoal/8 bg-white px-5 py-5">
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-charcoal/45">
                Validity
              </h4>
              <p className="mt-2 text-sm text-charcoal/80">
                This quotation is valid for <strong>{quote.validityDays} days</strong> from the
                date above.
              </p>
            </div>
          </aside>
        </div>

        <footer className="border-t border-charcoal/8 px-8 py-6 sm:px-10">
          <p className="text-sm text-charcoal/55">
            Thank you for considering Nemora. We look forward to building something lasting
            together.
          </p>
        </footer>
      </article>
    </div>
  );
}
