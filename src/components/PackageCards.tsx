"use client";

import { useEffect, useMemo, useState } from "react";
import { featureDiff, loadPackages } from "@/lib/packages";
import { formatINR } from "@/lib/money";
import {
  evaluatePackageFit,
  recommendPackage,
  type PackageFit,
} from "@/lib/requirements";
import type { Package, PackageId, RequirementTagId } from "@/lib/types";

interface PackageCardsProps {
  selected: PackageId | null;
  onSelect: (id: PackageId) => void;
  onGenerate: () => void;
  serviceLabel: string;
  requirementTags?: RequirementTagId[];
  optimizeForRequirements?: boolean;
}

export default function PackageCards({
  selected,
  onSelect,
  onGenerate,
  serviceLabel,
  requirementTags = [],
  optimizeForRequirements = true,
}: PackageCardsProps) {
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    setPackages(loadPackages());
  }, []);

  const recommendation = useMemo(
    () => (packages.length ? recommendPackage(packages, requirementTags) : null),
    [packages, requirementTags],
  );

  const fits = useMemo(() => {
    const map = new Map<PackageId, PackageFit>();
    for (const pkg of packages) {
      map.set(pkg.id, evaluatePackageFit(pkg, requirementTags));
    }
    return map;
  }, [packages, requirementTags]);

  const comparison = useMemo(() => {
    if (!selected || packages.length < 2) return null;
    const selectedIndex = packages.findIndex((p) => p.id === selected);
    if (selectedIndex <= 0) return null;
    const prev = packages[selectedIndex - 1];
    const current = packages[selectedIndex];
    const added = featureDiff(prev, current);
    const priceDiff = current.baseAmount - prev.baseAmount;
    return { prev, current, added, priceDiff };
  }, [selected, packages]);

  if (packages.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-charcoal/50">Loading packages…</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-forest/70">
          Step 3 of 4
        </p>
        <h1 className="font-serif text-4xl leading-tight text-forest sm:text-5xl">
          Select a package
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-charcoal/65">
          Quoting for{" "}
          <span className="font-semibold text-forest">{serviceLabel || "your service"}</span>.
          {requirementTags.length > 0
            ? " Optimized against the client brief below."
            : " Pick a base package — you can still edit every line later."}
        </p>
      </div>

      {recommendation && requirementTags.length > 0 && (
        <div className="mb-6 rounded-2xl border border-forest/20 bg-white/90 px-5 py-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest/70">
                Recommended for this brief
              </p>
              <p className="mt-1 font-serif text-2xl text-forest">
                {recommendation.packageName}{" "}
                <span className="text-lg font-sans font-semibold text-charcoal">
                  {recommendation.price}
                </span>
              </p>
              <p className="mt-2 text-sm text-charcoal/70">
                Covers {recommendation.covered.length}/{requirementTags.length} tags
                {recommendation.missing.length > 0
                  ? ` · will add: ${recommendation.missing.map((m) => m.label).join(", ")}`
                  : ""}
                {recommendation.notNeeded.length > 0 && optimizeForRequirements
                  ? ` · drop unused: ${recommendation.notNeeded.slice(0, 2).join(", ")}${recommendation.notNeeded.length > 2 ? "…" : ""}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(recommendation.packageId)}
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-deep"
            >
              Use {recommendation.packageName}
            </button>
          </div>
        </div>
      )}

      {comparison && (
        <div className="mb-6 rounded-2xl border border-forest/15 bg-white/80 px-5 py-4 text-sm text-charcoal/75">
          <p className="font-semibold text-forest">Compared with {comparison.prev.name}</p>
          <p className="mt-1">
            +{formatINR(comparison.priceDiff)} · adds{" "}
            {comparison.added.length > 0
              ? comparison.added.slice(0, 3).join(", ") +
                (comparison.added.length > 3 ? ` +${comparison.added.length - 3} more` : "")
              : "refined deliverables"}
          </p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {packages.map((pkg) => {
          const isSelected = selected === pkg.id;
          const isPremium = pkg.id === "premium" || pkg.highlighted;
          const isRecommended = recommendation?.packageId === pkg.id;
          const fit = fits.get(pkg.id);

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

              {(isPremium || isRecommended) && (
                <span
                  className={[
                    "mb-3 inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                    isRecommended
                      ? "bg-forest/10 text-forest"
                      : "bg-gold/15 text-[#8A6D12]",
                  ].join(" ")}
                >
                  {isRecommended ? "Best fit" : "Most popular"}
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

              {fit && requirementTags.length > 0 && (
                <p className="mt-2 text-xs font-medium text-charcoal/55">
                  {fit.covered.length} covered
                  {fit.missing.length > 0 ? ` · ${fit.missing.length} extra` : ""}
                </p>
              )}

              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {pkg.features.map((feature) => (
                  <li
                    key={feature.description}
                    className="flex items-start justify-between gap-2 text-sm text-charcoal/75"
                  >
                    <span className="flex items-start gap-2.5">
                      <span
                        className={[
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          isPremium ? "bg-gold" : "bg-forest",
                        ].join(" ")}
                      />
                      <span>{feature.description}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-charcoal/45">
                      {formatINR(feature.amount)}
                    </span>
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
