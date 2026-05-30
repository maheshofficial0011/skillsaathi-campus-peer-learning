-- ====================================================================
-- PHASE 5.6: PROFESSIONAL LEARNING CIRCLE DISCUSSION BOARD PATCH
-- ====================================================================
-- Idempotent, safe SQL additions to enable announcements, threads,
-- reactions, resolved states, and owner-moderator controls.
-- ====================================================================

-- 1. EXTEND public.learning_circle_posts TABLE
ALTER TABLE public.learning_circle_posts 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. DROP OLD CASE-SENSITIVE CHECK AND BACKFILL SAFELY
ALTER TABLE public.learning_circle_posts DROP CONSTRAINT IF EXISTS chk_lcp_type;

-- Safe data backfill: map casing and ensure content is copied to body/title
UPDATE public.learning_circle_posts SET body = content WHERE body IS NULL;
UPDATE public.learning_circle_posts SET title = COALESCE(substring(content from 1 for 50), 'Untitled Discussion') WHERE title IS NULL;

-- Standardize existing statuses to lowercase professional tokens
UPDATE public.learning_circle_posts SET post_type = 'discussion' WHERE post_type = 'Update';
UPDATE public.learning_circle_posts SET post_type = 'question' WHERE post_type = 'Question';
UPDATE public.learning_circle_posts SET post_type = 'study_plan' WHERE post_type = 'Plan';
UPDATE public.learning_circle_posts SET post_type = 'announcement' WHERE post_type = 'Announcement';

-- Set default post_type to lowercase discussion
ALTER TABLE public.learning_circle_posts ALTER COLUMN post_type SET DEFAULT 'discussion';

-- Add updated check constraint supporting both legacy and new tokens for backward compatibility
ALTER TABLE public.learning_circle_posts 
  ADD CONSTRAINT chk_lcp_type CHECK (post_type IN ('Update', 'Question', 'Plan', 'Announcement', 'discussion', 'question', 'announcement', 'study_plan'));

-- 3. CREATE THREADED REPLIES TABLE
CREATE TABLE IF NOT EXISTS public.learning_circle_post_replies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES public.learning_circle_posts(id) ON DELETE CASCADE,
  circle_id  UUID        NOT NULL REFERENCES public.learning_circles(id)      ON DELETE CASCADE,
  created_by UUID        NOT NULL REFERENCES public.profiles(id)              ON DELETE CASCADE,
  body       TEXT        NOT NULL,
  edited_at  TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CREATE HELPFUL REACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.learning_circle_post_reactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID        NOT NULL REFERENCES public.learning_circle_posts(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id)              ON DELETE CASCADE,
  reaction_type TEXT        NOT NULL DEFAULT 'helpful',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_post_user_reaction UNIQUE (post_id, user_id, reaction_type),
  CONSTRAINT chk_reaction_type CHECK (reaction_type IN ('helpful'))
);

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.learning_circle_post_replies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_circle_post_reactions ENABLE ROW LEVEL SECURITY;

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lcpr_post_id   ON public.learning_circle_post_replies (post_id);
CREATE INDEX IF NOT EXISTS idx_lcpr_circle_id ON public.learning_circle_post_replies (circle_id);
CREATE INDEX IF NOT EXISTS idx_lcpr_created_by ON public.learning_circle_post_replies (created_by);
CREATE INDEX IF NOT EXISTS idx_lcpreact_post_id ON public.learning_circle_post_reactions (post_id);

-- 7. RE-APPLY OR CREATE RLS POLICIES FOR POSTS, REPLIES, AND REACTIONS

-- A. POSTS POLICIES (DROP OLD BEFORE RECREATION)
DROP POLICY IF EXISTS "lcp_select" ON public.learning_circle_posts;
DROP POLICY IF EXISTS "lcp_insert" ON public.learning_circle_posts;
DROP POLICY IF EXISTS "lcp_update" ON public.learning_circle_posts;
DROP POLICY IF EXISTS "lcp_delete" ON public.learning_circle_posts;

CREATE POLICY "lcp_select" ON public.learning_circle_posts
  FOR SELECT TO authenticated
  USING (
    public.can_access_learning_circle(circle_id, auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "lcp_insert" ON public.learning_circle_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.learning_circles c
      WHERE c.id = circle_id AND c.status = 'active'
    )
    AND (
      public.is_learning_circle_member(circle_id, auth.uid())
      OR public.is_learning_circle_owner(circle_id, auth.uid())
    )
    -- announcements can only be posted by the circle owner
    AND (
      post_type != 'announcement'
      OR public.is_learning_circle_owner(circle_id, auth.uid())
    )
  );

CREATE POLICY "lcp_update" ON public.learning_circle_posts
  FOR UPDATE TO authenticated
  USING (
    (created_by = auth.uid() AND deleted_at IS NULL)
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  )
  WITH CHECK (
    (created_by = auth.uid() AND deleted_at IS NULL)
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );

