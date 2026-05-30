-- Phase 6.3B – Project Workspace – Resource Reactions Table and Helpful Sync Triggers
-- Create a table to track one-helpful-vote-per-user-per-resource

CREATE TABLE IF NOT EXISTS public.project_resource_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.project_resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'helpful',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique reaction per resource per user
  CONSTRAINT unique_resource_user_helpful_reaction UNIQUE (resource_id, user_id, reaction_type),
  CONSTRAINT chk_resource_reaction_type CHECK (reaction_type = 'helpful')
);

-- Enable RLS
ALTER TABLE public.project_resource_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "prr_select" ON public.project_resource_reactions;
DROP POLICY IF EXISTS "prr_insert" ON public.project_resource_reactions;
DROP POLICY IF EXISTS "prr_delete" ON public.project_resource_reactions;

-- Select policy: Only active project members or project owners can view resource reactions
CREATE POLICY "prr_select"
  ON public.project_resource_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_resources r
      WHERE r.id = resource_id
        AND public.can_access_project_workspace(r.project_id, auth.uid())
    )
  );

-- Insert policy: Only active project members or owners can add resource reactions
CREATE POLICY "prr_insert"
  ON public.project_resource_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.project_resources r
      WHERE r.id = resource_id
        AND public.can_access_project_workspace(r.project_id, auth.uid())
    )
  );

-- Delete policy: Users can delete their own reactions
CREATE POLICY "prr_delete"
  ON public.project_resource_reactions FOR DELETE
  TO authenticated
  USING ( user_id = auth.uid() );


-- Trigger function to automatically sync helpful_count in project_resources
CREATE OR REPLACE FUNCTION public.sync_project_resource_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.project_resources
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.resource_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.project_resources
    SET helpful_count = GREATEST(0, helpful_count - 1)
    WHERE id = OLD.resource_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Register an AFTER INSERT OR DELETE trigger on project_resource_reactions
DROP TRIGGER IF EXISTS on_project_resource_reaction_changed ON public.project_resource_reactions;
CREATE TRIGGER on_project_resource_reaction_changed
  AFTER INSERT OR DELETE ON public.project_resource_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_project_resource_helpful_count();

-- Backfill and align cached helpful_count with zero (since reactions table is newly deployed)
UPDATE public.project_resources SET helpful_count = 0;
