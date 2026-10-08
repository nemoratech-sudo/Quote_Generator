"use client";

import Link from "next/link";
import type { QuoteStep } from "@/lib/types";

const STEPS: { id: QuoteStep; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "optimize", label: "Optimize" },
  { id: "package", label: "Package" },
  { id: "quote", label: "PDF" },
];

interface StepperProps {
  current: QuoteStep;
  serviceReady?: boolean;
  optimizeReady?: boolean;
  packageReady?: boolean;
}

function stepHref(step: QuoteStep): string {
  if (step === "chat") return "/quote/new?step=chat";
  if (step === "optimize") return "/quote/new?step=optimize";
  if (step === "package") return "/quote/new?step=package";
  return "/quote/preview";
}

function canNavigateTo(
  step: QuoteStep,
  serviceReady: boolean,
  optimizeReady: boolean,
  packageReady: boolean,
): boolean {
  if (step === "chat") return true;
  if (step === "optimize") return serviceReady;
  if (step === "package") return serviceReady && optimizeReady;
  return serviceReady && optimizeReady && packageReady;
}

export default function Stepper({
  current,
  serviceReady = false,
  optimizeReady = false,
  packageReady = false,
}: StepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="print:hidden mx-auto flex w-full max-w-xl items-center justify-between gap-1 sm:gap-2">
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;
        const navigable = canNavigateTo(step.id, serviceReady, optimizeReady, packageReady);
        const href = stepHref(step.id);

        const circleClass = [
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition sm:h-8 sm:w-8 sm:text-sm",
          isActive
            ? "bg-forest text-white shadow-md shadow-forest/20"
            : isComplete
              ? "bg-gold text-forest"
              : "bg-white/80 text-charcoal/40 ring-1 ring-charcoal/10",
          navigable && !isActive ? "hover:scale-105 hover:ring-2 hover:ring-forest/25" : "",
        ].join(" ");

        const labelClass = [
          "hidden text-[10px] font-medium transition sm:inline sm:text-xs",
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
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1">
            {navigable ? (
              <Link
                href={href}
                aria-current={isActive ? "step" : undefined}
                aria-label={step.label}
                className={[
                  "group flex min-w-0 items-center gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-forest/40 sm:gap-1.5",
                  isActive ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
                onClick={(event) => {
                  if (isActive) event.preventDefault();
                }}
              >
                {stepContent}
              </Link>
            ) : (
              <div className="flex min-w-0 items-center gap-1 opacity-60 sm:gap-1.5" aria-disabled>
                {stepContent}
              </div>
            )}
            {index < STEPS.length - 1 && (
              <div
                className={[
                  "mx-0.5 h-px min-w-[4px] flex-1",
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
