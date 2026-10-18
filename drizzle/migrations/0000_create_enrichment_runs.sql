CREATE TABLE public.enrichment_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  domain text NOT NULL,
  company_name text,
  description text,
  industry text,
  headcount_range text,
  funding_info text,
  key_contacts jsonb,
  icp_score integer,
  score_reasoning text,
  citations jsonb,
  status text NOT NULL DEFAULT 'pending',
  parallel_run_id text,
  basis jsonb,
  error text
);
GRANT SELECT ON public.enrichment_runs TO anon, authenticated;
GRANT ALL ON public.enrichment_runs TO service_role;
ALTER TABLE public.enrichment_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read runs" ON public.enrichment_runs FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.enrichment_runs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrichment_runs;