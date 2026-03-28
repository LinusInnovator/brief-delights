-- Run this in your Supabase SQL Editor to create the broker table

CREATE TABLE IF NOT EXISTS public.research_missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  query TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  format TEXT DEFAULT 'spatial_json',
  depth TEXT DEFAULT 'rapid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime so the Drone can listen for inserts (optional but good for instant JIT)
ALTER PUBLICATION supabase_realtime ADD TABLE research_missions;

-- Basic RLS policies (adjust to your security needs)
ALTER TABLE public.research_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" 
  ON public.research_missions 
  USING (true) WITH CHECK (true);
