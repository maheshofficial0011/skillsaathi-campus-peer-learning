-- ============================================================
-- PHASE 4: SENIOR CONNECT SESSION COORDINATION PATCH
-- Adds session coordination columns to senior_guidance_requests.
-- Safe to run on existing Supabase project.
-- Does NOT drop tables, does NOT delete data.
-- ============================================================

-- Add meeting coordination fields if they do not exist
ALTER TABLE public.senior_guidance_requests
  ADD COLUMN IF NOT EXISTS meeting_mode TEXT,
  ADD COLUMN IF NOT EXISTS meeting_details TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_time TEXT;

-- Safe check constraint for meeting_mode values (Online, In-Person, Hybrid)
ALTER TABLE public.senior_guidance_requests
  DROP CONSTRAINT IF EXISTS sgr_meeting_mode_check;

ALTER TABLE public.senior_guidance_requests
  ADD CONSTRAINT sgr_meeting_mode_check
  CHECK (meeting_mode IS NULL OR meeting_mode IN ('Online', 'In-Person', 'Hybrid'));

-- Comments for database self-documentation
COMMENT ON COLUMN public.senior_guidance_requests.meeting_mode IS 'Coordination mode chosen by the senior (Online, In-Person, Hybrid)';
COMMENT ON COLUMN public.senior_guidance_requests.meeting_details IS 'Google Meet links, contact info, or campus locations shared by the senior';
COMMENT ON COLUMN public.senior_guidance_requests.scheduled_time IS 'agreed session date and time description';
