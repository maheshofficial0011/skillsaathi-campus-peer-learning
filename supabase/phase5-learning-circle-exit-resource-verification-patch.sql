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

-- ====================================================================
-- PHASE 5.4A: MANUAL DIAGNOSTIC & REMEDIATION NOTE
-- ====================================================================
-- Use the following queries to diagnose and clean up old accepted join requests
-- that were created before Phase 5.4 lifecycle tracking was introduced.
-- These queries should be run manually after confirming that the user 
-- intentionally left the circle. Do NOT run broad automatic updates.

-- Diagnostic Query:
-- select r.*
-- from public.learning_circle_join_requests r
-- where r.status = 'accepted'
--   and r.member_left_at is null
--   and not exists (
--     select 1
--     from public.learning_circle_members m
--     where m.circle_id = r.circle_id
--       and m.user_id = r.requester_id
--   );

-- Manual Cleanup Query:
-- update public.learning_circle_join_requests
-- set member_left_at = now(),
--     leave_reason = 'Leaving by choice',
--     leave_message = 'Marked as intentionally left after lifecycle tracking was added.',
--     left_by = requester_id,
--     removed_by = null,
--     updated_at = now()
-- where id = '<confirmed_request_id>';

