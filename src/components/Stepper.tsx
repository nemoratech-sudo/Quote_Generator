"use client";

import Link from "next/link";
import type { QuoteStep } from "@/lib/types";

const STEPS: { id: QuoteStep; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "package", label: "Package" },
  { id: "quote", label: "PDF" },
];

interface StepperProps {
  current: QuoteStep;
  serviceReady?: boolean;
  packageReady?: boolean;
}

function stepHref(step: QuoteStep): string {
  if (step === "chat") return "/";
  if (step === "package") return "/quote/new?step=package";
  return "/quote/preview";
}

function canNavigateTo(
  step: QuoteStep,
  serviceReady: boolean,
  packageReady: boolean,
): boolean {
  if (step === "chat") return true;
  if (step === "package") return serviceReady;
  return serviceReady && packageReady;
}

export default function Stepper({
  current,
  serviceReady = false,
  packageReady = false,
}: StepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="print:hidden mx-auto flex w-full max-w-md items-center justify-between gap-1 sm:gap-2">
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;
        const navigable = canNavigateTo(step.id, serviceReady, packageReady);
        const href = stepHref(step.id);

        const circleClass = [
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition",
          isActive
            ? "bg-forest text-white shadow-md shadow-forest/20"
            : isComplete
              ? "bg-gold text-forest"
              : "bg-white/80 text-charcoal/40 ring-1 ring-charcoal/10",
          navigable && !isActive ? "hover:scale-105 hover:ring-2 hover:ring-forest/25" : "",
        ].join(" ");

        const labelClass = [
          "text-sm font-medium transition",
          isActive ? "text-forest" : isComplete ? "text-charcoal/70" : "text-charcoal/40",
          navigable && !isActive ? "group-hover:text-forest" : "",
        ].join(" ");

        const stepContent = (
          <>
            <span className={circleClass}>{isComplete ? "✓" : index + 1}</span>
            <span className={labelClass}>{step.label}</span>
          </>
        );

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            {navigable ? (
              <Link
                href={href}
                aria-current={isActive ? "step" : undefined}
                aria-label={step.label}
                className={[
                  "group flex min-w-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-forest/40",
                  isActive ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
                onClick={(event) => {
                  if (isActive) event.preventDefault();
                }}
              >
                {stepContent}
              </Link>
            ) : (
              <div className="flex min-w-0 items-center gap-2 opacity-60" aria-disabled>
                {stepContent}
              </div>
            )}
            {index < STEPS.length - 1 && (
              <div
                className={[
                  "mx-1 h-px min-w-[8px] flex-1",
                  isComplete ? "bg-gold/70" : "bg-charcoal/15",
                ].join(" ")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
