const bar = "rounded bg-muted animate-pulse";

/**
 * Skeleton that mirrors the finished result card: header block,
 * a 3-up metric grid, and a contacts block. Flat charcoal shapes,
 * solid-color opacity pulse only (animate-pulse) — no gradients.
 */
export function RunSkeleton({ domain }: { domain?: string | null }) {
  return (
    <article
      className="glass rounded-2xl p-5 sm:p-6"
      aria-busy="true"
      aria-label={`Researching ${domain ?? "company"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {domain ? (
            <p className="font-mono text-xs text-primary/70">{domain}</p>
          ) : (
            <div className={`${bar} h-3 w-24`} />
          )}
          <div className={`${bar} mt-3 h-7 w-2/5 max-w-[16rem]`} style={{ animationDelay: "80ms" }} />
          <div className={`${bar} mt-3 h-3 w-4/5 max-w-[28rem]`} style={{ animationDelay: "160ms" }} />
          <div className={`${bar} mt-2 h-3 w-1/2 max-w-[18rem]`} style={{ animationDelay: "240ms" }} />
        </div>
        <div className={`${bar} h-12 w-16 shrink-0 rounded-xl`} style={{ animationDelay: "120ms" }} />
      </div>

      {/* Metric grid */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-background/40 p-3">
            <div className={`${bar} h-2 w-14`} style={{ animationDelay: `${i * 100}ms` }} />
            <div className={`${bar} mt-2 h-4 w-3/4`} style={{ animationDelay: `${i * 100 + 120}ms` }} />
          </div>
        ))}
      </div>

      {/* Contacts block */}
      <div className="mt-5 rounded-xl border border-border p-3">
        <div className={`${bar} h-2 w-24`} style={{ animationDelay: "200ms" }} />
        <ul className="mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <div className={`${bar} h-3 w-1/3`} style={{ animationDelay: `${i * 120 + 260}ms` }} />
              <div className={`${bar} h-3 w-16`} style={{ animationDelay: `${i * 120 + 320}ms` }} />
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Deep web research usually takes 1–5 minutes.</p>
    </article>
  );
}
