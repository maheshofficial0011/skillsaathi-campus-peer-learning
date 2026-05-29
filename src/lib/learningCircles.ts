import { supabase } from './supabase';
import type {
  LearningCircle,
  LearningCircleWithStats,
  LearningCircleMember,
  LearningCircleResource,
  LearningCirclePost,
  CircleRole,
  CircleDifficulty,
  CircleMeetingMode,
  CircleStatus,
  CircleResourceType,
  CirclePostType,
} from '../types';

// ──────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────

export const CIRCLE_CATEGORIES: string[] = [
  'Programming',
  'Web Development',
  'Data Science',
  'Machine Learning',
  'Cyber Security',
  'Cloud Computing',
  'Mobile Development',
  'Design & UI/UX',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Placement Prep',
  'Competitive Coding',
  'Research',
  'Other',
];

export const CIRCLE_DIFFICULTIES: CircleDifficulty[] = ['Beginner', 'Intermediate', 'Advanced', 'Mixed'];
export const CIRCLE_MEETING_MODES: CircleMeetingMode[] = ['Online', 'In-Person', 'Hybrid'];
export const CIRCLE_STATUSES: CircleStatus[] = ['active', 'paused', 'archived'];
export const CIRCLE_RESOURCE_TYPES: CircleResourceType[] = ['Link', 'PDF', 'Video', 'Notes', 'Book', 'Other'];
export const CIRCLE_POST_TYPES: CirclePostType[] = ['Update', 'Question', 'Plan', 'Announcement'];

// ──────────────────────────────────────────
// URL VALIDATION HELPER
// ──────────────────────────────────────────

/**
 * Validates that a URL is using https:// protocol.
 * Rejects http://, javascript:, data:, file:, and empty/unsafe strings.
 */
export const isValidHttpsUrl = (url: string): boolean => {
  try {
    const trimmed = url.trim();
    if (!trimmed) return false;
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Validates a meeting link / location_or_link field:
 * - Rejects any value containing unsafe protocols (javascript:, data:, file://)
 * - If it starts with http/https/www, must be strictly https://
 * - Plain offline text (e.g., "Room 203, Block B") is always allowed
 * - Mixed text+link like "Room 203 / https://meet.google.com/abc" is allowed
 */
export const isValidMeetingLinkOrLocation = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return true; // optional field

  // Always reject values containing dangerous embedded protocols
  if (/\b(javascript:|data:|file:\/\/)/i.test(trimmed)) return false;

  // If the whole value looks like a URL, validate it as https://
  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(trimmed);
  if (looksLikeUrl) return isValidHttpsUrl(trimmed);

  return true; // plain text location or mixed text (e.g. "Room 203 / https://...")
};

// ──────────────────────────────────────────
// CIRCLE QUERIES
// ──────────────────────────────────────────

const CIRCLE_SELECT_WITH_STATS = `
  *,
  creator_profile:profiles!learning_circles_created_by_fkey(full_name),
  members:learning_circle_members(count)
`;

/**
 * Fetch all public active circles with member counts and creator name.
 * Includes my_role for the signed-in user.
 */
export const getLearningCircles = async (userId?: string): Promise<LearningCircleWithStats[]> => {
  try {
    const { data, error } = await supabase
      .from('learning_circles')
      .select(CIRCLE_SELECT_WITH_STATS)
      .eq('status', 'active')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const circles = (data || []) as (LearningCircle & {
      creator_profile: { full_name: string } | null;
      members: { count: number }[];
    })[];

    let myMemberships: { circle_id: string; role: string }[] = [];
    if (userId) {
      const { data: memData } = await supabase
        .from('learning_circle_members')
        .select('circle_id, role')
        .eq('user_id', userId);
      myMemberships = memData || [];
    }

    return circles.map((c) => {
      const myMembership = myMemberships.find((m) => m.circle_id === c.id);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        department: c.department,
        difficulty_level: c.difficulty_level,
        meeting_mode: c.meeting_mode,
        meeting_schedule: c.meeting_schedule,
        location_or_link: c.location_or_link,
        max_members: c.max_members,
        is_public: c.is_public,
        created_by: c.created_by,
        status: c.status,
        created_at: c.created_at,
        updated_at: c.updated_at,
        creator_name: c.creator_profile?.full_name ?? 'Unknown',
        member_count: c.members?.[0]?.count ?? 0,
        my_role: (myMembership?.role as CircleRole) ?? null,
      } as LearningCircleWithStats;
    });
  } catch (err) {
    console.error('getLearningCircles error:', err);
    return [];
  }
};

/**
 * Fetch circles where the user is a member or owner.
 */
export const getMyLearningCircles = async (userId: string): Promise<LearningCircleWithStats[]> => {
  try {
    // Get all circle IDs the user is a member of
    const { data: memberships, error: memErr } = await supabase
      .from('learning_circle_members')
      .select('circle_id, role')
      .eq('user_id', userId);

    if (memErr) throw memErr;
    const myMems = memberships || [];
    if (myMems.length === 0) return [];

    const circleIds = myMems.map((m) => m.circle_id);

    const { data, error } = await supabase
      .from('learning_circles')
      .select(CIRCLE_SELECT_WITH_STATS)
      .in('id', circleIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const circles = (data || []) as (LearningCircle & {
      creator_profile: { full_name: string } | null;
      members: { count: number }[];
    })[];

    return circles.map((c) => {
      const myMembership = myMems.find((m) => m.circle_id === c.id);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        department: c.department,
        difficulty_level: c.difficulty_level,
        meeting_mode: c.meeting_mode,
        meeting_schedule: c.meeting_schedule,
        location_or_link: c.location_or_link,
        max_members: c.max_members,
        is_public: c.is_public,
        created_by: c.created_by,
        status: c.status,
        created_at: c.created_at,
        updated_at: c.updated_at,
        creator_name: c.creator_profile?.full_name ?? 'Unknown',
        member_count: c.members?.[0]?.count ?? 0,
        my_role: (myMembership?.role as CircleRole) ?? null,
      } as LearningCircleWithStats;
    });
  } catch (err) {
    console.error('getMyLearningCircles error:', err);
    return [];
  }
};

/**
 * Fetch a single circle by ID with stats.
 */
export const getLearningCircleById = async (
  circleId: string,
  userId?: string
): Promise<LearningCircleWithStats | null> => {
  try {
    const { data, error } = await supabase
      .from('learning_circles')
      .select(CIRCLE_SELECT_WITH_STATS)
      .eq('id', circleId)
      .single();

    if (error) throw error;

    const c = data as LearningCircle & {
      creator_profile: { full_name: string } | null;
      members: { count: number }[];
    };

    let myRole: CircleRole | null = null;
    if (userId) {
      const { data: memData } = await supabase
        .from('learning_circle_members')
        .select('role')
        .eq('circle_id', circleId)
        .eq('user_id', userId)
        .maybeSingle();
      myRole = (memData?.role as CircleRole) ?? null;
    }

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      department: c.department,
      difficulty_level: c.difficulty_level,
      meeting_mode: c.meeting_mode,
      meeting_schedule: c.meeting_schedule,
      location_or_link: c.location_or_link,
      max_members: c.max_members,
      is_public: c.is_public,
      created_by: c.created_by,
      status: c.status,
      created_at: c.created_at,
      updated_at: c.updated_at,
      creator_name: c.creator_profile?.full_name ?? 'Unknown',
      member_count: c.members?.[0]?.count ?? 0,
      my_role: myRole,
    } as LearningCircleWithStats;
  } catch (err) {
    console.error('getLearningCircleById error:', err);
    return null;
  }
};

