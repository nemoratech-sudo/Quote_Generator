import type { QuoteStep } from "@/lib/types";

const STEPS: { id: QuoteStep; label: string }[] = [
  { id: "service", label: "Service" },
  { id: "package", label: "Package" },
  { id: "quote", label: "Quote" },
];

interface StepperProps {
  current: QuoteStep;
}

export default function Stepper({ current }: StepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="print:hidden mx-auto flex w-full max-w-md items-center justify-between gap-2">
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;

        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2.5">
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition",
                  isActive
                    ? "bg-forest text-white shadow-md shadow-forest/20"
                    : isComplete
                      ? "bg-gold text-forest"
                      : "bg-white/80 text-charcoal/40 ring-1 ring-charcoal/10",
                ].join(" ")}
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <span
                className={[
                  "text-sm font-medium",
                  isActive ? "text-forest" : isComplete ? "text-charcoal/70" : "text-charcoal/40",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={[
                  "mx-1 h-px flex-1",
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
