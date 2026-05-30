-- ============================================================
-- Phase 6.3C: Project Lifecycle Polish Patch
-- Adds lifecycle tracking columns to project_posts:
--   completed_at, completion_summary, archived_at
--
-- SAFE: Uses IF NOT EXISTS — no destructive drops.
-- Apply this in your Supabase SQL editor BEFORE deploying.
-- ============================================================

-- 1. Add completed_at timestamp
ALTER TABLE public.project_posts
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add completion_summary for Team Lead to write a final note
ALTER TABLE public.project_posts
  ADD COLUMN IF NOT EXISTS completion_summary TEXT DEFAULT NULL;

-- 3. Add archived_at timestamp
ALTER TABLE public.project_posts
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================
-- Verification: Run these SELECT statements to confirm columns
-- ============================================================
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'project_posts'
--   AND column_name IN ('completed_at', 'completion_summary', 'archived_at');