// ──────────────────────────────────────────
// CIRCLE MUTATIONS
// ──────────────────────────────────────────

export interface CreateCircleInput {
  title: string;
  description: string;
  category: string;
  department?: string;
  difficulty_level: CircleDifficulty;
  meeting_mode: CircleMeetingMode;
  meeting_schedule?: string;
  location_or_link?: string;
  max_members: number;
  is_public: boolean;
  created_by?: string;
}

/**
 * Create a new learning circle and add the creator as owner.
 */
export const createLearningCircle = async (input: CreateCircleInput): Promise<LearningCircle> => {
  // Validate location_or_link if provided
  if (input.location_or_link && !isValidMeetingLinkOrLocation(input.location_or_link)) {
    throw new Error('Meeting location/link must use https:// if it is a URL.');
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user?.id) {
    console.error('[createLearningCircle] auth user fetch failed:', authError);
    throw new Error('Please sign in again before creating a circle.');
  }

  const authUserId = authData.user.id;

  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    department: input.department?.trim() || null,
    difficulty_level: input.difficulty_level,
    meeting_mode: input.meeting_mode,
    meeting_schedule: input.meeting_schedule?.trim() || null,
    location_or_link: input.location_or_link?.trim() || null,
    max_members: Number(input.max_members),
    is_public: input.is_public,
    created_by: authUserId,
    status: 'active' as const,
  };

  // Add debug logs
  console.log('[createLearningCircle] authUserId:', authUserId);
  console.log('[createLearningCircle] payload:', payload);

  const { data, error } = await supabase
    .from('learning_circles')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[createLearningCircle] circle insert failed:', error);
    // Wrap as a real Error so `instanceof Error` works in catch blocks
    throw new Error(error.message || 'Could not create circle');
  }

  const circle = data as LearningCircle;

  // Add creator as owner member
  const { error: memberError } = await supabase
    .from('learning_circle_members')
    .insert({
      circle_id: circle.id,
      user_id: authUserId,
      role: 'owner',
    });

  if (memberError) {
    console.error('[createLearningCircle] owner membership insert failed:', memberError);
    // Attempt cleanup: delete the orphaned circle
    const { error: cleanupError } = await supabase
      .from('learning_circles')
      .delete()
      .eq('id', circle.id)
      .eq('created_by', authUserId);
    if (cleanupError) {
      console.error('[createLearningCircle] cleanup of orphaned circle failed:', cleanupError);
    }
    throw new Error(memberError.message || 'Circle created but owner membership failed.');
  }

  return circle;
};

