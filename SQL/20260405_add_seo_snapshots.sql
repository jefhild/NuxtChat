-- Creates the seo_snapshots table for daily page-level metrics from GSC and Bing
CREATE TABLE IF NOT EXISTS seo_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  source        text NOT NULL CHECK (source IN ('gsc', 'bing')),
  page_url      text NOT NULL,
  impressions   integer NOT NULL DEFAULT 0,
  clicks        integer NOT NULL DEFAULT 0,
  ctr           numeric(6,4),
  avg_position  numeric(6,2),
  top_queries   jsonb,
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT seo_snapshots_unique UNIQUE (snapshot_date, source, page_url)
);

CREATE INDEX IF NOT EXISTS idx_seo_snapshots_date_source ON seo_snapshots (snapshot_date DESC, source);
CREATE INDEX IF NOT EXISTS idx_seo_snapshots_page ON seo_snapshots (page_url, snapshot_date DESC);

ALTER TABLE seo_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON seo_snapshots FOR ALL USING (true) WITH CHECK (true);
