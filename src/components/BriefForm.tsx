"use client";

import { FormEvent, useState } from "react";
import { REQUIREMENT_TAGS } from "@/lib/requirements";
import type { QuoteDraft, RequirementTagId } from "@/lib/types";

interface BriefFormProps {
  initial: QuoteDraft;
  onContinue: (
    values: Pick<QuoteDraft, "briefNotes" | "requirementTags" | "optimizeForRequirements">,
  ) => void;
  onBack: () => void;
}

export default function BriefForm({ initial, onContinue, onBack }: BriefFormProps) {
  const [briefNotes, setBriefNotes] = useState(initial.briefNotes || "");
  const [tags, setTags] = useState<RequirementTagId[]>(initial.requirementTags || []);
  const [optimize, setOptimize] = useState(initial.optimizeForRequirements !== false);

  function toggleTag(id: RequirementTagId) {
    setTags((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onContinue({
      briefNotes: briefNotes.trim(),
      requirementTags: tags,
      optimizeForRequirements: optimize,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
      <div className="mb-10 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-forest/70">
          Step 2 of 4
        </p>
        <h1 className="font-serif text-4xl leading-tight text-forest sm:text-5xl">
          Optimize for the client
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-charcoal/65">
          Select what they need. We&apos;ll recommend the best package and tune deliverables
          before you pick one.
        </p>
      </div>

      <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_-28px_rgba(27,67,50,0.35)] backdrop-blur sm:p-8">
        <label htmlFor="briefNotes" className="mb-2 block text-sm font-semibold text-charcoal">
          Brief notes <span className="font-normal text-charcoal/45">(optional)</span>
        </label>
        <textarea
          id="briefNotes"
          value={briefNotes}
          onChange={(e) => setBriefNotes(e.target.value)}
          rows={4}
          placeholder="e.g. Needs online menu + WhatsApp ordering. No admin panel. Budget around ₹8,000."
          className="w-full resize-y rounded-2xl border border-charcoal/10 bg-sage-soft/40 px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-charcoal/35 focus:border-forest/40 focus:bg-white focus:ring-4 focus:ring-forest/10"
        />

        <p className="mb-3 mt-6 text-sm font-semibold text-charcoal">Requirement tags</p>
        <div className="flex flex-wrap gap-2">
          {REQUIREMENT_TAGS.map((tag) => {
            const active = tags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={[
                  "rounded-full px-3.5 py-2 text-sm font-medium transition",
                  active
                    ? "bg-forest text-white shadow-sm"
                    : "border border-charcoal/10 bg-white text-charcoal/70 hover:border-forest/30 hover:text-forest",
                ].join(" ")}
              >
                {tag.label}
              </button>
            );
          })}
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-charcoal/10 bg-sage-soft/40 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={optimize}
            onChange={(e) => setOptimize(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--forest)]"
          />
          <span>
            <span className="font-semibold text-charcoal">Optimize quotation for these tags</span>
            <span className="mt-0.5 block text-charcoal/60">
              Drop unused package lines and add missing extras with default rates.
            </span>
          </span>
        </label>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-charcoal/15 bg-white px-6 py-3.5 text-base font-semibold text-charcoal transition hover:border-forest/30"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 rounded-full bg-forest px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-forest/25 transition hover:bg-forest-deep"
          >
            Continue to package
          </button>
        </div>
      </div>
    </form>
  );
}
