"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  createLineItemId,
  DEFAULT_TERMS,
  formatINR,
  formatQuoteDate,
  moveLineItem,
  paymentSplit,
  resetQuoteToPackage,
  STATUS_LABELS,
  withRecalculatedTotal,
} from "@/lib/quote";
import { tagsLabelList } from "@/lib/requirements";
import type { Quote, QuoteLineItem, QuoteStatus } from "@/lib/types";

interface QuotePreviewProps {
  quote: Quote;
  onChange?: (quote: Quote) => void;
  onSave?: () => void;
  saveLabel?: string;
  showActions?: boolean;
  showStepHeading?: boolean;
  editable?: boolean;
  isDirty?: boolean;
  onResetPackage?: () => void;
  onStatusChange?: (status: QuoteStatus) => void;
  onCreateRevision?: () => void;
}

function statusBadgeClass(status: QuoteStatus): string {
  switch (status) {
    case "sent":
      return "bg-forest/10 text-forest";
    case "revision":
      return "bg-gold/20 text-[#8A6D12]";
    case "accepted":
      return "bg-emerald-100 text-emerald-900";
    case "declined":
      return "bg-red-50 text-red-800";
    default:
      return "bg-charcoal/8 text-charcoal/70";
  }
}

export default function QuotePreview({
  quote,
  onChange,
  onSave,
  saveLabel = "Save",
  showActions = true,
  showStepHeading = true,
  editable = false,
  isDirty = false,
  onResetPackage,
  onStatusChange,
  onCreateRevision,
}: QuotePreviewProps) {
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [addError, setAddError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [clientError, setClientError] = useState("");
  const [touchedClient, setTouchedClient] = useState(false);

  const locked = quote.status === "accepted";
  const canEdit = editable && typeof onChange === "function" && !locked;
  const split = useMemo(
    () => paymentSplit(quote.totalAmount, quote.advancePercent),
    [quote.totalAmount, quote.advancePercent],
  );

  const missingClientName = !quote.clientName.trim();
  const missingMobile = !(quote.mobile ?? "").trim();
  const clientInvalid = missingClientName || missingMobile;

  function commit(next: Quote) {
    onChange?.(withRecalculatedTotal(next));
    if (clientError && next.clientName.trim() && (next.mobile ?? "").trim()) {
      setClientError("");
    }
  }

  function requireClientDetails(): boolean {
    setTouchedClient(true);
    if (!quote.clientName.trim()) {
      setClientError("Client name is required.");
      return false;
    }
    if (!(quote.mobile ?? "").trim()) {
      setClientError("Mobile number is required.");
      return false;
    }
    setClientError("");
    return true;
  }

  function updateLineItem(id: string, patch: Partial<QuoteLineItem>) {
    commit({
      ...quote,
      lineItems: quote.lineItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  }

  function removeLineItem(id: string) {
    commit({
      ...quote,
      lineItems: quote.lineItems.filter((item) => item.id !== id),
    });
  }

  function handleAddItem(event: FormEvent) {
    event.preventDefault();
    const description = newDescription.trim();
    const amount = Number(newAmount);

    if (!description) {
      setAddError("Enter a feature name.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setAddError("Enter a valid rate.");
      return;
    }

    setAddError("");
    commit({
      ...quote,
      lineItems: [
        ...quote.lineItems,
        {
          id: createLineItemId(),
          description,
          amount: Math.round(amount),
        },
      ],
    });
    setNewDescription("");
    setNewAmount("");
  }

  function handleReset() {
    if (onResetPackage) {
      onResetPackage();
      return;
    }
    commit(resetQuoteToPackage(quote));
  }

  function handleDrop(toIndex: number) {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      return;
    }
    commit({
      ...quote,
      lineItems: moveLineItem(quote.lineItems, dragIndex, toIndex),
    });
    setDragIndex(null);
  }

  function handlePrint() {
    if (canEdit && !requireClientDetails()) return;
    window.print();
  }

  function handleSaveClick() {
    if (!requireClientDetails()) return;
    onSave?.();
  }

  function handleStatusClick(status: QuoteStatus) {
    if (!requireClientDetails()) return;
    onStatusChange?.(status);
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {showActions && (
        <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3">
          {showStepHeading ? (
            <div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-[0.2em] text-forest/70">
                Step 4 of 4 · PDF
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-3xl text-forest sm:text-4xl">Your quotation</h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusBadgeClass(quote.status)}`}
                >
                  {STATUS_LABELS[quote.status]}
                  {quote.revision > 1 ? ` · Rev ${quote.revision}` : ""}
                </span>
                {isDirty && (
                  <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#8A6D12]">
                    Unsaved edits
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-charcoal/55">
                {locked
                  ? "Accepted — rates are locked. Create a revision to renegotiate."
                  : "Enter client name and mobile below, adjust rates, then Download PDF."}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-2xl text-forest">Document</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusBadgeClass(quote.status)}`}
              >
                {STATUS_LABELS[quote.status]}
                {quote.revision > 1 ? ` · Rev ${quote.revision}` : ""}
              </span>
              {isDirty && (
                <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#8A6D12]">
                  Unsaved
                </span>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {showStepHeading && !locked && (
              <Link
                href="/quote/new?step=package"
                className="rounded-full border border-charcoal/15 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-forest/30 hover:text-forest"
              >
                Edit package
              </Link>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-charcoal/15 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-forest/30 hover:text-forest"
              >
                Re-optimize
              </button>
            )}
            {onStatusChange && quote.status !== "sent" && quote.status !== "accepted" && (
              <button
                type="button"
                onClick={() => handleStatusClick("sent")}
                className="rounded-full border border-forest/20 bg-white px-4 py-2.5 text-sm font-semibold text-forest transition hover:bg-sage-soft"
              >
                Mark sent
              </button>
            )}
            {onCreateRevision &&
              (quote.status === "sent" ||
                quote.status === "accepted" ||
                quote.status === "declined") && (
                <button
                  type="button"
                  onClick={onCreateRevision}
                  className="rounded-full border border-gold/40 bg-[#FFF8E8] px-4 py-2.5 text-sm font-semibold text-[#8A6D12] transition hover:border-gold"
                >
                  Create revision
                </button>
              )}
            {onStatusChange && quote.status !== "accepted" && quote.status !== "declined" && (
              <button
                type="button"
                onClick={() => handleStatusClick("accepted")}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900"
              >
                Accept
              </button>
            )}
            {onSave && !locked && (
              <button
                type="button"
                onClick={handleSaveClick}
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
        {/* Header — sage → cream */}
        <div className="quote-header border-b border-[#E5EFE8] bg-gradient-to-r from-[#EEFAF1] via-white to-[#FFF8E8] px-7 py-8 sm:px-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-charcoal/45">
                Company
              </p>
              <h2 className="mt-1 font-serif text-[2.5rem] leading-none text-forest">
                {quote.companyName}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal/45">
                Quotation
              </p>
              <p className="mt-1 font-mono text-sm text-charcoal/70">{quote.id}</p>
              <p className="mt-1 text-sm text-charcoal/65">{formatQuoteDate(quote.createdAt)}</p>
              {quote.revision > 1 && (
                <p className="mt-1 text-xs font-semibold text-[#8A6D12]">Revision {quote.revision}</p>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <h3 className="font-serif text-[1.65rem] leading-snug text-charcoal sm:text-[1.85rem]">
              {quote.title}
            </h3>
            <span
              className={[
                "rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                quote.packageId === "premium"
                  ? "bg-[#E8D48A]/55 text-[#6B5610]"
                  : "bg-forest/10 text-forest",
              ].join(" ")}
            >
              {quote.packageName}
            </span>
          </div>

          {(quote.briefNotes || quote.requirementTags.length > 0) && (
            <div className="mt-6 rounded-xl border border-forest/10 bg-white/70 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-charcoal/45">
                Client brief
              </p>
              {quote.briefNotes && (
                <p className="mt-1.5 text-sm leading-relaxed text-charcoal/75">{quote.briefNotes}</p>
              )}
              {quote.requirementTags.length > 0 && (
                <p className="mt-2 text-xs font-medium text-forest/80">
                  {tagsLabelList(quote.requirementTags)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-8 px-7 py-8 sm:px-10 md:grid-cols-[1.35fr_0.65fr]">
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal/45">
              Prepared for
            </h4>

            {canEdit && (
              <div className="print:hidden mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/60">
                    Client name <span className="text-red-600">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    value={quote.clientName}
                    onChange={(e) => commit({ ...quote, clientName: e.target.value })}
                    onBlur={() => setTouchedClient(true)}
                    placeholder="Client name"
                    aria-invalid={touchedClient && missingClientName}
                    className={[
                      "w-full rounded-xl border bg-sage-soft/40 px-3 py-2.5 outline-none focus:bg-white",
                      touchedClient && missingClientName
                        ? "border-red-400 focus:border-red-500"
                        : "border-charcoal/10 focus:border-forest/30",
                    ].join(" ")}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/60">
                    Mobile <span className="text-red-600">*</span>
                  </span>
                  <input
                    type="tel"
                    required
                    value={quote.mobile}
                    onChange={(e) => commit({ ...quote, mobile: e.target.value })}
                    onBlur={() => setTouchedClient(true)}
                    placeholder="Mobile number"
                    aria-invalid={touchedClient && missingMobile}
                    className={[
                      "w-full rounded-xl border bg-sage-soft/40 px-3 py-2.5 outline-none focus:bg-white",
                      touchedClient && missingMobile
                        ? "border-red-400 focus:border-red-500"
                        : "border-charcoal/10 focus:border-forest/30",
                    ].join(" ")}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium text-charcoal/60">Service</span>
                  <input
                    type="text"
                    value={quote.service}
                    onChange={(e) => commit({ ...quote, service: e.target.value })}
                    className="w-full rounded-xl border border-charcoal/10 bg-sage-soft/40 px-3 py-2.5 outline-none focus:border-forest/30 focus:bg-white"
                  />
                </label>
                {(clientError || (touchedClient && clientInvalid)) && (
                  <p className="sm:col-span-2 text-sm font-medium text-red-700">
                    {clientError ||
                      (missingClientName
                        ? "Client name is required."
                        : "Mobile number is required.")}
                  </p>
                )}
              </div>
            )}

            <div
              className={`mt-3 space-y-0.5 text-[15px] text-charcoal ${canEdit ? "hidden print:block" : ""}`}
            >
              <p className="font-semibold">{quote.clientName || "Valued client"}</p>
              {quote.mobile ? <p className="text-charcoal/70">Mobile: {quote.mobile}</p> : null}
              <p className="text-charcoal/70">Service: {quote.service}</p>
            </div>

            <div className="mt-8 flex items-end justify-between gap-3 border-b border-charcoal/10 pb-2">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal/45">
                Deliverables
              </h4>
              <div className="flex w-full max-w-[9.5rem] justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/40">
                <span className="sr-only sm:not-sr-only sm:invisible">Description</span>
                <span className="ml-auto">Amount</span>
              </div>
            </div>
            <div className="mb-1 mt-2 hidden justify-between text-[11px] font-semibold text-charcoal/50 print:flex sm:flex">
              <span>Description</span>
              <span>Amount</span>
            </div>

            {/* Screen list */}
            <ul className="mt-1 print:hidden">
              {quote.lineItems.length === 0 && (
                <li className="rounded-xl border border-dashed border-charcoal/15 px-4 py-6 text-center text-sm text-charcoal/50">
                  No deliverables yet. Add a feature below — or restore the package defaults.
                </li>
              )}

              {quote.lineItems.map((item, index) => (
                <li
                  key={item.id}
                  draggable={canEdit}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  className={[
                    "flex items-center gap-2.5 border-b border-charcoal/8 py-3 last:border-b",
                    dragIndex === index ? "opacity-50" : "",
                    canEdit ? "cursor-grab active:cursor-grabbing" : "",
                  ].join(" ")}
                >
                  {canEdit ? (
                    <span className="shrink-0 select-none text-charcoal/25" aria-hidden>
                      ⋮⋮
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                  )}

                  {canEdit ? (
                    <input
                      type="text"
                      value={item.description}
                      onChange={(event) =>
                        updateLineItem(item.id, { description: event.target.value })
                      }
                      className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 text-[15px] text-charcoal/85 outline-none hover:border-charcoal/10 focus:border-forest/30 focus:bg-sage-soft/40"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 text-[15px] text-charcoal/80">
                      {item.description}
                    </span>
                  )}

                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() =>
                          commit({
                            ...quote,
                            lineItems: moveLineItem(quote.lineItems, index, index - 1),
                          })
                        }
                        className="rounded px-1 py-1 text-xs text-charcoal/40 hover:bg-sage-soft disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === quote.lineItems.length - 1}
                        onClick={() =>
                          commit({
                            ...quote,
                            lineItems: moveLineItem(quote.lineItems, index, index + 1),
                          })
                        }
                        className="rounded px-1 py-1 text-xs text-charcoal/40 hover:bg-sage-soft disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <span className="text-sm text-charcoal/45">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={item.amount}
                        onChange={(event) =>
                          updateLineItem(item.id, {
                            amount: Math.max(0, Number(event.target.value) || 0),
                          })
                        }
                        className="w-24 rounded-lg border border-charcoal/10 bg-sage-soft/50 px-2 py-1.5 text-right text-sm font-semibold text-charcoal outline-none focus:border-forest/30 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        aria-label={`Remove ${item.description}`}
                        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-700/80 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 text-[15px] font-semibold text-charcoal">
                      {formatINR(item.amount)}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {/* Print / clean table matching mock */}
            <ul className="mt-1 hidden print:block">
              {quote.lineItems.map((item) => (
                <li
                  key={`print-${item.id}`}
                  className="flex items-start justify-between gap-4 border-b border-charcoal/8 py-2.5"
                >
                  <span className="flex items-start gap-2.5 text-[14px] text-charcoal/85">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                    {item.description}
                  </span>
                  <span className="shrink-0 text-[14px] font-semibold text-charcoal">
                    {formatINR(item.amount)}
                  </span>
                </li>
              ))}
            </ul>

            {canEdit && (
              <form
                onSubmit={handleAddItem}
                className="print:hidden mt-5 rounded-2xl border border-dashed border-forest/25 bg-sage-soft/40 p-4"
              >
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-forest/70">
                  Add extra feature
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(event) => setNewDescription(event.target.value)}
                    placeholder="e.g. Blog section"
                    className="min-w-0 flex-1 rounded-xl border border-charcoal/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest/30"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-charcoal/45">₹</span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={newAmount}
                      onChange={(event) => setNewAmount(event.target.value)}
                      placeholder="Rate"
                      className="w-28 rounded-xl border border-charcoal/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest/30"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-deep"
                  >
                    Add
                  </button>
                </div>
                {addError && (
                  <p className="mt-2 text-sm font-medium text-red-700">{addError}</p>
                )}
              </form>
            )}

            {canEdit && (
              <label className="print:hidden mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={quote.gstEnabled}
                  onChange={(e) => commit({ ...quote, gstEnabled: e.target.checked })}
                  className="h-4 w-4 accent-[var(--forest)]"
                />
                <span className="font-medium text-charcoal">
                  Apply GST ({quote.gstPercent}%)
                </span>
              </label>
            )}
          </section>

          <aside className="space-y-4">
            <div className="quote-total-card rounded-2xl bg-forest px-5 py-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Total
              </p>
              <p className="mt-2 font-serif text-4xl tracking-tight">{quote.price}</p>
              <p className="mt-2 text-sm text-white/75">{quote.packageName} package</p>
              {(quote.gstEnabled || quote.gstAmount > 0) && (
                <div className="mt-3 space-y-1 border-t border-white/20 pt-3 text-xs text-white/80">
                  <p className="flex justify-between gap-3">
                    <span>Subtotal</span>
                    <span>{formatINR(quote.subtotalAmount)}</span>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span>GST ({quote.gstPercent}%)</span>
                    <span>{formatINR(quote.gstAmount)}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-charcoal/8 bg-[#EEFAF1]/80 px-5 py-5">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal/45">
                Payment terms
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{quote.paymentTerms}</p>
              <div className="mt-3 space-y-1.5 border-t border-charcoal/10 pt-3 text-sm">
                <p className="flex justify-between text-charcoal/75">
                  <span>Advance</span>
                  <span className="font-semibold text-charcoal">{formatINR(split.advance)}</span>
                </p>
                <p className="flex justify-between text-charcoal/75">
                  <span>On delivery</span>
                  <span className="font-semibold text-charcoal">{formatINR(split.onDelivery)}</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-charcoal/10 bg-white px-5 py-5">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal/45">
                Validity
              </h4>
              <p className="mt-2 text-sm text-charcoal/80">
                Valid for <strong>{quote.validityDays} days</strong>.
              </p>
              <p className="mt-1 text-sm font-semibold text-forest">
                Valid until {formatQuoteDate(quote.validityEndsAt)}
              </p>
            </div>
          </aside>
        </div>

        <footer className="border-t border-charcoal/10 px-7 py-6 sm:px-10">
          <p className="font-serif text-base text-charcoal/60">
            Thank you for considering Nemora. We look forward to building something lasting
            together.
          </p>
          <p className="mt-3 text-xs text-charcoal/40">
            Generated by Nemora Quote Generator · {quote.id}
          </p>

          <section className="mt-8 border-t border-charcoal/10 pt-6">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal/45">
              Terms and conditions
            </h4>
            <ol className="mt-4 list-decimal space-y-2.5 pl-4 text-[13px] leading-relaxed text-charcoal/70">
              {DEFAULT_TERMS.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ol>
          </section>
        </footer>
      </article>
    </div>
  );
}
