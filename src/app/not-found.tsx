import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
        Not found
      </p>
      <h1 className="mt-3 font-serif text-4xl">This folio is not in the library.</h1>
      <p className="mt-4 text-ink-soft">
        The reference may be outside the development seed, or the path may be
        mistyped.
      </p>
      <Link href="/" className="mt-8 inline-block text-indigo">
        Return home
      </Link>
    </div>
  );
}