CREATE POLICY "lcp_delete" ON public.learning_circle_posts
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );

-- B. REPLIES POLICIES
DROP POLICY IF EXISTS "lc_replies_select" ON public.learning_circle_post_replies;
DROP POLICY IF EXISTS "lc_replies_insert" ON public.learning_circle_post_replies;
DROP POLICY IF EXISTS "lc_replies_update" ON public.learning_circle_post_replies;
DROP POLICY IF EXISTS "lc_replies_delete" ON public.learning_circle_post_replies;

CREATE POLICY "lc_replies_select" ON public.learning_circle_post_replies
  FOR SELECT TO authenticated
  USING (
    public.can_access_learning_circle(circle_id, auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "lc_replies_insert" ON public.learning_circle_post_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.learning_circles c
      WHERE c.id = circle_id AND c.status = 'active'
    )
    AND (
      public.is_learning_circle_member(circle_id, auth.uid())
      OR public.is_learning_circle_owner(circle_id, auth.uid())
    )
  );

CREATE POLICY "lc_replies_update" ON public.learning_circle_post_replies
  FOR UPDATE TO authenticated
  USING (
    (created_by = auth.uid() AND deleted_at IS NULL)
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  )
  WITH CHECK (
    (created_by = auth.uid() AND deleted_at IS NULL)
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );

CREATE POLICY "lc_replies_delete" ON public.learning_circle_post_replies
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );

-- C. REACTIONS POLICIES
DROP POLICY IF EXISTS "lc_reactions_select" ON public.learning_circle_post_reactions;
DROP POLICY IF EXISTS "lc_reactions_insert" ON public.learning_circle_post_reactions;
DROP POLICY IF EXISTS "lc_reactions_delete" ON public.learning_circle_post_reactions;

-- In order to break recursion, we can fetch circle_id securely without trigger recursion
CREATE POLICY "lc_reactions_select" ON public.learning_circle_post_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_circle_posts p
      WHERE p.id = post_id
        AND public.can_access_learning_circle(p.circle_id, auth.uid())
    )
  );

CREATE POLICY "lc_reactions_insert" ON public.learning_circle_post_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.learning_circle_posts p
      WHERE p.id = post_id
        AND (
          public.is_learning_circle_member(p.circle_id, auth.uid())
          OR public.is_learning_circle_owner(p.circle_id, auth.uid())
        )
    )
  );

CREATE POLICY "lc_reactions_delete" ON public.learning_circle_post_reactions
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
  );

-- 8. TRIGGER FOR UPDATED_AT ON REPLIES
DROP TRIGGER IF EXISTS on_learning_circle_post_reply_updated ON public.learning_circle_post_replies;
CREATE TRIGGER on_learning_circle_post_reply_updated
  BEFORE UPDATE ON public.learning_circle_post_replies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 9. ADD-ON: LIGHTWEIGHT USER PRESENCE TRACKING
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.learning_circle_presence (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id    UUID        NOT NULL REFERENCES public.learning_circles(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id)         ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_tab  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_circle_user UNIQUE (circle_id, user_id)
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.learning_circle_presence ENABLE ROW LEVEL SECURITY;

-- INDEXES FOR PRESENCE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lcpresence_circle ON public.learning_circle_presence (circle_id);
CREATE INDEX IF NOT EXISTS idx_lcpresence_user   ON public.learning_circle_presence (user_id);
CREATE INDEX IF NOT EXISTS idx_lcpresence_seen   ON public.learning_circle_presence (circle_id, last_seen_at);

-- RLS POLICIES FOR PRESENCE
DROP POLICY IF EXISTS "lc_presence_select" ON public.learning_circle_presence;
DROP POLICY IF EXISTS "lc_presence_insert" ON public.learning_circle_presence;
DROP POLICY IF EXISTS "lc_presence_update" ON public.learning_circle_presence;

CREATE POLICY "lc_presence_select" ON public.learning_circle_presence
  FOR SELECT TO authenticated
  USING (
    public.can_access_learning_circle(circle_id, auth.uid())
  );

CREATE POLICY "lc_presence_insert" ON public.learning_circle_presence
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_learning_circle(circle_id, auth.uid())
  );

CREATE POLICY "lc_presence_update" ON public.learning_circle_presence
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND public.can_access_learning_circle(circle_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_learning_circle(circle_id, auth.uid())
  );

-- TRIGGER FOR UPDATED_AT ON PRESENCE
DROP TRIGGER IF EXISTS on_learning_circle_presence_updated ON public.learning_circle_presence;
CREATE TRIGGER on_learning_circle_presence_updated
  BEFORE UPDATE ON public.learning_circle_presence
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- END OF PHASE 5.6 DISCUSSION BOARD & PRESENCE SQL PATCH
-- ====================================================================

