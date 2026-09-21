export function EpistemicLabel({
  children,
  tone = "default",
}: {
  children: string;
  tone?: "default" | "copper" | "source";
}) {
  const color =
    tone === "copper"
      ? "text-copper"
      : tone === "source"
        ? "text-indigo"
        : "text-ink-soft";
  return (
    <span
      className={`mb-2 block text-[0.65rem] uppercase tracking-[0.2em] ${color}`}
    >
      {children}
    </span>
  );
}
