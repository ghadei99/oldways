import Link from "next/link";
import { formatReference, passageHref } from "@/lib/references";

export function CanonicalRef({
  compact,
  className = "",
}: {
  compact: string;
  className?: string;
}) {
  return (
    <Link
      href={passageHref(compact)}
      className={`ref-chip ${className}`}
      aria-label={`Open ${formatReference(compact)}`}
    >
      {formatReference(compact)}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
