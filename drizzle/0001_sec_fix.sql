ALTER TABLE public.trek_participant ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trek_participant FROM anon, authenticated;
