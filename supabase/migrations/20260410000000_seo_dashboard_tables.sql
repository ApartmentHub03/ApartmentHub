-- SEO Dashboard Tables
-- Creates 5 tables for SEO analytics, AI council, and self-improvement loop

-- 1. TTL-based cache for all external API responses
CREATE TABLE IF NOT EXISTS seo_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INTEGER NOT NULL DEFAULT 3600,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_cache_key ON seo_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_seo_cache_fetched ON seo_cache(fetched_at);

-- 2. Historical SEO scores per page (tracks improvement over time)
CREATE TABLE IF NOT EXISTS seo_page_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  overall_score NUMERIC(5,2),
  technical_score NUMERIC(5,2),
  content_score NUMERIC(5,2),
  keyword_score NUMERIC(5,2),
  ux_score NUMERIC(5,2),
  details JSONB,
  action_items JSONB,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_scores_path ON seo_page_scores(page_path);
CREATE INDEX IF NOT EXISTS idx_seo_scores_date ON seo_page_scores(analyzed_at);

-- 3. AI council run audit log
CREATE TABLE IF NOT EXISTS seo_ai_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_data JSONB,
  output_data JSONB,
  pages_analyzed INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_ai_runs_status ON seo_ai_runs(status);
CREATE INDEX IF NOT EXISTS idx_seo_ai_runs_created ON seo_ai_runs(created_at);

-- 4. Track before/after for the self-improvement loop
CREATE TABLE IF NOT EXISTS seo_optimizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  query_keyword TEXT,
  optimization_type TEXT NOT NULL,
  before_value TEXT,
  after_value TEXT,
  before_ctr NUMERIC(5,2),
  before_impressions INTEGER,
  before_clicks INTEGER,
  before_position NUMERIC(5,1),
  after_ctr NUMERIC(5,2),
  after_impressions INTEGER,
  after_clicks INTEGER,
  after_position NUMERIC(5,1),
  status TEXT DEFAULT 'suggested',
  suggested_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ,
  measured_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_seo_opt_page ON seo_optimizations(page_path);
CREATE INDEX IF NOT EXISTS idx_seo_opt_status ON seo_optimizations(status);

-- 5. Growing library of patterns that work for this site
CREATE TABLE IF NOT EXISTS seo_success_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_type TEXT NOT NULL,
  description TEXT NOT NULL,
  avg_ctr_lift NUMERIC(5,2),
  times_used INTEGER DEFAULT 1,
  times_successful INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2),
  examples JSONB,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_seo_patterns_type ON seo_success_patterns(pattern_type);
