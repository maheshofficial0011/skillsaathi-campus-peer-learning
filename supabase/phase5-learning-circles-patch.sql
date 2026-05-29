-- ====================================================================
-- PHASE 5: LEARNING CIRCLES PATCH
-- ====================================================================

-- 1. Create learning_circles table
CREATE TABLE IF NOT EXISTS public.learning_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  department TEXT,
  difficulty_level TEXT NOT NULL DEFAULT 'Beginner',
  meeting_mode TEXT NOT NULL DEFAULT 'Hybrid',
  meeting_schedule TEXT,
  location_or_link TEXT,
  max_members INTEGER NOT NULL DEFAULT 20,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_difficulty CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced', 'Mixed')),
  CONSTRAINT chk_meeting_mode CHECK (meeting_mode IN ('Online', 'In-Person', 'Hybrid')),
  CONSTRAINT chk_status CHECK (status IN ('active', 'paused', 'archived')),
  CONSTRAINT chk_max_members CHECK (max_members BETWEEN 2 AND 100)
);

-- Enable RLS on learning_circles
ALTER TABLE public.learning_circles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist before creating
DROP POLICY IF EXISTS "Allow members and creators to read learning circles" ON public.learning_circles;
DROP POLICY IF EXISTS "Allow authenticated users to create learning circles" ON public.learning_circles;
DROP POLICY IF EXISTS "Allow circle owners/creators to update their own circles" ON public.learning_circles;
DROP POLICY IF EXISTS "Allow circle owners/creators to delete their own circles" ON public.learning_circles;

-- Create policies for learning_circles
CREATE POLICY "Allow members and creators to read learning circles"
  ON public.learning_circles FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.learning_circle_members
      WHERE circle_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Allow authenticated users to create learning circles"
  ON public.learning_circles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow circle owners/creators to update their own circles"
  ON public.learning_circles FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow circle owners/creators to delete their own circles"
  ON public.learning_circles FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);


-- 2. Create learning_circle_members table
CREATE TABLE IF NOT EXISTS public.learning_circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.learning_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_circle_member UNIQUE (circle_id, user_id),
  CONSTRAINT chk_member_role CHECK (role IN ('owner', 'member'))
);

-- Enable RLS on learning_circle_members
ALTER TABLE public.learning_circle_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating
DROP POLICY IF EXISTS "Allow circle access members to read membership" ON public.learning_circle_members;
DROP POLICY IF EXISTS "Allow authenticated users to join circles as members" ON public.learning_circle_members;
DROP POLICY IF EXISTS "Allow circle owners to update memberships" ON public.learning_circle_members;
DROP POLICY IF EXISTS "Allow members to leave and circle owners to remove members" ON public.learning_circle_members;

-- Create policies for learning_circle_members
CREATE POLICY "Allow circle access members to read membership"
  ON public.learning_circle_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_circles c
      WHERE c.id = circle_id AND (
        c.is_public = true OR
        c.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.learning_circle_members m
          WHERE m.circle_id = c.id AND m.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Allow authenticated users to join circles as members"
  ON public.learning_circle_members FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id AND role = 'member') OR
    (role = 'owner' AND EXISTS (
      SELECT 1 FROM public.learning_circles c
      WHERE c.id = circle_id AND c.created_by = auth.uid()
    ))
  );

CREATE POLICY "Allow circle owners to update memberships"
  ON public.learning_circle_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_circles c
      WHERE c.id = circle_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Allow members to leave and circle owners to remove members"
  ON public.learning_circle_members FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid() AND role = 'member') OR
    EXISTS (
      SELECT 1 FROM public.learning_circles c
      WHERE c.id = circle_id AND c.created_by = auth.uid()
    )
  );


-- 3. Create learning_circle_resources table
CREATE TABLE IF NOT EXISTS public.learning_circle_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.learning_circles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL DEFAULT 'Link',
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_resource_type CHECK (resource_type IN ('Link', 'PDF', 'Video', 'Notes', 'Book', 'Other'))
);

-- Enable RLS on learning_circle_resources
ALTER TABLE public.learning_circle_resources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating
DROP POLICY IF EXISTS "Allow circle members to read resources" ON public.learning_circle_resources;
DROP POLICY IF EXISTS "Allow circle members to add resources" ON public.learning_circle_resources;
DROP POLICY IF EXISTS "Allow resource creators to update resources" ON public.learning_circle_resources;
DROP POLICY IF EXISTS "Allow resource creators or circle owners to delete resources" ON public.learning_circle_resources;

-- Create policies for learning_circle_resources
CREATE POLICY "Allow circle members to read resources"
  ON public.learning_circle_resources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_circle_members m
      WHERE m.circle_id = circle_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow circle members to add resources"
  ON public.learning_circle_resources FOR INSERT
  TO authenticated
  WITH CHECK (
    shared_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.learning_circle_members m
      WHERE m.circle_id = circle_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow resource creators to update resources"
  ON public.learning_circle_resources FOR UPDATE
  TO authenticated
  USING (shared_by = auth.uid())
  WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Allow resource creators or circle owners to delete resources"
  ON public.learning_circle_resources FOR DELETE
  TO authenticated
  USING (
    shared_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.learning_circles c
      WHERE c.id = circle_id AND c.created_by = auth.uid()
    )
  );


-- 4. Create learning_circle_posts table
CREATE TABLE IF NOT EXISTS public.learning_circle_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.learning_circles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'Update',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_post_type CHECK (post_type IN ('Update', 'Question', 'Plan', 'Announcement'))
);

-- Enable RLS on learning_circle_posts
ALTER TABLE public.learning_circle_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating
DROP POLICY IF EXISTS "Allow circle members to read posts" ON public.learning_circle_posts;
DROP POLICY IF EXISTS "Allow circle members to add posts" ON public.learning_circle_posts;
DROP POLICY IF EXISTS "Allow post authors to update posts" ON public.learning_circle_posts;
DROP POLICY IF EXISTS "Allow post authors or circle owners to delete posts" ON public.learning_circle_posts;

-- Create policies for learning_circle_posts
CREATE POLICY "Allow circle members to read posts"
  ON public.learning_circle_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_circle_members m
      WHERE m.circle_id = circle_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow circle members to add posts"
  ON public.learning_circle_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.learning_circle_members m
      WHERE m.circle_id = circle_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow post authors to update posts"
  ON public.learning_circle_posts FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Allow post authors or circle owners to delete posts"
  ON public.learning_circle_posts FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.learning_circles c
      WHERE c.id = circle_id AND c.created_by = auth.uid()
    )
  );


-- 5. handle_updated_at Triggers
DROP TRIGGER IF EXISTS on_learning_circle_updated ON public.learning_circles;
CREATE TRIGGER on_learning_circle_updated
  BEFORE UPDATE ON public.learning_circles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_learning_circle_resource_updated ON public.learning_circle_resources;
CREATE TRIGGER on_learning_circle_resource_updated
  BEFORE UPDATE ON public.learning_circle_resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_learning_circle_post_updated ON public.learning_circle_posts;
CREATE TRIGGER on_learning_circle_post_updated
  BEFORE UPDATE ON public.learning_circle_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
