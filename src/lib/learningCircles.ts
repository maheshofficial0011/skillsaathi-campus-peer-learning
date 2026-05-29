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
  LearningCircleRoleInterest,
  LearningCircleJoinRequest,
  LearningCircleJoinRequestWithProfile,
} from '../types';

// ──────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────

export const CIRCLE_CATEGORIES: string[] = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Programming',
  'Java',
  'DSA',
  'Web Development',
  'AI/ML',
  'Cybersecurity',
  'Communication Skills',
  'Placement Prep',
  'Exam Revision',
  'Project Group',
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
      let myRole: CircleRole | null = (myMembership?.role as CircleRole) ?? null;
      if (!myRole && userId && c.created_by === userId) {
        myRole = 'owner';
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
      let myRole: CircleRole | null = (myMembership?.role as CircleRole) ?? null;
      if (!myRole && userId && c.created_by === userId) {
        myRole = 'owner';
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
      if (!myRole && c.created_by === userId) {
        myRole = 'owner';
      }
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
  const circleId = crypto.randomUUID();

  const payload = {
    id: circleId,
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

  const { error } = await supabase
    .from('learning_circles')
    .insert(payload);

  if (error) {
    console.error('[createLearningCircle] circle insert failed:', error);
    // Wrap as a real Error so `instanceof Error` works in catch blocks
    throw new Error(error.message || 'Could not create circle');
  }

  // Add creator as owner member
  const { error: memberError } = await supabase
    .from('learning_circle_members')
    .insert({
      circle_id: circleId,
      user_id: authUserId,
      role: 'owner',
    });

  if (memberError) {
    console.error('[createLearningCircle] owner membership insert failed:', memberError);
    // Attempt cleanup: delete the orphaned circle
    const { error: cleanupError } = await supabase
      .from('learning_circles')
      .delete()
      .eq('id', circleId)
      .eq('created_by', authUserId);
    if (cleanupError) {
      console.error('[createLearningCircle] cleanup of orphaned circle failed:', cleanupError);
    }
    throw new Error(memberError.message || 'Circle created but owner membership failed.');
  }

  const circle: LearningCircle = {
    id: circleId,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    department: payload.department,
    difficulty_level: payload.difficulty_level,
    meeting_mode: payload.meeting_mode,
    meeting_schedule: payload.meeting_schedule,
    location_or_link: payload.location_or_link,
    max_members: payload.max_members,
    is_public: payload.is_public,
    created_by: payload.created_by,
    status: payload.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

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
  meeting_link?: string | null;
  meeting_password?: string | null;
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

    if (input.meeting_link !== undefined && input.meeting_link !== null && input.meeting_link.trim() !== '') {
      if (!isValidHttpsUrl(input.meeting_link)) {
        throw new Error('Meeting link must strictly use the https:// protocol. http://, data:, javascript:, or file: links are not allowed.');
      }
    }

    if (input.max_members !== undefined) {
      if (input.max_members < 2 || input.max_members > 100) {
        throw new Error('Maximum members capacity must be between 2 and 100.');
      }
      // Check current member count
      const { count, error: countErr } = await supabase
        .from('learning_circle_members')
        .select('id', { count: 'exact', head: true })
        .eq('circle_id', circleId);

      if (countErr) throw countErr;
      if (count && input.max_members < count) {
        throw new Error(`Maximum members capacity cannot be set lower than the current member count (${count}).`);
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
    if (input.meeting_link !== undefined) payload.meeting_link = input.meeting_link?.trim() || null;
    if (input.meeting_password !== undefined) payload.meeting_password = input.meeting_password?.trim() || null;
    if (input.max_members !== undefined) payload.max_members = Number(input.max_members);
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

    // Track intentional departure in join requests table
    const { error: joinReqErr } = await supabase
      .from('learning_circle_join_requests')
      .update({ member_left_at: new Date().toISOString() })
      .eq('circle_id', circleId)
      .eq('requester_id', userId)
      .eq('status', 'accepted');

    if (joinReqErr) {
      console.warn('[leaveLearningCircle] join requests leave update failed:', joinReqErr);
    }
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
 * Fetch all study resources for a circle with like aggregates, sorted: pinned -> likes -> newest.
 */
export const getCircleResources = async (circleId: string): Promise<LearningCircleResource[]> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    const { data, error } = await supabase
      .from('learning_circle_resources')
      .select(`
        id, circle_id, shared_by, title, description, resource_type, url, file_path, file_name, file_mime_type, file_size_bytes, storage_bucket, is_pinned, pinned_by, pinned_at, created_at, updated_at,
        uploader_profile:profiles!learning_circle_resources_shared_by_fkey(full_name),
        likes:learning_circle_resource_likes(user_id)
      `)
      .eq('circle_id', circleId);

    if (error) throw error;

    const rawResources = data || [];

    const mapped = rawResources.map((r: any) => {
      const likesList = r.likes || [];
      return {
        ...r,
        likes_count: likesList.length,
        liked_by_me: userId ? likesList.some((l: any) => l.user_id === userId) : false,
      };
    }) as LearningCircleResource[];

    // Sort: pinned first (is_pinned === true), then likes_count desc, then created_at desc
    return mapped.sort((a, b) => {
      const pinA = a.is_pinned ? 1 : 0;
      const pinB = b.is_pinned ? 1 : 0;
      if (pinB !== pinA) return pinB - pinA;

      const likesA = a.likes_count ?? 0;
      const likesB = b.likes_count ?? 0;
      if (likesB !== likesA) return likesB - likesA;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
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
  file_path?: string;
  file_name?: string;
  file_mime_type?: string;
  file_size_bytes?: number;
  storage_bucket?: string;
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
        file_path: input.file_path || null,
        file_name: input.file_name || null,
        file_mime_type: input.file_mime_type || null,
        file_size_bytes: input.file_size_bytes || null,
        storage_bucket: input.storage_bucket || null,
      })
      .select(`
        id, circle_id, shared_by, title, description, resource_type, url, file_path, file_name, file_mime_type, file_size_bytes, storage_bucket, created_at, updated_at,
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
    // 1. Fetch metadata row to see if there is an associated file
    const { data: resource, error: fetchErr } = await supabase
      .from('learning_circle_resources')
      .select('file_path, storage_bucket')
      .eq('id', resourceId)
      .maybeSingle();

    if (fetchErr) {
      console.warn('[deleteCircleResource] metadata fetch failed:', fetchErr);
    }

    // 2. Delete row from database
    const { error: dbErr } = await supabase
      .from('learning_circle_resources')
      .delete()
      .eq('id', resourceId);

    if (dbErr) throw dbErr;

    // 3. If file exists in storage, delete it
    if (resource?.file_path && resource?.storage_bucket) {
      const { error: storageErr } = await supabase.storage
        .from(resource.storage_bucket)
        .remove([resource.file_path]);

      if (storageErr) {
        console.error('[deleteCircleResource] storage file remove failed:', storageErr);
      } else {
        console.log('[deleteCircleResource] storage file deleted successfully:', resource.file_path);
      }
    }
  } catch (err) {
    console.error('deleteCircleResource error:', err);
    throw err;
  }
};

export interface UploadResourceFileInput {
  circleId: string;
  file: File;
  resourceId: string;
}

export interface UploadResourceFileResult {
  file_path: string;
  file_name: string;
  file_mime_type: string;
  file_size_bytes: number;
  storage_bucket: string;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Upload a study resource file to Supabase Storage.
 */
export const uploadCircleResourceFile = async (
  input: UploadResourceFileInput
): Promise<UploadResourceFileResult> => {
  const { circleId, file, resourceId } = input;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.id) {
    throw new Error('Please sign in again before uploading files.');
  }

  // Validate type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Unsupported file type. Only PDFs, documents, images, and text files are allowed.');
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the 10 MB limit.');
  }

  // Sanitize filename
  const extIndex = file.name.lastIndexOf('.');
  const ext = extIndex !== -1 ? file.name.substring(extIndex) : '';
  const baseName = extIndex !== -1 ? file.name.substring(0, extIndex) : file.name;
  const cleanBase = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const safeFileName = `${cleanBase}${ext}`;

  // Storage path: learning-circles/{circleId}/{resourceId}/{safeFileName}
  const filePath = `learning-circles/${circleId}/${resourceId}/${safeFileName}`;

  const { error: uploadErr } = await supabase.storage
    .from('learning-circle-resources')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadErr) {
    console.error('[uploadCircleResourceFile] upload failed:', uploadErr);
    throw new Error(uploadErr.message || 'Could not upload file.');
  }

  return {
    file_path: filePath,
    file_name: file.name,
    file_mime_type: file.type,
    file_size_bytes: file.size,
    storage_bucket: 'learning-circle-resources'
  };
};

/**
 * Create a short-lived (5 minutes) signed URL for viewing/downloading a file resource.
 * Only works if user is authorized under Storage RLS policies.
 */
export const getSignedResourceUrl = async (
  bucket: string,
  path: string
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 300); // 300 seconds = 5 minutes

  if (error) {
    console.error('[getSignedResourceUrl] failed:', error);
    throw new Error(error.message || 'Could not generate preview link.');
  }

  return data.signedUrl;
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

// ──────────────────────────────────────────
// JOIN REQUESTS QUERIES & MUTATIONS
// ──────────────────────────────────────────

/**
 * Submit a request to join a learning circle.
 */
export const requestToJoinCircle = async (
  circleId: string,
  input: { message: string; role_interest: LearningCircleRoleInterest }
): Promise<void> => {
  if (!input.message || input.message.trim().length < 10) {
    throw new Error('Please provide a message explaining why you want to join (minimum 10 characters).');
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.id) {
    throw new Error('Please sign in to request to join this circle.');
  }
  const requesterId = authData.user.id;

  const { error } = await supabase
    .from('learning_circle_join_requests')
    .insert({
      circle_id: circleId,
      requester_id: requesterId,
      message: input.message.trim(),
      role_interest: input.role_interest,
      status: 'pending'
    });

  if (error) {
    console.error('[requestToJoinCircle] failed:', error);
    throw new Error(error.message || 'Failed to submit join request.');
  }
};

/**
 * Fetch all join requests submitted by the currently logged-in user.
 */
export const getMyJoinRequests = async (): Promise<LearningCircleJoinRequest[]> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.id) {
    return [];
  }
  const { data, error } = await supabase
    .from('learning_circle_join_requests')
    .select('*')
    .eq('requester_id', authData.user.id);

  if (error) {
    console.error('[getMyJoinRequests] failed:', error);
    return [];
  }
  return data as LearningCircleJoinRequest[];
};

/**
 * Fetch all join requests for a circle, joining requester public profile details.
 * Sorted newest-first. (Circle owners only).
 */
export const getCircleJoinRequests = async (
  circleId: string
): Promise<LearningCircleJoinRequestWithProfile[]> => {
  const { data, error } = await supabase
    .from('learning_circle_join_requests')
    .select(`
      *,
      requester_profile:profiles!learning_circle_join_requests_requester_id_fkey(
        id,
        full_name,
        department,
        year_of_study,
        section,
        skills_known,
        skills_wanted,
        trust_score,
        badge_level,
        headline,
        academic_interests,
        learning_goals,
        current_focus,
        qualification_summary,
        github_url,
        linkedin_url,
        portfolio_url
      )
    `)
    .eq('circle_id', circleId)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getCircleJoinRequests] failed:', error);
    return [];
  }

  // Filter: only show pending requests OR accepted requests where requester has not intentionally left or been removed
  const rawData = data || [];
  return rawData.filter(
    (r: any) => r.status === 'pending' || (r.status === 'accepted' && r.member_left_at === null)
  ) as unknown as LearningCircleJoinRequestWithProfile[];
};

/**
 * Respond to a join request (Accept/Reject member creation flow).
 */
export const respondToJoinRequest = async (
  requestId: string,
  action: 'accept' | 'reject',
  responseMessage?: string
): Promise<void> => {
  try {
    // Fetch the request and circle status
    const { data: requestData, error: fetchErr } = await supabase
      .from('learning_circle_join_requests')
      .select(`
        *,
        circle:learning_circles(status, max_members)
      `)
      .eq('id', requestId)
      .single();

    if (fetchErr || !requestData) {
      throw new Error('Join request not found.');
    }

    const request = requestData as any;
    const circle = request.circle;

    if (!circle) {
      throw new Error('Target learning circle not found.');
    }

    if (circle.status !== 'active') {
      throw new Error(`Cannot respond to request. The circle is currently ${circle.status}. Please activate the circle first.`);
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.id) {
      throw new Error('Please sign in.');
    }
    const reviewerId = authData.user.id;

    if (action === 'accept') {
      // Check if circle is already full
      const { count, error: countErr } = await supabase
        .from('learning_circle_members')
        .select('id', { count: 'exact', head: true })
        .eq('circle_id', request.circle_id);

      if (countErr) throw countErr;
      if ((count ?? 0) >= circle.max_members) {
        throw new Error('Circle is full. Increase max members or remove a member before accepting new requests.');
      }

      // Update request status to accepted (only if not already accepted)
      if (request.status !== 'accepted') {
        const { error: updateErr } = await supabase
          .from('learning_circle_join_requests')
          .update({
            status: 'accepted',
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
            response_message: responseMessage?.trim() || null
          })
          .eq('id', requestId);

        if (updateErr) throw updateErr;
      }

      // Check if already a member before inserting (handle duplicate gracefully)
      const { data: existingMember } = await supabase
        .from('learning_circle_members')
        .select('id')
        .eq('circle_id', request.circle_id)
        .eq('user_id', request.requester_id)
        .maybeSingle();

      if (!existingMember) {
        const { error: memberErr } = await supabase
          .from('learning_circle_members')
          .insert({
            circle_id: request.circle_id,
            user_id: request.requester_id,
            role: 'member'
          });

        if (memberErr) {
          console.error('[respondToJoinRequest] member insert error:', memberErr);
          throw new Error('Request accepted, but failed to create membership: ' + memberErr.message);
        }

        // Set membership timestamp fields upon successful insert
        const { error: updateJoinErr } = await supabase
          .from('learning_circle_join_requests')
          .update({
            membership_created_at: new Date().toISOString(),
            member_left_at: null
          })
          .eq('id', requestId);

        if (updateJoinErr) {
          console.warn('[respondToJoinRequest] failed to set membership timestamps:', updateJoinErr);
        }
      }
    } else {
      // action === 'reject'
      const { error: updateErr } = await supabase
        .from('learning_circle_join_requests')
        .update({
          status: 'rejected',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          response_message: responseMessage?.trim() || null
        })
        .eq('id', requestId);

      if (updateErr) throw updateErr;
    }
  } catch (err) {
    console.error('respondToJoinRequest error:', err);
    throw err;
  }
};

/**
 * Cancel a pending join request.
 */
export const cancelJoinRequest = async (requestId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('learning_circle_join_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId);

    if (error) throw error;
  } catch (err) {
    console.error('cancelJoinRequest error:', err);
    throw err;
  }
};

/**
 * Fetch active join request status for a specific user and circle.
 */
export const getJoinRequestStatusForCircle = async (
  circleId: string,
  userId: string
): Promise<LearningCircleJoinRequest | null> => {
  try {
    const { data, error } = await supabase
      .from('learning_circle_join_requests')
      .select('*')
      .eq('circle_id', circleId)
      .eq('requester_id', userId)
      .in('status', ['pending', 'accepted', 'rejected', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as LearningCircleJoinRequest | null;
  } catch (err) {
    console.error('getJoinRequestStatusForCircle error:', err);
    return null;
  }
};

/**
 * Remove a member from a learning circle (owner only, RLS enforced).
 */
export const removeCircleMember = async (circleId: string, userId: string): Promise<void> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.id) {
      throw new Error('Please sign in to perform this action.');
    }
    const currentUserId = authData.user.id;

    if (currentUserId === userId) {
      throw new Error('You cannot remove yourself from your own circle. If you want to delete the circle, please archive it.');
    }

    // Verify current user is the owner
    const { data: ownerMembership, error: ownerCheckErr } = await supabase
      .from('learning_circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (ownerCheckErr) throw ownerCheckErr;
    if (ownerMembership?.role !== 'owner') {
      throw new Error('Only the circle owner is authorized to remove members.');
    }

    // Delete membership row
    const { error } = await supabase
      .from('learning_circle_members')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', userId);

    if (error) throw error;

    // Update latest accepted request to mark the left timestamp
    const { error: joinReqErr } = await supabase
      .from('learning_circle_join_requests')
      .update({ member_left_at: new Date().toISOString() })
      .eq('circle_id', circleId)
      .eq('requester_id', userId)
      .eq('status', 'accepted');

    if (joinReqErr) {
      console.warn('[removeCircleMember] join request leave update failed:', joinReqErr);
    }
  } catch (err) {
    console.error('removeCircleMember error:', err);
    throw err;
  }
};

/**
 * Toggle the pinned status of a study resource (owner only).
 */
export const toggleResourcePin = async (resourceId: string): Promise<void> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.id) {
      throw new Error('Please sign in to pin resources.');
    }
    const currentUserId = authData.user.id;

    // Fetch the resource details
    const { data: resource, error: fetchErr } = await supabase
      .from('learning_circle_resources')
      .select('circle_id, is_pinned')
      .eq('id', resourceId)
      .single();

    if (fetchErr || !resource) {
      throw new Error('Resource not found.');
    }

    // Check if the current user is owner
    const { data: ownerMembership, error: ownerCheckErr } = await supabase
      .from('learning_circle_members')
      .select('role')
      .eq('circle_id', resource.circle_id)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (ownerCheckErr) throw ownerCheckErr;
    if (ownerMembership?.role !== 'owner') {
      throw new Error('Only the circle owner can pin or unpin resources.');
    }

    const nextPinned = !resource.is_pinned;

    const { error: updateErr } = await supabase
      .from('learning_circle_resources')
      .update({
        is_pinned: nextPinned,
        pinned_by: nextPinned ? currentUserId : null,
        pinned_at: nextPinned ? new Date().toISOString() : null
      })
      .eq('id', resourceId);

    if (updateErr) throw updateErr;
  } catch (err) {
    console.error('toggleResourcePin error:', err);
    throw err;
  }
};

/**
 * Toggle resource like for the signed-in member/owner.
 */
export const toggleResourceLike = async (resourceId: string): Promise<void> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.id) {
      throw new Error('Please sign in to like resources.');
    }
    const userId = authData.user.id;

    // Fetch resource to get its circle_id
    const { data: resource, error: fetchErr } = await supabase
      .from('learning_circle_resources')
      .select('circle_id')
      .eq('id', resourceId)
      .single();

    if (fetchErr || !resource) {
      throw new Error('Resource not found.');
    }

    // Verify current user can access/is member/owner of the circle
    const { data: membership, error: memErr } = await supabase
      .from('learning_circle_members')
      .select('id')
      .eq('circle_id', resource.circle_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (memErr) throw memErr;
    if (!membership) {
      throw new Error('Only members of this learning circle can like resources.');
    }

    // Check if already liked
    const { data: existingLike, error: likeCheckErr } = await supabase
      .from('learning_circle_resource_likes')
      .select('id')
      .eq('resource_id', resourceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (likeCheckErr) throw likeCheckErr;

    if (existingLike) {
      // Unlike (delete row)
      const { error: deleteErr } = await supabase
        .from('learning_circle_resource_likes')
        .delete()
        .eq('id', existingLike.id);
      if (deleteErr) throw deleteErr;
    } else {
      // Like (insert row)
      const { error: insertErr } = await supabase
        .from('learning_circle_resource_likes')
        .insert({
          resource_id: resourceId,
          user_id: userId
        });
      if (insertErr) throw insertErr;
    }
  } catch (err) {
    console.error('toggleResourceLike error:', err);
    throw err;
  }
};


