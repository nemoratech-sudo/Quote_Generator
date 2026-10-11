import Image from "next/image";
import Link from "next/link";

interface SiteHeaderProps {
  compact?: boolean;
}

export default function SiteHeader({ compact = false }: SiteHeaderProps) {
  return (
    <header className={`print:hidden ${compact ? "py-4" : "py-5"}`}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          <Image
            src="/brand/nemora-logo.jpg"
            alt="Nemora"
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
            priority
          />
          <span className="min-w-0">
            <span className="block font-serif text-3xl leading-none tracking-tight text-forest transition-colors group-hover:text-forest-deep sm:text-[2rem]">
              Nemora
            </span>
            <span className="mt-0.5 hidden text-xs font-medium uppercase tracking-[0.18em] text-charcoal/45 sm:block">
              Quotes
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/admin"
            className="rounded-full px-2.5 py-2 text-sm font-medium text-charcoal/70 transition hover:bg-white/70 hover:text-forest sm:px-3"
          >
            Admin
          </Link>
          <Link
            href="/quotes"
            className="rounded-full px-2.5 py-2 text-sm font-medium text-charcoal/70 transition hover:bg-white/70 hover:text-forest sm:px-3"
          >
            Saved
          </Link>
          <Link
            href="/"
            className="rounded-full bg-forest px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-forest-deep sm:px-4"
          >
            New quote
          </Link>
        </nav>
      </div>
    </header>
  );
}
