import { supabase } from './supabase';
import type {
  SeniorMentorProfile,
  SeniorGuidanceRequestWithProfiles,
  SeniorGuidanceStatus,
  GuidanceMode,
  SeniorGuidanceFeedback,
  SeniorGuidanceFeedbackWithProfiles,
} from '../types';

// ──────────────────────────────────────────
// MENTOR TOPICS CONSTANT
// ──────────────────────────────────────────
export const MENTOR_TOPICS: string[] = [
  'Placement Preparation',
  'Resume Review',
  'Interview Guidance',
  'Internship Guidance',
  'Project Guidance',
  'Hackathon Guidance',
  'Higher Studies',
  'Exam Preparation',
  'Department Guidance',
  'College Life',
  'Communication Skills',
  'Career Roadmap',
  'Other',
];

export const GUIDANCE_MODES: GuidanceMode[] = ['Online', 'In-Person', 'Hybrid'];

// ──────────────────────────────────────────
// MENTOR PROFILE QUERIES
// ──────────────────────────────────────────

/**
 * Fetch all senior mentor profiles (is_senior_mentor = true).
 */
export const getSeniorMentors = async (): Promise<SeniorMentorProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, department, year_of_study, section, mentor_topics, mentor_bio, availability, help_mode, trust_score, badge_level, skills_known, mentor_status')
      .eq('is_senior_mentor', true)
      .order('trust_score', { ascending: false });

    if (error) throw error;
    return (data || []) as SeniorMentorProfile[];
  } catch (err) {
    console.error('getSeniorMentors error:', err);
    return [];
  }
};

/**
 * Fetch a single senior mentor profile by userId.
 */
export const getSeniorMentorById = async (userId: string): Promise<SeniorMentorProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, department, year_of_study, section, mentor_topics, mentor_bio, availability, help_mode, trust_score, badge_level, skills_known, mentor_status')
      .eq('id', userId)
      .eq('is_senior_mentor', true)
      .single();

    if (error) throw error;
    return data as SeniorMentorProfile;
  } catch (err) {
    console.error('getSeniorMentorById error:', err);
    return null;
  }
};

/**
 * Update own senior mentor profile fields.
 * Only updates mentor-related fields; does NOT touch trust_score, badge_level, etc.
 */
export const updateSeniorMentorProfile = async (
  userId: string,
  input: {
    is_senior_mentor: boolean;
    mentor_topics: string[];
    mentor_bio: string;
    availability: string;
    help_mode: string;
    mentor_status?: 'accepting' | 'busy' | 'unavailable';
  }
): Promise<void> => {
  try {
    const payload: Record<string, unknown> = {
      is_senior_mentor: input.is_senior_mentor,
      mentor_topics: input.mentor_topics,
      mentor_bio: input.mentor_bio.trim() || null,
      availability: input.availability.trim() || null,
      help_mode: input.help_mode || 'Hybrid',
    };
    if (input.mentor_status !== undefined) {
      payload.mentor_status = input.mentor_status;
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) throw error;
  } catch (err) {
    console.error('updateSeniorMentorProfile error:', err);
    throw err;
  }
};

// ──────────────────────────────────────────
// GUIDANCE REQUEST QUERIES
// ──────────────────────────────────────────

const GUIDANCE_SELECT = `
  *,
  requester_profile:profiles!senior_guidance_requests_requester_id_fkey(
    full_name, department, year_of_study, section
  ),
  senior_profile:profiles!senior_guidance_requests_senior_id_fkey(
    full_name, department, year_of_study, is_senior_mentor,
    mentor_topics, mentor_bio, availability, help_mode, trust_score, badge_level, mentor_status
  )
`;

/**
 * Create a new guidance request.
 */
export const createGuidanceRequest = async (input: {
  requester_id: string;
  senior_id: string;
  topic: string;
  message: string;
  preferred_mode: GuidanceMode;
  preferred_time?: string;
}): Promise<SeniorGuidanceRequestWithProfiles> => {
  try {
    // 1. Check for existing active requests with same senior
    const { data: existingActive, error: checkError } = await supabase
      .from('senior_guidance_requests')
      .select('id')
      .eq('requester_id', input.requester_id)
      .eq('senior_id', input.senior_id)
      .in('status', ['pending', 'accepted'])
      .limit(1);

    if (checkError) throw checkError;
    if (existingActive && existingActive.length > 0) {
      throw new Error('You already have an active guidance request with this senior.');
    }

    // 2. Perform insert
    const { data, error } = await supabase
      .from('senior_guidance_requests')
      .insert({
        requester_id: input.requester_id,
        senior_id: input.senior_id,
        topic: input.topic.trim(),
        message: input.message.trim(),
        preferred_mode: input.preferred_mode,
        preferred_time: input.preferred_time?.trim() || null,
        status: 'pending',
      })
      .select(GUIDANCE_SELECT)
      .single();

    if (error) throw error;
    return data as SeniorGuidanceRequestWithProfiles;
  } catch (err) {
    console.error('createGuidanceRequest error:', err);
    throw err;
  }
};

