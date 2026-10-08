"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import ChatService, { type ChatQuoteResult } from "@/components/ChatService";
import SiteHeader from "@/components/SiteHeader";
import { clearWorkingQuote, loadDraft, saveDraft } from "@/lib/storage";

export default function HomePage() {
  const router = useRouter();

  function handleComplete(result: ChatQuoteResult) {
    const draft = loadDraft();
    clearWorkingQuote();
    saveDraft({
      ...draft,
      service: result.service,
      clientName: "",
      mobile: "",
      city: "",
      packageId: null,
      step: "package",
      briefNotes: result.briefNotes,
      requirementTags: result.requirementTags,
      optimizeForRequirements: true,
      productType: result.productType,
      outcomeIds: result.outcomeIds,
    });
    router.push("/quote/new?step=package");
  }

  return (
    <div className="page-atmosphere">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <ChatService onComplete={handleComplete} />

        <p className="mt-8 text-center text-sm text-charcoal/50">
          Already have quotes?{" "}
          <Link href="/quotes" className="font-semibold text-forest hover:underline">
            Open saved library
          </Link>
        </p>
      </main>
    </div>
  );
}
