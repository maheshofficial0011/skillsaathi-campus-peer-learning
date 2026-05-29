-- ====================================================================
-- PHASE 5.3: LEARNING CIRCLE WORKFLOW POLISH & RESOURCES RANKING PATCH
-- ====================================================================

-- 1. Extend public.learning_circles table with private meeting properties
ALTER TABLE public.learning_circles 
  ADD COLUMN IF NOT EXISTS meeting_link     TEXT,
  ADD COLUMN IF NOT EXISTS meeting_password TEXT;

-- 2. Extend public.learning_circle_resources table with pinning properties
ALTER TABLE public.learning_circle_resources
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- 3. Extend public.learning_circle_join_requests table with membership & leave tracking columns
ALTER TABLE public.learning_circle_join_requests
  ADD COLUMN IF NOT EXISTS membership_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS member_left_at         TIMESTAMPTZ;

-- 4. Create the learning_circle_resource_likes table
CREATE TABLE IF NOT EXISTS public.learning_circle_resource_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.learning_circle_resources(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_resource_user_like UNIQUE (resource_id, user_id)
);

-- 5. Enable Row Level Security
ALTER TABLE public.learning_circle_resource_likes ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for learning_circle_resource_likes
DROP POLICY IF EXISTS "lc_likes_select" ON public.learning_circle_resource_likes;
DROP POLICY IF EXISTS "lc_likes_insert" ON public.learning_circle_resource_likes;
DROP POLICY IF EXISTS "lc_likes_delete" ON public.learning_circle_resource_likes;

-- A. SELECT Policy
-- Circle members and owners can read likes for resources shared in their circle.
CREATE POLICY "lc_likes_select"
  ON public.learning_circle_resource_likes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_circle_resources r
      WHERE r.id = resource_id
        AND (
          public.is_learning_circle_member(r.circle_id, auth.uid())
          OR public.is_learning_circle_owner(r.circle_id, auth.uid())
        )
    )
  );

-- B. INSERT Policy
-- Any authenticated student can like a resource in a circle they belong to.
CREATE POLICY "lc_likes_insert"
  ON public.learning_circle_resource_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.learning_circle_resources r
      WHERE r.id = resource_id
        AND (
          public.is_learning_circle_member(r.circle_id, auth.uid())
          OR public.is_learning_circle_owner(r.circle_id, auth.uid())
        )
    )
  );

-- C. DELETE Policy
-- Any user can unlike their own like.
CREATE POLICY "lc_likes_delete"
  ON public.learning_circle_resource_likes FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
  );
