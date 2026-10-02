import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <div className="page-atmosphere">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-col px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/55 px-6 py-14 shadow-[0_40px_90px_-50px_rgba(27,67,50,0.55)] backdrop-blur-sm sm:px-14 sm:py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(circle at 85% 20%, rgba(201,162,39,0.18), transparent 35%), radial-gradient(circle at 10% 80%, rgba(27,67,50,0.12), transparent 40%)",
            }}
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-forest/65">
              Website quotations
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-forest sm:text-6xl md:text-7xl">
              Nemora
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-charcoal/70 sm:text-xl">
              Generate clear, fixed-price quotations in three steps — service, package, and a
              print-ready quote sheet.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/quote/new"
                className="rounded-full bg-forest px-8 py-4 text-base font-semibold text-white shadow-lg shadow-forest/25 transition hover:bg-forest-deep"
              >
                Create quotation
              </Link>
              <Link
                href="/quotes"
                className="rounded-full border border-charcoal/15 bg-white/80 px-6 py-4 text-base font-semibold text-charcoal transition hover:border-forest/30 hover:text-forest"
              >
                View saved quotes
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-5 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Service",
              copy: "Type the business or service — it becomes the quote title.",
            },
            {
              step: "02",
              title: "Package",
              copy: "Pick Basic, Standard, or Premium with fixed deliverables.",
            },
            {
              step: "03",
              title: "Quote",
              copy: "Preview, save locally, and download a printable PDF.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-white/70 bg-white/75 px-6 py-6 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-deep">
                {item.step}
              </p>
              <h2 className="mt-2 font-serif text-2xl text-forest">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{item.copy}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
