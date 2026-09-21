import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-16 border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-soft md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="font-serif text-base text-ink">The Vedic Library</p>
          <p className="mt-1 max-w-md">
            Source text, translation, and editorial narrative are kept distinct.
            Canonical references point to passages, not pages.
          </p>
        </div>
        <div className="flex gap-5">
          <Link href="/about" className="hover:text-ink">
            About
          </Link>
          <Link href="/sources" className="hover:text-ink">
            Sources
          </Link>
          <Link href="/texts/rigveda" className="hover:text-ink">
            Rigveda
          </Link>
          <Link href="/search" className="hover:text-ink">
            Search
          </Link>
        </div>
      </div>
    </footer>
  );
}
