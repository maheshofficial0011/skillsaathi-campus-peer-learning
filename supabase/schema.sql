-- Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  year_of_study TEXT NOT NULL DEFAULT '',
  section TEXT,
  skills_known TEXT[] NOT NULL DEFAULT '{}',
  skills_wanted TEXT[] NOT NULL DEFAULT '{}',
  availability TEXT,
  help_mode TEXT,
  trust_score INTEGER NOT NULL DEFAULT 0,
  badge_level TEXT NOT NULL DEFAULT 'Newcomer',
  is_senior_mentor BOOLEAN NOT NULL DEFAULT false,
  mentor_topics TEXT[] NOT NULL DEFAULT '{}',
  mentor_bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create Profile RLS Policies
CREATE POLICY "Allow public read access to all profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Allow users to insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to profiles
CREATE OR REPLACE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create automatic profile creation trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, department, year_of_study, section)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    COALESCE(NEW.raw_user_meta_data->>'year_of_study', ''),
    NEW.raw_user_meta_data->>'section'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute when a new user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- PHASE 2: CORE PEER HELP MVP SCHEMA
-- ==========================================

-- Create help_requests table
CREATE TABLE IF NOT EXISTS public.help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'General',
  urgency TEXT NOT NULL DEFAULT 'Medium',
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  solved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints on urgency and status values
  CONSTRAINT chk_status CHECK (status IN ('open', 'accepted', 'solved', 'closed')),
  CONSTRAINT chk_urgency CHECK (urgency IN ('Low', 'Medium', 'High', 'Urgent'))
);

-- Enable RLS on help_requests
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for help_requests
CREATE POLICY "Allow authenticated read help requests"
  ON public.help_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert help requests"
  ON public.help_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow request creators to update their own requests"
  ON public.help_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow accepted helpers to update their accepted requests"
  ON public.help_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = accepted_by)
  WITH CHECK (auth.uid() = accepted_by);

-- Custom policy for accepting help requests
CREATE POLICY "Allow authenticated users to accept open requests"
  ON public.help_requests
  FOR UPDATE
  TO authenticated
  USING (status = 'open' AND created_by != auth.uid() AND accepted_by IS NULL)
  WITH CHECK (status = 'accepted' AND accepted_by = auth.uid());

-- Apply updated_at trigger to help_requests
CREATE OR REPLACE TRIGGER on_help_request_updated
  BEFORE UPDATE ON public.help_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.help_requests(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  helpful BOOLEAN NOT NULL DEFAULT true,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate feedback on same request
  CONSTRAINT unique_feedback_request UNIQUE (request_id)
);

-- Enable RLS on feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for feedback
CREATE POLICY "Allow authenticated read feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow request creator to submit feedback"
  ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.help_requests r
      WHERE r.id = request_id
        AND r.created_by = auth.uid()
        AND r.status = 'solved'
        AND r.accepted_by = receiver_id
    )
  );

-- Trigger to recalculate trust score of profiles automatically after feedback
CREATE OR REPLACE FUNCTION public.update_receiver_trust_score()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  new_score INTEGER;
BEGIN
  -- Compute average rating
  SELECT AVG(rating) INTO avg_rating
  FROM public.feedback
  WHERE receiver_id = NEW.receiver_id;

  -- Convert to percentage scale (avg_rating / 5 * 100)
  IF avg_rating IS NOT NULL THEN
    new_score := ROUND((avg_rating / 5.0) * 100);
    
    UPDATE public.profiles
    SET trust_score = new_score
    WHERE id = NEW.receiver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply after feedback changes trigger (fires on both insert and update)
CREATE TRIGGER on_feedback_changed
  AFTER INSERT OR UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_receiver_trust_score();

-- Allow feedback creators to update their feedback
CREATE POLICY "Allow feedback creators to update their feedback"
  ON public.feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);


-- ==========================================
-- PHASE 3: DOUBTS MODULE SCHEMA
-- NOTE: The Phase 3 tables are applied separately via:
--       supabase/phase3-doubts-patch.sql
-- Run that patch in the Supabase SQL Editor to add:
--   - public.doubt_posts
--   - public.doubt_answers
--   - RLS policies for both tables
--   - updated_at triggers for both tables
-- ==========================================