export interface UpdateCircleInput {
  title?: string;
  description?: string;
  category?: string;
  department?: string | null;
  difficulty_level?: CircleDifficulty;
  meeting_mode?: CircleMeetingMode;
  meeting_schedule?: string | null;
  location_or_link?: string | null;
  max_members?: number;
  is_public?: boolean;
  status?: CircleStatus;
}

/**
 * Update a learning circle (owner only, enforced via RLS).
 */
export const updateLearningCircle = async (
  circleId: string,
  input: UpdateCircleInput
): Promise<LearningCircle> => {
  try {
    if (input.location_or_link !== undefined && input.location_or_link !== null) {
      if (!isValidMeetingLinkOrLocation(input.location_or_link)) {
        throw new Error('Meeting location/link must use https:// if it is a URL.');
      }
    }

    const payload: Record<string, unknown> = {};
    if (input.title !== undefined) payload.title = input.title.trim();
    if (input.description !== undefined) payload.description = input.description.trim();
    if (input.category !== undefined) payload.category = input.category;
    if (input.department !== undefined) payload.department = input.department?.trim() || null;
    if (input.difficulty_level !== undefined) payload.difficulty_level = input.difficulty_level;
    if (input.meeting_mode !== undefined) payload.meeting_mode = input.meeting_mode;
    if (input.meeting_schedule !== undefined) payload.meeting_schedule = input.meeting_schedule?.trim() || null;
    if (input.location_or_link !== undefined) payload.location_or_link = input.location_or_link?.trim() || null;
    if (input.max_members !== undefined) payload.max_members = input.max_members;
    if (input.is_public !== undefined) payload.is_public = input.is_public;
    if (input.status !== undefined) payload.status = input.status;

    const { data, error } = await supabase
      .from('learning_circles')
      .update(payload)
      .eq('id', circleId)
      .select()
      .single();

    if (error) throw error;
    return data as LearningCircle;
  } catch (err) {
    console.error('updateLearningCircle error:', err);
    throw err;
  }
};

/**
 * Join a learning circle.
 * Validates: circle must be active, not full, user not already a member.
 */
export const joinLearningCircle = async (circleId: string, userId: string): Promise<void> => {
  try {
    // Fetch circle details
    const { data: circleData, error: circleErr } = await supabase
      .from('learning_circles')
      .select('status, max_members')
      .eq('id', circleId)
      .single();

    if (circleErr) throw circleErr;
    const circle = circleData as { status: string; max_members: number };

    if (circle.status !== 'active') {
      throw new Error('This circle is not accepting new members right now.');
    }

    // Check membership count
    const { count, error: countErr } = await supabase
      .from('learning_circle_members')
      .select('id', { count: 'exact', head: true })
      .eq('circle_id', circleId);

    if (countErr) throw countErr;
    if ((count ?? 0) >= circle.max_members) {
      throw new Error('This circle is full. No more members can join.');
    }

    // Check already joined
    const { data: existing, error: existErr } = await supabase
      .from('learning_circle_members')
      .select('id')
      .eq('circle_id', circleId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existErr) throw existErr;
    if (existing) {
      throw new Error('You are already a member of this circle.');
    }

    const { error: insertErr } = await supabase
      .from('learning_circle_members')
      .insert({ circle_id: circleId, user_id: userId, role: 'member' });

    if (insertErr) throw insertErr;
  } catch (err) {
    console.error('joinLearningCircle error:', err);
    throw err;
  }
};

/**
 * Leave a learning circle.
 * Owner cannot leave; they must archive/delete instead.
 */
