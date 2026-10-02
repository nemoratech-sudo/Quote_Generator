"use client";

import { packages } from "@/lib/quote";
import type { PackageId } from "@/lib/types";

interface PackageCardsProps {
  selected: PackageId | null;
  onSelect: (id: PackageId) => void;
  onGenerate: () => void;
  serviceLabel: string;
}

export default function PackageCards({
  selected,
  onSelect,
  onGenerate,
  serviceLabel,
}: PackageCardsProps) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-10 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-forest/70">
          Step 2 of 3
        </p>
        <h1 className="font-serif text-4xl leading-tight text-forest sm:text-5xl">
          Choose your package
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-charcoal/65">
          Quoting for{" "}
          <span className="font-semibold text-forest">{serviceLabel || "your service"}</span>.
          Deliverables are fixed per package.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {packages.map((pkg) => {
          const isSelected = selected === pkg.id;
          const isPremium = pkg.id === "premium";

          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onSelect(pkg.id)}
              className={[
                "relative flex h-full flex-col rounded-[1.5rem] border bg-white p-6 text-left transition duration-200",
                isSelected
                  ? isPremium
                    ? "border-gold shadow-[0_20px_50px_-20px_rgba(201,162,39,0.55)] ring-2 ring-gold"
                    : "border-forest shadow-[0_20px_50px_-24px_rgba(27,67,50,0.45)] ring-2 ring-forest"
                  : isPremium
                    ? "border-gold/40 shadow-[0_18px_40px_-28px_rgba(201,162,39,0.45)] hover:-translate-y-0.5 hover:border-gold"
                    : "border-charcoal/10 shadow-[0_18px_40px_-28px_rgba(27,67,50,0.25)] hover:-translate-y-0.5 hover:border-forest/30",
                isPremium && !isSelected ? "bg-gradient-to-b from-white to-[#FFF8E8]" : "",
              ].join(" ")}
            >
              {isSelected && (
                <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">
                  ✓
                </span>
              )}

              {isPremium && (
                <span className="mb-3 inline-flex w-fit rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#8A6D12]">
                  Most popular
                </span>
              )}

              <div className="mb-1 text-3xl" aria-hidden>
                {pkg.medal}
              </div>
              <h2 className="font-serif text-2xl text-forest">{pkg.name}</h2>
              <p
                className={[
                  "mt-2 text-3xl font-bold tracking-tight",
                  isPremium ? "text-gold-deep" : "text-charcoal",
                ].join(" ")}
              >
                {pkg.price}
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-charcoal/75">
                    <span
                      className={[
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        isPremium ? "bg-gold" : "bg-forest",
                      ].join(" ")}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          disabled={!selected}
          onClick={onGenerate}
          className="rounded-full bg-forest px-8 py-4 text-base font-semibold text-white shadow-lg shadow-forest/25 transition enabled:hover:bg-forest-deep disabled:cursor-not-allowed disabled:bg-charcoal/25 disabled:shadow-none"
        >
          Generate quotation
        </button>
      </div>
    </div>
  );
}
