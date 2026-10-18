import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/parallel";
export const ICP_DEFINITION = "B2B SaaS, 10-200 employees, recent funding or product launch";

function headers() {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.PARALLEL_API_KEY;
  if (!lovable) throw new Error("LOVABLE_API_KEY is not configured");
  if (!conn) throw new Error("PARALLEL_API_KEY is not configured");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": conn,
    "Content-Type": "application/json",
  };
}

const outputSchema = {
  type: "object",
  properties: {
    company_name: { type: "string", description: "Official company name" },
    description: { type: "string", description: "One-line description of what the company does" },
    industry: { type: "string" },
    headcount_range: { type: "string", description: "Estimated employee range, e.g. 11-50" },
    funding_info: { type: "string", description: "Funding stage or latest funding round with date and amount; 'Unknown' if not found" },
    key_contacts: {
      type: "array",
      description: "Up to 5 founders or leadership members",
      items: {
        type: "object",
        properties: { name: { type: "string" }, role: { type: "string" } },
        required: ["name", "role"],
        additionalProperties: false,
      },
    },
    icp_score: { type: "integer", description: `ICP fit 0-100 against: ${ICP_DEFINITION}` },
    score_reasoning: { type: "string", description: "1-2 sentences explaining the ICP score" },
  },
  required: ["company_name", "description", "industry", "headcount_range", "funding_info", "key_contacts", "icp_score", "score_reasoning"],
  additionalProperties: false,
};

const domainRe = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

function normalize(d: string) {
  return d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

export const startEnrichment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ domains: z.array(z.string()).min(1).max(10) }).parse(d))
  .handler(async ({ data }) => {
    const domains = Array.from(new Set(data.domains.map(normalize))).filter((d) => domainRe.test(d)).slice(0, 10);
    if (!domains.length) throw new Error("No valid domains provided");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("enrichment_runs")
      .insert(domains.map((domain) => ({ domain, status: "pending" })))
      .select("id, domain");
    if (error) throw new Error(error.message);

    await Promise.all(
      rows!.map(async (row) => {
        try {
          const res = await fetch(`${GATEWAY_URL}/v1/tasks/runs`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({
              input: `Research the company at domain ${row.domain}. Score its fit against this ICP: ${ICP_DEFINITION}.`,
              processor: "core",
              task_spec: { output_schema: { type: "json", json_schema: outputSchema } },
            }),
          });
          if (!res.ok) throw new Error(`Parallel [${res.status}]: ${await res.text()}`);
          const json = (await res.json()) as { run_id: string };
          await supabaseAdmin.from("enrichment_runs").update({ status: "running", parallel_run_id: json.run_id }).eq("id", row.id);
        } catch (e) {
          console.error(e);
          await supabaseAdmin.from("enrichment_runs").update({ status: "failed", error: String((e as Error).message).slice(0, 500) }).eq("id", row.id);
        }
      }),
    );
    return { ids: rows!.map((r) => r.id) };
  });

type Basis = { field: string; confidence?: string | null; citations?: { url: string; title?: string }[] };

export const pollEnrichment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("enrichment_runs").select("*").eq("id", data.id).single();
    if (!row || row.status !== "running" || !row.parallel_run_id) return { status: row?.status ?? "missing" };

    const res = await fetch(`${GATEWAY_URL}/v1/tasks/runs/${row.parallel_run_id}/result?timeout=1`, { headers: headers() });
    if (res.status === 408) return { status: "running" };
    if (res.status === 429 || res.status >= 500) return { status: "running" };
    if (!res.ok) {
      const body = await res.text();
      await supabaseAdmin.from("enrichment_runs").update({ status: "failed", error: `Parallel [${res.status}]: ${body}`.slice(0, 500) }).eq("id", row.id);
      return { status: "failed" };
    }
    const json = (await res.json()) as { output: { content: any; basis?: Basis[] } };
    let c = json.output?.content ?? {};
    if (typeof c === "string") { try { c = JSON.parse(c); } catch { c = {}; } }
    const basis = json.output?.basis ?? [];
    const byField = new Map(basis.map((b) => [b.field, b]));
    const contacts = (Array.isArray(c.key_contacts) ? c.key_contacts : []).map((k: any, i: number) => {
      const b = byField.get(`key_contacts.${i}`) ?? byField.get(`key_contacts.${i}.name`) ?? byField.get("key_contacts");
      return { name: k.name, role: k.role, confidence: b?.confidence ?? null, source_url: b?.citations?.[0]?.url ?? null };
    });
    const seen = new Set<string>();
    const citations: { url: string; confidence: string | null; field: string }[] = [];
    for (const b of basis) for (const cit of b.citations ?? []) {
      const key = `${b.field}|${cit.url}`;
      if (!cit.url || seen.has(key)) continue;
      seen.add(key);
      citations.push({ url: cit.url, confidence: b.confidence ?? null, field: b.field });
    }
    const score = Number.isFinite(Number(c.icp_score)) ? Math.max(0, Math.min(100, Math.round(Number(c.icp_score)))) : null;
    await supabaseAdmin.from("enrichment_runs").update({
      status: "complete",
      company_name: c.company_name ?? null,
      description: c.description ?? null,
      industry: c.industry ?? null,
      headcount_range: c.headcount_range ?? null,
      funding_info: c.funding_info ?? null,
      key_contacts: contacts,
      icp_score: score,
      score_reasoning: c.score_reasoning ?? null,
      citations,
      basis: basis as any,
    }).eq("id", row.id);
    return { status: "complete" };
  });
