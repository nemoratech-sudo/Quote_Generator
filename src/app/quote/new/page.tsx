"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PackageCards from "@/components/PackageCards";
import ServiceForm from "@/components/ServiceForm";
import SiteHeader from "@/components/SiteHeader";
import Stepper from "@/components/Stepper";
import { titleCaseService } from "@/lib/quote";
import { loadDraft, saveDraft } from "@/lib/storage";
import type { PackageId, QuoteDraft } from "@/lib/types";

function NewQuoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<QuoteDraft | null>(null);

  useEffect(() => {
    const loaded = loadDraft();
    const stepParam = searchParams.get("step");

    if (stepParam === "package" && loaded.service.trim()) {
      loaded.step = "package";
    } else if (stepParam === "service" || !loaded.service.trim()) {
      loaded.step = "service";
    }

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

  return (
    <>
      <div className="mb-10">
        <Stepper current={draft.step === "quote" ? "package" : draft.step} />
      </div>

      {draft.step === "service" ? (
        <ServiceForm
          initial={draft}
          onContinue={({ service, clientName, city }) => {
            updateDraft({
              service,
              clientName,
              city,
              step: "package",
            });
            router.replace("/quote/new?step=package");
          }}
        />
      ) : (
        <PackageCards
          selected={draft.packageId}
          serviceLabel={titleCaseService(draft.service)}
          onSelect={(packageId: PackageId) => updateDraft({ packageId })}
          onGenerate={() => {
            if (!draft.packageId) return;
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
