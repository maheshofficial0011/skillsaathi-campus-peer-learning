-- ====================================================================
-- PHASE 5.6A: DISCUSSION BOARD REPLY REACTIONS & POLICY FIXES
-- ====================================================================

-- 1. CREATE REPLY REACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.learning_circle_post_reply_reactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id      UUID        NOT NULL REFERENCES public.learning_circle_post_replies(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id)                    ON DELETE CASCADE,
  reaction_type TEXT        NOT NULL DEFAULT 'helpful',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_reply_user_reaction UNIQUE (reply_id, user_id, reaction_type),
  CONSTRAINT chk_reply_reaction_type CHECK (reaction_type IN ('helpful'))
);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.learning_circle_post_reply_reactions ENABLE ROW LEVEL SECURITY;

-- 3. INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lcprr_reply_id ON public.learning_circle_post_reply_reactions (reply_id);

-- 4. RLS POLICIES FOR REPLY REACTIONS
DROP POLICY IF EXISTS "lc_reply_reactions_select" ON public.learning_circle_post_reply_reactions;
DROP POLICY IF EXISTS "lc_reply_reactions_insert" ON public.learning_circle_post_reply_reactions;
DROP POLICY IF EXISTS "lc_reply_reactions_delete" ON public.learning_circle_post_reply_reactions;

CREATE POLICY "lc_reply_reactions_select" ON public.learning_circle_post_reply_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_circle_post_replies r
      WHERE r.id = reply_id
        AND public.can_access_learning_circle(r.circle_id, auth.uid())
    )
  );

CREATE POLICY "lc_reply_reactions_insert" ON public.learning_circle_post_reply_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.learning_circle_post_replies r
      WHERE r.id = reply_id
        AND (
          public.is_learning_circle_member(r.circle_id, auth.uid())
          OR public.is_learning_circle_owner(r.circle_id, auth.uid())
        )
    )
  );

CREATE POLICY "lc_reply_reactions_delete" ON public.learning_circle_post_reply_reactions
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
  );

-- 5. FIX RLS POLICIES FOR SOFT DELETE (POSTS AND REPLIES UPDATE)
DROP POLICY IF EXISTS "lcp_update" ON public.learning_circle_posts;
CREATE POLICY "lcp_update" ON public.learning_circle_posts
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );

DROP POLICY IF EXISTS "lc_replies_update" ON public.learning_circle_post_replies;
CREATE POLICY "lc_replies_update" ON public.learning_circle_post_replies
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );

-- 6. REMOVE DELETED_AT IS NULL FROM SELECT POLICIES TO ENABLE SOFT-DELETE PLACEHOLDERS
DROP POLICY IF EXISTS "lcp_select" ON public.learning_circle_posts;
CREATE POLICY "lcp_select" ON public.learning_circle_posts
  FOR SELECT TO authenticated
  USING (
    public.can_access_learning_circle(circle_id, auth.uid())
  );

DROP POLICY IF EXISTS "lc_replies_select" ON public.learning_circle_post_replies;
CREATE POLICY "lc_replies_select" ON public.learning_circle_post_replies
  FOR SELECT TO authenticated
  USING (
    public.can_access_learning_circle(circle_id, auth.uid())
  );
