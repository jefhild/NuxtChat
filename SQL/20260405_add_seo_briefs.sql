-- Creates the seo_briefs table for daily AI-generated SEO analysis
CREATE TABLE IF NOT EXISTS seo_briefs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date        date NOT NULL UNIQUE,
  headline          text,
  pages_working     jsonb,
  pages_to_optimize jsonb,
  pages_to_create   jsonb,
  action_plan       text,
  data_window_days  integer DEFAULT 7,
  sources_used      text[],
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE seo_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON seo_briefs FOR ALL USING (true) WITH CHECK (true);
