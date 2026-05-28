-- ============================================================
-- PHASE 4: SENIOR CONNECT PATCH
-- Safe to run on existing Supabase project.
-- Does NOT drop tables, does NOT delete existing data.
-- Run AFTER all previous phase patches.
-- ============================================================

-- ────────────────────────────────────────
-- 1. Ensure mentor fields exist on profiles
--    (already in schema.sql, but safe to re-add)
-- ────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_senior_mentor BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mentor_topics TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mentor_bio TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS availability TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS help_mode TEXT DEFAULT 'Hybrid';

-- Ensure profile update policy exists (safe drop + recreate)
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────
-- 2. Create senior_guidance_requests table
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.senior_guidance_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  senior_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic           TEXT        NOT NULL,
  message         TEXT        NOT NULL,
  preferred_mode  TEXT        NOT NULL DEFAULT 'Hybrid',
  preferred_time  TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending',
  response_message TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sgr_no_self_request  CHECK (requester_id != senior_id),
  CONSTRAINT sgr_status_check     CHECK (status IN ('pending','accepted','declined','completed','cancelled')),
  CONSTRAINT sgr_mode_check       CHECK (preferred_mode IN ('Online','In-Person','Hybrid'))
);

-- ────────────────────────────────────────
-- 3. updated_at trigger on senior_guidance_requests
-- ────────────────────────────────────────
DROP TRIGGER IF EXISTS on_senior_guidance_request_updated ON public.senior_guidance_requests;
CREATE TRIGGER on_senior_guidance_request_updated
  BEFORE UPDATE ON public.senior_guidance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────
-- 4. Enable RLS
-- ────────────────────────────────────────
ALTER TABLE public.senior_guidance_requests ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────
-- 5. RLS Policies
-- ────────────────────────────────────────

-- SELECT: only requester or assigned senior
DROP POLICY IF EXISTS "Guidance request participants can read" ON public.senior_guidance_requests;
CREATE POLICY "Guidance request participants can read"
  ON public.senior_guidance_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = senior_id);

-- INSERT: authenticated user creating own request, not to self
DROP POLICY IF EXISTS "Requester can create guidance request" ON public.senior_guidance_requests;
CREATE POLICY "Requester can create guidance request"
  ON public.senior_guidance_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND auth.uid() != senior_id
  );

-- UPDATE: requester can cancel (pending or accepted only, cannot touch response fields)
DROP POLICY IF EXISTS "Requester can cancel own request" ON public.senior_guidance_requests;
CREATE POLICY "Requester can cancel own request"
  ON public.senior_guidance_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = requester_id
    AND status IN ('pending', 'accepted')
  )
  WITH CHECK (
    auth.uid() = requester_id
    AND status = 'cancelled'
  );

-- UPDATE: senior can accept/decline/complete their assigned requests
DROP POLICY IF EXISTS "Senior can respond to own requests" ON public.senior_guidance_requests;
CREATE POLICY "Senior can respond to own requests"
  ON public.senior_guidance_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = senior_id)
  WITH CHECK (auth.uid() = senior_id);

-- No DELETE policy — use cancel status instead