export const leaveLearningCircle = async (circleId: string, userId: string): Promise<void> => {
  try {
    // Fetch membership role
    const { data: membership, error: memErr } = await supabase
      .from('learning_circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memErr) throw memErr;

    if (!membership) {
      throw new Error('You are not a member of this circle.');
    }

    if (membership.role === 'owner') {
      throw new Error('As the owner, you cannot leave your own circle. You can archive or delete it instead.');
    }

    const { error } = await supabase
      .from('learning_circle_members')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (err) {
    console.error('leaveLearningCircle error:', err);
    throw err;
  }
};

// ──────────────────────────────────────────
// MEMBER QUERIES
// ──────────────────────────────────────────

/**
 * Fetch all members of a circle with their profiles.
 */
export const getCircleMembers = async (circleId: string): Promise<LearningCircleMember[]> => {
  try {
    const { data, error } = await supabase
      .from('learning_circle_members')
      .select(`
        id, circle_id, user_id, role, joined_at,
        profile:profiles!learning_circle_members_user_id_fkey(full_name, department, year_of_study)
      `)
      .eq('circle_id', circleId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as LearningCircleMember[];
  } catch (err) {
    console.error('getCircleMembers error:', err);
    return [];
  }
};

// ──────────────────────────────────────────
// RESOURCE QUERIES & MUTATIONS
// ──────────────────────────────────────────

/**
 * Fetch all study resources for a circle.
 */
export const getCircleResources = async (circleId: string): Promise<LearningCircleResource[]> => {
  try {
    const { data, error } = await supabase
      .from('learning_circle_resources')
      .select(`
        id, circle_id, shared_by, title, description, resource_type, url, created_at, updated_at,
        uploader_profile:profiles!learning_circle_resources_shared_by_fkey(full_name)
      `)
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as LearningCircleResource[];
  } catch (err) {
    console.error('getCircleResources error:', err);
    return [];
  }
};

export interface AddResourceInput {
  circle_id: string;
  shared_by: string;
  title: string;
  description?: string;
  resource_type: CircleResourceType;
  url?: string;
}

/**
 * Share a resource to a circle. URL must be https://.
 */
export const addCircleResource = async (input: AddResourceInput): Promise<LearningCircleResource> => {
  try {
    if (input.url) {
      if (!isValidHttpsUrl(input.url)) {
        throw new Error('Resource URL must use https:// protocol. Unsafe or plain http:// links are not allowed.');
      }
    }

    const { data, error } = await supabase
      .from('learning_circle_resources')
      .insert({
        circle_id: input.circle_id,
        shared_by: input.shared_by,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        resource_type: input.resource_type,
        url: input.url?.trim() || null,
      })
      .select(`
        id, circle_id, shared_by, title, description, resource_type, url, created_at, updated_at,
        uploader_profile:profiles!learning_circle_resources_shared_by_fkey(full_name)
      `)
      .single();

    if (error) throw error;
    return data as unknown as LearningCircleResource;
  } catch (err) {
    console.error('addCircleResource error:', err);
    throw err;
  }
};

/**
 * Delete a resource. Uploader or circle owner only (RLS enforced).
 */
export const deleteCircleResource = async (resourceId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('learning_circle_resources')
      .delete()
      .eq('id', resourceId);

    if (error) throw error;
  } catch (err) {
    console.error('deleteCircleResource error:', err);
    throw err;
  }
};

// ──────────────────────────────────────────
// POST QUERIES & MUTATIONS
// ──────────────────────────────────────────

/**
 * Fetch all discussion posts for a circle.
 */
export const getCirclePosts = async (circleId: string): Promise<LearningCirclePost[]> => {
  try {
    const { data, error } = await supabase
      .from('learning_circle_posts')
      .select(`
        id, circle_id, created_by, content, post_type, created_at, updated_at,
        author_profile:profiles!learning_circle_posts_created_by_fkey(full_name)
      `)
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as LearningCirclePost[];
  } catch (err) {
    console.error('getCirclePosts error:', err);
    return [];
  }
};

export interface AddPostInput {
  circle_id: string;
  created_by: string;
  content: string;
  post_type: CirclePostType;
}

/**
 * Add a discussion post to a circle (member only, RLS enforced).
 */
export const addCirclePost = async (input: AddPostInput): Promise<LearningCirclePost> => {
  try {
    const { data, error } = await supabase
      .from('learning_circle_posts')
      .insert({
        circle_id: input.circle_id,
        created_by: input.created_by,
        content: input.content.trim(),
        post_type: input.post_type,
      })
      .select(`
        id, circle_id, created_by, content, post_type, created_at, updated_at,
        author_profile:profiles!learning_circle_posts_created_by_fkey(full_name)
      `)
      .single();

    if (error) throw error;
    return data as unknown as LearningCirclePost;
  } catch (err) {
    console.error('addCirclePost error:', err);
    throw err;
  }
};

/**
 * Delete a discussion post. Author or circle owner only (RLS enforced).
 */
export const deleteCirclePost = async (postId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('learning_circle_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  } catch (err) {
    console.error('deleteCirclePost error:', err);
    throw err;
  }
};
