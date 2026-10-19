import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radar, Loader2, ExternalLink, Sparkles, AlertTriangle, Users, Link2 } from "lucide-react";
import { startEnrichment, pollEnrichment, getRuns, ICP_DEFINITION } from "@/lib/enrichment.functions";
import type { Tables } from "@/integrations/supabase/types";

type Run = Tables<"enrichment_runs">;
type Contact = { name: string; role?: string; confidence?: string | null; source_url?: string | null };
type Citation = { url: string; confidence?: string | null; field: string };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Signal — Competitive Intelligence & Lead Enrichment" },
      { name: "description", content: "Paste company domains and get researched profiles, leadership, funding and ICP fit scores." },
      { property: "og:title", content: "Signal — Competitive Intelligence & Lead Enrichment" },
      { property: "og:description", content: "Researched company profiles with per-field confidence and sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [text, setText] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const start = useServerFn(startEnrichment);
  const poll = useServerFn(pollEnrichment);
  const fetchRuns = useServerFn(getRuns);

  const domains = useMemo(() => text.split(/\s|,/).map((s) => s.trim()).filter(Boolean), [text]);

  const SESSION_KEY = "signal_run_ids";
  const readIds = (): string[] => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]"); } catch { return []; }
  };
  const refresh = async () => {
    const ids = readIds();
    const data = await fetchRuns({ data: { ids } });
    setRuns(data as Run[]);
  };

  useEffect(() => {
    refresh().catch(() => {}).finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll Parallel for in-flight runs, then refresh this session's runs.
  const runsRef = useRef(runs); runsRef.current = runs;
  useEffect(() => {
    const t = setInterval(async () => {
      const active = runsRef.current.filter((r) => r.status === "running" || r.status === "pending");
      if (!active.length) return;
      await Promise.all(active.filter((r) => r.status === "running").map((r) => poll({ data: { id: r.id } }).catch(() => {})));
      refresh().catch(() => {});
    }, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll]);

  async function run() {
    setErr(null);
    if (!domains.length) return;
    if (domains.length > 10) { setErr("Up to 10 domains per run."); return; }
    setSubmitting(true);
    try {
      const { ids } = await start({ data: { domains } });
      sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids, ...readIds()].slice(0, 100)));
      setText("");
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally { setSubmitting(false); }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <header className="mb-10">
        <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-primary">
          <Radar className="h-4 w-4" /> Signal
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Lead intelligence, <span className="text-primary">on demand.</span>
        </h1>
      </header>

      {/* 1. Input panel */}
      <section className="glass rounded-2xl p-5 sm:p-6">
        <label htmlFor="domains" className="mb-2 block text-sm font-medium text-muted-foreground">Company domains — one per line, up to 10</label>
        <textarea
          id="domains"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={"linear.app\nvercel.com\nposthog.com"}
          className="w-full resize-y rounded-xl border border-input bg-background/60 p-4 font-mono text-sm outline-none transition focus:border-primary"
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground">ICP:</span> {ICP_DEFINITION}
          </p>
          <button
            onClick={run}
            disabled={submitting || !domains.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Run Enrichment{domains.length ? ` (${Math.min(domains.length, 10)})` : ""}
          </button>
        </div>
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      </section>

      {/* 2. Results / 3. Empty state */}
      <section className="mt-10">
        {loaded && runs.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="relative mb-6 grid h-24 w-24 place-items-center rounded-full glass">
              <Radar className="h-10 w-10 text-primary" />
              <span className="absolute inset-0 animate-ping rounded-full border border-primary/30" />
            </div>
            <p className="font-display text-lg">Paste domains to begin</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <AnimatePresence initial={false}>
              {runs.map((r) => <RunCard key={r.id} run={r} />)}
            </AnimatePresence>
          </div>
        )}
      </section>
    </main>
  );
}

function ConfidenceBadge({ level }: { level?: string | null | undefined }) {
  const l = (level ?? "unknown").toLowerCase();
  const cls = l === "high" ? "border-success/40 text-success" : l === "medium" ? "border-warning/40 text-warning" : l === "low" ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground";
  return <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}>{l}</span>;
}

function host(u: string) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } }

function RunCard({ run }: { run: Run }) {
  const busy = run.status === "pending" || run.status === "running";
  const contacts = (run.key_contacts as Contact[] | null) ?? [];
  const citations = (run.citations as Citation[] | null) ?? [];
  const score = run.icp_score;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="glass rounded-2xl p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs text-primary">{run.domain}</p>
          <h2 className="mt-1 truncate text-xl font-bold">{run.company_name ?? (busy ? "Researching…" : run.domain)}</h2>
          {run.description && <p className="mt-1 text-sm text-muted-foreground">{run.description}</p>}
        </div>
        {run.status === "complete" && score != null && (
          <div className="shrink-0 text-right">
            <div className="text-primary font-display text-4xl font-bold leading-none">{score}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">ICP fit</div>
          </div>
        )}
        {busy && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1 text-xs text-primary">
            <Loader2 className="h-3 w-3 animate-spin" /> {run.status}
          </span>
        )}
      </div>

      {busy && (
        <div className="mt-5 space-y-2">
          <div className="shimmer h-3 w-3/4 rounded" />
          <div className="shimmer h-3 w-1/2 rounded" />
          <div className="shimmer h-3 w-2/3 rounded" />
          <p className="pt-1 text-xs text-muted-foreground">Deep web research usually takes 1–5 minutes.</p>
        </div>
      )}

      {run.status === "failed" && (
        <p className="mt-4 flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Research failed. {run.error ? <span className="text-muted-foreground line-clamp-2">{run.error}</span> : null}
        </p>
      )}

      {run.status === "complete" && (
        <>
          <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[["Industry", run.industry], ["Headcount", run.headcount_range], ["Funding", run.funding_info]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-background/40 p-3">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className="mt-1 text-sm">{v || "—"}</dd>
              </div>
            ))}
          </dl>

          {run.score_reasoning && (
            <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm">
              <span className="font-semibold text-accent">Why this score: </span>{run.score_reasoning}
            </div>
          )}

          {contacts.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Users className="h-3.5 w-3.5" /> Key contacts</h3>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {contacts.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span><span className="font-medium">{c.name}</span>{c.role && <span className="text-muted-foreground"> · {c.role}</span>}</span>
                    <span className="flex items-center gap-2">
                      <ConfidenceBadge level={c.confidence} />
                      {c.source_url && (
                        <a href={c.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          {host(c.source_url)} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {citations.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> Sources</h3>
              <ul className="space-y-1.5">
                {citations.slice(0, 12).map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-xs">
                    <ConfidenceBadge level={c.confidence} />
                    <span className="font-mono text-muted-foreground">{c.field}</span>
                    <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 truncate text-primary hover:underline">
                      {host(c.url)} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </motion.article>
  );
}
