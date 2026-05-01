-- SEO Dispatch Jobs
-- Tracks each "Develop" click from the SEO dashboard so the UI can show
-- In Progress / Completed sections, support refinement prompts, and merge
-- the shared `seo` branch into `main` when ready.

CREATE TABLE IF NOT EXISTS seo_dispatch_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mcp_job_id TEXT,
  suggestion JSONB NOT NULL,
  suggestion_type TEXT NOT NULL,
  dashboard_context JSONB,
  prompts JSONB NOT NULL DEFAULT '[]'::jsonb,
  branch TEXT NOT NULL DEFAULT 'seo',
  status TEXT NOT NULL DEFAULT 'in_progress',
  pr_number INTEGER,
  pr_url TEXT,
  merge_commit_sha TEXT,
  triggered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_seo_dispatch_jobs_status ON seo_dispatch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_seo_dispatch_jobs_created ON seo_dispatch_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_seo_dispatch_jobs_mcp_job ON seo_dispatch_jobs(mcp_job_id);
