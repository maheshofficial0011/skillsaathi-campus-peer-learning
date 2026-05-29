-- ====================================================================
-- PHASE 5.2: LEARNING CIRCLE JOIN REQUESTS + PROFILE EXTENSIONS PATCH
-- ====================================================================

-- 1. Extend public.profiles with optional academic/learning fields for member verification
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS headline              TEXT,
  ADD COLUMN IF NOT EXISTS academic_interests     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS learning_goals         TEXT,
  ADD COLUMN IF NOT EXISTS current_focus          TEXT,
  ADD COLUMN IF NOT EXISTS qualification_summary TEXT,
  ADD COLUMN IF NOT EXISTS github_url             TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url           TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url           TEXT;

-- 2. Create the learning_circle_join_requests table
CREATE TABLE IF NOT EXISTS public.learning_circle_join_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id        UUID NOT NULL REFERENCES public.learning_circles(id) ON DELETE CASCADE,
  requester_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message          TEXT,
  role_interest    TEXT DEFAULT 'learner',
  status           TEXT NOT NULL DEFAULT 'pending',
  response_message TEXT,
  reviewed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT role_interest_check CHECK (role_interest IN ('learner', 'contributor', 'peer_mentor')),
  CONSTRAINT status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'))
);

-- 3. Create unique index for active pending requests (only one active pending request per student per circle)
CREATE UNIQUE INDEX IF NOT EXISTS lc_pending_req_idx 
  ON public.learning_circle_join_requests(circle_id, requester_id) 
  WHERE status = 'pending';

-- 4. Enable Row Level Security
ALTER TABLE public.learning_circle_join_requests ENABLE ROW LEVEL SECURITY;

-- 5. Bind handle_updated_at trigger
DROP TRIGGER IF EXISTS set_lc_join_requests_updated_at ON public.learning_circle_join_requests;
CREATE TRIGGER set_lc_join_requests_updated_at
  BEFORE UPDATE ON public.learning_circle_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. RLS Policies for learning_circle_join_requests
DROP POLICY IF EXISTS "join_req_select" ON public.learning_circle_join_requests;
DROP POLICY IF EXISTS "join_req_insert" ON public.learning_circle_join_requests;
DROP POLICY IF EXISTS "join_req_update_requester" ON public.learning_circle_join_requests;
DROP POLICY IF EXISTS "join_req_update_owner" ON public.learning_circle_join_requests;

-- A. SELECT Policy
-- Requesters can see their own requests; circle owners can see requests for their circle.
CREATE POLICY "join_req_select"
  ON public.learning_circle_join_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );

-- B. INSERT Policy
-- Any authenticated student can submit a join request for themselves under the following conditions:
-- 1. The target circle must be active.
-- 2. The user must not already be the owner or an active member of that circle.
CREATE POLICY "join_req_insert"
  ON public.learning_circle_join_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND (
      SELECT status 
      FROM public.learning_circles 
      WHERE id = circle_id
    ) = 'active'
    AND NOT EXISTS (
      SELECT 1 
      FROM public.learning_circle_members 
      WHERE circle_id = learning_circle_join_requests.circle_id 
        AND user_id = auth.uid()
    )
  );

-- C. UPDATE Policy: Requester cancellation
-- Requesters can only cancel their own pending requests.
CREATE POLICY "join_req_update_requester"
  ON public.learning_circle_join_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = requester_id 
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = requester_id 
    AND status = 'cancelled'
  );

-- D. UPDATE Policy: Owner approval/rejection
-- Circle owners can accept or reject pending requests for their circle.
CREATE POLICY "join_req_update_owner"
  ON public.learning_circle_join_requests FOR UPDATE
  TO authenticated
  USING (
    public.is_learning_circle_owner(circle_id, auth.uid()) 
    AND status = 'pending'
  )
  WITH CHECK (
    public.is_learning_circle_owner(circle_id, auth.uid()) 
    AND status IN ('accepted', 'rejected')
  );
