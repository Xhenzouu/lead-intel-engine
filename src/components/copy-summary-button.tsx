import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Run = Tables<"enrichment_runs">;

/** Plain-text company summary — never "[object Object]". */
export function buildRunSummary(run: Run): string {
  const line = (label: string, value: unknown) =>
    `${label}: ${value === null || value === undefined || value === "" ? "—" : String(value)}`;

  return [
    run.company_name ?? run.domain,
    `Domain: ${run.domain}`,
    line("Industry", run.industry),
    line("Headcount", run.headcount_range),
    line("ICP fit", run.icp_score == null ? null : `${run.icp_score}/100`),
    line("Why this score", run.score_reasoning),
  ].join("\n");
}

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
}

export function CopySummaryButton({ run }: { run: Run }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await writeClipboard(buildRunSummary(run));
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied company summary" : "Copy company summary"}
      title={copied ? "Copied" : "Copy summary"}
      className={
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition " +
        (copied
          ? "border-success/50 text-success"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary")
      }
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
