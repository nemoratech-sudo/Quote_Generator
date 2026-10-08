"use client";

import { FormEvent, useState } from "react";
import type { QuoteDraft } from "@/lib/types";

interface ServiceFormProps {
  initial: QuoteDraft;
  onContinue: (values: Pick<QuoteDraft, "service" | "clientName" | "city">) => void;
}

export default function ServiceForm({ initial, onContinue }: ServiceFormProps) {
  const [service, setService] = useState(initial.service);
  const [clientName, setClientName] = useState(initial.clientName);
  const [city, setCity] = useState(initial.city);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!service.trim()) {
      setError("Please enter a service to quote.");
      return;
    }
    setError("");
    onContinue({
      service: service.trim(),
      clientName: clientName.trim(),
      city: city.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
      <div className="mb-10 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-forest/70">
          Step 1 of 4
        </p>
        <h1 className="font-serif text-4xl leading-tight text-forest sm:text-5xl">
          What are we quoting?
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-charcoal/65">
          Name the business or project. Next you&apos;ll capture client requirements, then
          choose a package optimized to that brief.
        </p>
      </div>

      <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_-28px_rgba(27,67,50,0.35)] backdrop-blur sm:p-8">
        <label htmlFor="service" className="mb-2 block text-sm font-semibold text-charcoal">
          Service
        </label>
        <input
          id="service"
          type="text"
          value={service}
          onChange={(event) => setService(event.target.value)}
          placeholder="ice cream shop"
          autoFocus
          className="w-full rounded-2xl border border-charcoal/10 bg-sage-soft/40 px-5 py-4 text-lg text-charcoal outline-none transition placeholder:text-charcoal/35 focus:border-forest/40 focus:bg-white focus:ring-4 focus:ring-forest/10"
        />
        {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="clientName" className="mb-2 block text-sm font-semibold text-charcoal">
              Client name <span className="font-normal text-charcoal/45">(optional)</span>
            </label>
            <input
              id="clientName"
              type="text"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Acme Foods"
              className="w-full rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-charcoal/35 focus:border-forest/40 focus:ring-4 focus:ring-forest/10"
            />
          </div>
          <div>
            <label htmlFor="city" className="mb-2 block text-sm font-semibold text-charcoal">
              City <span className="font-normal text-charcoal/45">(optional)</span>
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Pune"
              className="w-full rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-charcoal/35 focus:border-forest/40 focus:ring-4 focus:ring-forest/10"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-8 w-full rounded-full bg-forest px-6 py-4 text-base font-semibold text-white shadow-lg shadow-forest/25 transition hover:bg-forest-deep hover:shadow-forest/35"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
