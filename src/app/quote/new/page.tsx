"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BriefForm from "@/components/BriefForm";
import ChatService from "@/components/ChatService";
import PackageCards from "@/components/PackageCards";
import SiteHeader from "@/components/SiteHeader";
import Stepper from "@/components/Stepper";
import { titleCaseService } from "@/lib/quote";
import { clearWorkingQuote, loadDraft, saveDraft } from "@/lib/storage";
import type { PackageId, QuoteDraft, QuoteStep } from "@/lib/types";

function migrateStep(step: string | undefined): QuoteStep {
  if (step === "service" || step === "chat") return "chat";
  if (step === "brief" || step === "optimize") return "optimize";
  if (step === "package") return "package";
  if (step === "client" || step === "quote") return "quote";
  return "chat";
}

function resolveStep(loaded: QuoteDraft, stepParam: string | null): QuoteStep {
  if (!loaded.service.trim()) return "chat";

  const requested = migrateStep(stepParam ?? loaded.step);

  if (requested === "chat") return "chat";
  if (requested === "optimize") return "optimize";
  if (requested === "package") return "package";
  // Old "client" links → send to package; quote opens via preview route
  if (requested === "quote") {
    return loaded.packageId ? "package" : "package";
  }
  return "optimize";
}

function NewQuoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<QuoteDraft | null>(null);

  useEffect(() => {
    const loaded = loadDraft();
    if (!("mobile" in loaded) || loaded.mobile === undefined) {
      loaded.mobile = "";
    }
    const step = resolveStep(loaded, searchParams.get("step"));
    loaded.step = step === "quote" ? "package" : step;
    setDraft(loaded);
    saveDraft(loaded);
  }, [searchParams]);

  function updateDraft(partial: Partial<QuoteDraft>) {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...partial };
      saveDraft(next);
      return next;
    });
  }

  if (!draft) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-charcoal/50">
        Loading…
      </div>
    );
  }

  const optimizeDone =
    draft.step === "package" ||
    draft.step === "quote" ||
    searchParams.get("step") === "package";

  return (
    <>
      <div className="mb-8 sm:mb-10">
        <Stepper
          current={draft.step === "quote" ? "package" : draft.step}
          serviceReady={draft.service.trim().length > 0}
          optimizeReady={optimizeDone || draft.step === "optimize"}
          packageReady={draft.packageId !== null}
        />
      </div>

      {draft.step === "chat" && (
        <ChatService
          initialService={draft.service}
          onSubmitService={(service) => {
            updateDraft({
              service,
              step: "optimize",
            });
            router.replace("/quote/new?step=optimize");
          }}
        />
      )}

      {draft.step === "optimize" && (
        <BriefForm
          initial={draft}
          onBack={() => {
            updateDraft({ step: "chat" });
            router.replace("/quote/new?step=chat");
          }}
          onContinue={({ briefNotes, requirementTags, optimizeForRequirements }) => {
            updateDraft({
              briefNotes,
              requirementTags,
              optimizeForRequirements,
              step: "package",
            });
            router.replace("/quote/new?step=package");
          }}
        />
      )}

      {draft.step === "package" && (
        <PackageCards
          selected={draft.packageId}
          serviceLabel={titleCaseService(draft.service)}
          requirementTags={draft.requirementTags}
          optimizeForRequirements={draft.optimizeForRequirements}
          onSelect={(packageId: PackageId) => updateDraft({ packageId })}
          onGenerate={() => {
            if (!draft.packageId) return;
            clearWorkingQuote();
            updateDraft({ step: "quote" });
            router.push("/quote/preview");
          }}
        />
      )}
    </>
  );
}

export default function NewQuotePage() {
  return (
    <div className="page-atmosphere">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-4 sm:px-8">
        <Suspense
          fallback={
            <div className="flex min-h-[40vh] items-center justify-center text-charcoal/50">
              Loading…
            </div>
          }
        >
          <NewQuoteContent />
        </Suspense>
      </main>
    </div>
  );
}
