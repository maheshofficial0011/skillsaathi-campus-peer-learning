-- ============================================================
-- PHASE 4.5: SENIOR CONNECT REPUTATION & SAFETY PATCH
-- Safe to run on existing Supabase project.
-- Does NOT drop tables, does NOT delete data.
-- ============================================================

-- ────────────────────────────────────────
-- 1. Extend profiles Table with mentor_status
-- ────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mentor_status TEXT NOT NULL DEFAULT 'accepting';

-- Safely add CHECK constraint for mentor_status values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_mentor_status;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_mentor_status CHECK (mentor_status IN ('accepting', 'busy', 'unavailable'));

-- ────────────────────────────────────────
-- 2. Prevent Duplicate Active Senior Connect Requests via Partial Index
-- ────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_senior_request
  ON public.senior_guidance_requests(requester_id, senior_id)
  WHERE (status IN ('pending', 'accepted'));

-- ────────────────────────────────────────
-- 3. Create senior_guidance_feedback Table
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.senior_guidance_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.senior_guidance_requests(id) ON DELETE CASCADE,
  senior_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  helpful BOOLEAN NOT NULL DEFAULT true,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_request_review UNIQUE (request_id, created_by),
  CONSTRAINT no_self_review CHECK (created_by != senior_id)
);

-- ────────────────────────────────────────
-- 4. Enable RLS and Policies for Reviews
-- ────────────────────────────────────────
ALTER TABLE public.senior_guidance_feedback ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Authenticated users can read reviews
DROP POLICY IF EXISTS select_reviews_policy ON public.senior_guidance_feedback;
CREATE POLICY select_reviews_policy ON public.senior_guidance_feedback
  FOR SELECT TO authenticated USING (true);

-- INSERT policy: Junior can insert only for completed requests they requested
DROP POLICY IF EXISTS insert_reviews_policy ON public.senior_guidance_feedback;
CREATE POLICY insert_reviews_policy ON public.senior_guidance_feedback
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM public.senior_guidance_requests r
      WHERE r.id = request_id
        AND r.requester_id = auth.uid()
        AND r.senior_id = senior_guidance_feedback.senior_id
        AND r.status = 'completed'
    )
  );

-- UPDATE policy: Creator can update their own feedback row only
DROP POLICY IF EXISTS update_reviews_policy ON public.senior_guidance_feedback;
CREATE POLICY update_reviews_policy ON public.senior_guidance_feedback
  FOR UPDATE TO authenticated USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ────────────────────────────────────────
-- 5. handle_updated_at Trigger
-- ────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_set_feedback_updated_at ON public.senior_guidance_feedback;
CREATE TRIGGER trg_set_feedback_updated_at
  BEFORE UPDATE ON public.senior_guidance_feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
