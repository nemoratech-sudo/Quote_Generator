"use client";

import { useRouter } from "next/navigation";
import ChatService, { type ChatQuoteResult } from "@/components/ChatService";
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
      nicheId: result.nicheId ?? null,
    });
    router.push("/quote/new?step=package");
  }

  return (
    <div className="nemo-atmosphere flex flex-col">
      <ChatService onComplete={handleComplete} />
    </div>
  );
}
