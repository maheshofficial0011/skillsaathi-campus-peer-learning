-- ====================================================================
-- PHASE 5.4: LEARNING CIRCLE EXIT WORKFLOW & RESOURCE VERIFICATION SYSTEM
-- ====================================================================

-- 1. Extend public.learning_circle_join_requests with leave tracking columns
ALTER TABLE public.learning_circle_join_requests
  ADD COLUMN IF NOT EXISTS leave_reason TEXT,
  ADD COLUMN IF NOT EXISTS leave_message TEXT,
  ADD COLUMN IF NOT EXISTS left_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Extend public.learning_circle_resources with verification & recommendation tracking columns
ALTER TABLE public.learning_circle_resources
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS owner_recommended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_recommended_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_recommended_at TIMESTAMPTZ;

-- 3. Configure CHECK constraint safely
ALTER TABLE public.learning_circle_resources
  DROP CONSTRAINT IF EXISTS chk_verification_status;

ALTER TABLE public.learning_circle_resources
  ADD CONSTRAINT chk_verification_status 
  CHECK (verification_status IN ('pending_verification', 'verified', 'rejected'));

-- 4. Backfill existing resources to 'verified' to prevent any disruptions
UPDATE public.learning_circle_resources
  SET verification_status = 'verified'
  WHERE verification_status IS NULL OR verification_status = '';