/**
 * Fetch all guidance requests sent by the user (requester_id = userId).
 */
export const getMyGuidanceRequests = async (
  userId: string
): Promise<SeniorGuidanceRequestWithProfiles[]> => {
  try {
    const { data, error } = await supabase
      .from('senior_guidance_requests')
      .select(GUIDANCE_SELECT)
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SeniorGuidanceRequestWithProfiles[];
  } catch (err) {
    console.error('getMyGuidanceRequests error:', err);
    return [];
  }
};

/**
 * Fetch all incoming guidance requests for a senior (senior_id = userId).
 */
export const getSeniorIncomingRequests = async (
  userId: string
): Promise<SeniorGuidanceRequestWithProfiles[]> => {
  try {
    const { data, error } = await supabase
      .from('senior_guidance_requests')
      .select(GUIDANCE_SELECT)
      .eq('senior_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SeniorGuidanceRequestWithProfiles[];
  } catch (err) {
    console.error('getSeniorIncomingRequests error:', err);
    return [];
  }
};

/**
 * Update the status of a guidance request.
 * Used by both requester (cancel) and senior (accept/decline/complete).
 */
export const updateGuidanceRequestStatus = async (
  requestId: string,
  status: SeniorGuidanceStatus,
  responseMessage?: string,
  coordination?: {
    meeting_mode?: GuidanceMode | null;
    meeting_details?: string | null;
    scheduled_time?: string | null;
    meeting_link?: string | null;
    meeting_password?: string | null;
    meeting_location?: string | null;
    meeting_platform?: string | null;
  }
): Promise<SeniorGuidanceRequestWithProfiles> => {
  try {
    const payload: Record<string, unknown> = { status };
    if (responseMessage !== undefined) {
      payload.response_message = responseMessage.trim() || null;
    }
    if (status === 'completed') {
      payload.completed_at = new Date().toISOString();
    }
    if (coordination) {
      if (coordination.meeting_mode !== undefined) {
        payload.meeting_mode = coordination.meeting_mode;
      }
      if (coordination.meeting_details !== undefined) {
        payload.meeting_details = coordination.meeting_details?.trim() || null;
      }
      if (coordination.scheduled_time !== undefined) {
        payload.scheduled_time = coordination.scheduled_time?.trim() || null;
      }
      if (coordination.meeting_link !== undefined) {
        payload.meeting_link = coordination.meeting_link?.trim() || null;
      }
      if (coordination.meeting_password !== undefined) {
        payload.meeting_password = coordination.meeting_password?.trim() || null;
      }
      if (coordination.meeting_location !== undefined) {
        payload.meeting_location = coordination.meeting_location?.trim() || null;
      }
      if (coordination.meeting_platform !== undefined) {
        payload.meeting_platform = coordination.meeting_platform?.trim() || null;
      }
    }

    const { data, error } = await supabase
      .from('senior_guidance_requests')
      .update(payload)
      .eq('id', requestId)
      .select(GUIDANCE_SELECT)
      .single();

    if (error) throw error;
    return data as SeniorGuidanceRequestWithProfiles;
  } catch (err) {
    console.error('updateGuidanceRequestStatus error:', err);
    throw err;
  }
};

export interface SecureContactInfo {
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  contact_other: string | null;
}

/**
 * Invokes the secure database function to fetch allowed contact details.
 * Will return null/empty fields if sharing is disabled by the target user.
 */
export const getSharedContactDetails = async (
  targetUserId: string,
  requestId: string
): Promise<SecureContactInfo | null> => {
  try {
    const { data, error } = await supabase.rpc('get_shared_contact', {
      target_user_id: targetUserId,
      request_id: requestId,
    });
    if (error) throw error;
    if (data && data.length > 0) {
      return data[0] as SecureContactInfo;
    }
    return null;
  } catch (err) {
    console.error('getSharedContactDetails RPC error:', err);
    return null;
  }
};

/**
 * Invokes the secure database function to fetch allowed help request contact details.
 */
export const getSharedHelpContactDetails = async (
  targetUserId: string,
  requestId: string
): Promise<SecureContactInfo | null> => {
  try {
    const { data, error } = await supabase.rpc('get_shared_help_contact', {
      target_user_id: targetUserId,
      request_id: requestId,
    });
    if (error) throw error;
    if (data && data.length > 0) {
      return data[0] as SecureContactInfo;
    }
    return null;
  } catch (err) {
    console.error('getSharedHelpContactDetails RPC error:', err);
    return null;
  }
};

/**
 * Fetch a single guidance request by its ID.
 */
export const getGuidanceRequestById = async (
  requestId: string
): Promise<SeniorGuidanceRequestWithProfiles | null> => {
  try {
    const { data, error } = await supabase
      .from('senior_guidance_requests')
      .select(GUIDANCE_SELECT)
      .eq('id', requestId)
      .single();

    if (error) throw error;
    return data as SeniorGuidanceRequestWithProfiles;
  } catch (err) {
    console.error('getGuidanceRequestById error:', err);
    return null;
  }
};

export interface SeniorMentorStats {
  receivedCount: number;
  pendingCount: number;
  acceptedCount: number;
  completedCount: number;
  declinedCount: number;
  cancelledCount: number;
  completionRate: number;
}

/**
 * Calculates guidance statistics for a senior mentor:
 * - receivedCount: total guidance requests received
 * - pendingCount / acceptedCount / completedCount / declinedCount / cancelledCount
 * - completionRate: completed / received %
 */
export const getSeniorMentorStats = async (userId: string): Promise<SeniorMentorStats> => {
  try {
    const { data, error } = await supabase
      .from('senior_guidance_requests')
      .select('status')
      .eq('senior_id', userId);

    if (error) throw error;

    const rows = data || [];
    const receivedCount = rows.length;
    const pendingCount = rows.filter((r) => r.status === 'pending').length;
    const acceptedCount = rows.filter((r) => r.status === 'accepted').length;
    const completedCount = rows.filter((r) => r.status === 'completed').length;
    const declinedCount = rows.filter((r) => r.status === 'declined').length;
    const cancelledCount = rows.filter((r) => r.status === 'cancelled').length;

    // completed / received (%)
    const completionRate = receivedCount > 0
      ? Math.round((completedCount / receivedCount) * 100)
      : 0;

    return {
      receivedCount,
      pendingCount,
      acceptedCount,
      completedCount,
      declinedCount,
      cancelledCount,
      completionRate,
    };
  } catch (err) {
    console.error('getSeniorMentorStats error:', err);
    return {
      receivedCount: 0,
      pendingCount: 0,
      acceptedCount: 0,
      completedCount: 0,
      declinedCount: 0,
      cancelledCount: 0,
      completionRate: 0,
    };
  }
};

/**
 * Fetch feedback review for a specific guidance request.
 */
export const getSeniorFeedbackForRequest = async (
  requestId: string
): Promise<SeniorGuidanceFeedback | null> => {
  try {
    const { data, error } = await supabase
      .from('senior_guidance_feedback')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle();

    if (error) throw error;
    return data as SeniorGuidanceFeedback | null;
  } catch (err) {
    console.error('getSeniorFeedbackForRequest error:', err);
    return null;
  }
};

/**
 * Fetch all feedback reviews received by a senior mentor.
 */
export const getSeniorFeedbackReceived = async (
  seniorId: string
): Promise<SeniorGuidanceFeedback[]> => {
  try {
    const { data, error } = await supabase
      .from('senior_guidance_feedback')
      .select('*')
      .eq('senior_id', seniorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SeniorGuidanceFeedback[];
  } catch (err) {
    console.error('getSeniorFeedbackReceived error:', err);
    return [];
  }
};

/**
 * Fetch all feedback reviews received by a senior mentor including reviewer profile details and request details.
 */
export const getSeniorFeedbackReceivedWithProfiles = async (
  seniorId: string
): Promise<SeniorGuidanceFeedbackWithProfiles[]> => {
  try {
    const { data, error } = await supabase
      .from('senior_guidance_feedback')
      .select(`
        *,
        requester_profile:profiles!senior_guidance_feedback_created_by_fkey(
          full_name, department, year_of_study
        ),
        guidance_request:senior_guidance_requests!senior_guidance_feedback_request_id_fkey(
          topic
        )
      `)
      .eq('senior_id', seniorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SeniorGuidanceFeedbackWithProfiles[];
  } catch (err) {
    console.error('getSeniorFeedbackReceivedWithProfiles error:', err);
    return [];
  }
};

/**
 * Inserts or updates guidance feedback for a completed session.
 */
export const upsertSeniorGuidanceFeedbackForRequest = async (input: {
  request_id: string;
  senior_id: string;
  created_by: string;
  rating: number;
  helpful: boolean;
  comment: string | null;
}): Promise<void> => {
  try {
    if (input.created_by === input.senior_id) {
      throw new Error('Seniors cannot submit feedback on their own guidance session.');
    }

    const { error } = await supabase
      .from('senior_guidance_feedback')
      .upsert({
        request_id: input.request_id,
        senior_id: input.senior_id,
        created_by: input.created_by,
        rating: input.rating,
        helpful: input.helpful,
        comment: input.comment?.trim() || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'request_id,created_by'
      });

    if (error) throw error;
  } catch (err) {
    console.error('upsertSeniorGuidanceFeedbackForRequest error:', err);
    throw err;
  }
};
