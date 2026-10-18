DROP POLICY IF EXISTS "Public can read runs" ON public.enrichment_runs;
REVOKE SELECT ON public.enrichment_runs FROM anon, authenticated;