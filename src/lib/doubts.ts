import { supabase } from './supabase';
import type {
  DoubtPostWithProfile,
  DoubtAnswerWithProfile,
  DoubtAnswerRating,
  DoubtAnswerReplyWithProfile,
  DoubtAnswerLike,
  DoubtReplyLike,
} from '../types';

// ──────────────────────────────────────────
// DOUBT CATEGORIES
// ──────────────────────────────────────────
export const DOUBT_CATEGORIES: string[] = [
  'General',
  'Programming',
  'Java',
  'Python',
  'Data Structures',
  'Algorithms',
  'Web Development',
  'React',
  'Database',
  'Supabase',
  'Mathematics',
  'Physics',
  'Chemistry',
  'English',
  'Communication Skills',
  'Placement Prep',
  'Project Help',
  'Assignment Help',
  'Exam Preparation',
  'Other',
];

// ──────────────────────────────────────────
// INPUT TYPES
// ──────────────────────────────────────────
export interface CreateDoubtInput {
  title: string;
  description: string;
  category: string;
  tags: string[];
  is_anonymous: boolean;
  created_by: string;
}

export interface UpdateDoubtInput {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface CreateAnswerInput {
  doubt_id: string;
  answer_text: string;
  created_by: string;
}

export interface UpdateAnswerInput {
  answer_text: string;
}

export interface RateAnswerInput {
  answer_id: string;
  doubt_id: string;
  created_by: string;
  receiver_id: string;
  rating: number;
  comment?: string;
}

export interface CreateReplyInput {
  answer_id: string;
  doubt_id: string;
  reply_text: string;
  created_by: string;
  is_anonymous: boolean;
}

// ──────────────────────────────────────────
// DOUBT POST FUNCTIONS
// ──────────────────────────────────────────

/**
 * Fetch all doubt posts with creator profile.
 * Returns most-recent first. Anonymous posts have creator_profile intact in DB
 * but the UI hides the name.
 */
export const getDoubts = async (): Promise<DoubtPostWithProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('doubt_posts')
      .select(`
        *,
        creator_profile:profiles!doubt_posts_created_by_fkey(full_name, department, year_of_study)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DoubtPostWithProfile[];
  } catch (err) {
    console.error('Error fetching doubts:', err);
    return [];
  }
};

/**
 * Fetch a single doubt post with profile.
 */
export const getDoubtById = async (doubtId: string): Promise<DoubtPostWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_posts')
      .select(`
        *,
        creator_profile:profiles!doubt_posts_created_by_fkey(full_name, department, year_of_study)
      `)
      .eq('id', doubtId)
      .maybeSingle();

    if (error) throw error;
    return data as DoubtPostWithProfile | null;
  } catch (err) {
    console.error('Error fetching doubt by id:', err);
    return null;
  }
};

/**
 * Create a new doubt post.
 */
export const createDoubt = async (input: CreateDoubtInput): Promise<DoubtPostWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_posts')
      .insert({
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category.trim(),
        tags: input.tags,
        is_anonymous: input.is_anonymous,
        created_by: input.created_by,
        status: 'open',
      })
      .select(`
        *,
        creator_profile:profiles!doubt_posts_created_by_fkey(full_name, department, year_of_study)
      `)
      .single();

    if (error) throw error;
    return data as DoubtPostWithProfile;
  } catch (err) {
    console.error('Error creating doubt:', err);
    throw err;
  }
};

/**
 * Update a doubt post's editable fields.
 */
export const updateDoubt = async (
  doubtId: string,
  input: UpdateDoubtInput
): Promise<DoubtPostWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_posts')
      .update({
        ...(input.title !== undefined && { title: input.title.trim() }),
        ...(input.description !== undefined && { description: input.description.trim() }),
        ...(input.category !== undefined && { category: input.category.trim() }),
        ...(input.tags !== undefined && { tags: input.tags }),
      })
      .eq('id', doubtId)
      .select(`
        *,
        creator_profile:profiles!doubt_posts_created_by_fkey(full_name, department, year_of_study)
      `)
      .single();

    if (error) throw error;
    return data as DoubtPostWithProfile;
  } catch (err) {
    console.error('Error updating doubt:', err);
    throw err;
  }
};

/**
 * Close a doubt (creator only, sets status to 'closed').
 */
export const closeDoubt = async (doubtId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('doubt_posts')
      .update({ status: 'closed' })
      .eq('id', doubtId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error closing doubt:', err);
    throw err;
  }
};

/**
 * Mark a doubt as solved by accepting a specific answer.
 * Supports multiple accepted answers — does NOT unset other answers.
 * Sets solved_answer_id only if not already set (preserves the first accepted answer).
 *
 * IMPORTANT: The RLS policy "Doubt creator can accept an answer" must allow
 * UPDATE when dp.status IN ('open', 'answered', 'solved'). If the Supabase
 * patch phase3-accept-answer-fix.sql has not been applied, accepting a second
 * answer on a solved doubt will silently fail. This function now detects that
 * condition and throws a descriptive error.
 */
export const markDoubtSolved = async (doubtId: string, answerId: string): Promise<boolean> => {
  try {
    // Step 1: mark this specific answer as accepted.
    // Use .select() so we can verify that the row was actually updated.
    // If the RLS USING clause blocks the update, Supabase returns 0 rows (no error).
    const { data: updatedRows, error: answerError } = await supabase
      .from('doubt_answers')
      .update({ is_accepted: true })
      .eq('id', answerId)
      .eq('doubt_id', doubtId)
      .select('id, is_accepted');

    if (answerError) throw answerError;

    // If 0 rows were returned, the RLS policy blocked the update silently.
    if (!updatedRows || updatedRows.length === 0) {
      throw new Error(
        'Accept answer failed: the database policy blocked this update. ' +
        'This usually means the doubt status is "solved" and the RLS policy ' +
        'needs to be updated. Please apply supabase/phase3-accept-answer-fix.sql.'
      );
    }

    // Step 2: set doubt to solved. Only update solved_answer_id if currently null.
    const { data: existingDoubt } = await supabase
      .from('doubt_posts')
      .select('solved_answer_id')
      .eq('id', doubtId)
      .single();

    const updatePayload: Record<string, unknown> = { status: 'solved' };
    if (!existingDoubt?.solved_answer_id) {
      updatePayload.solved_answer_id = answerId;
    }

    const { error: doubtError } = await supabase
      .from('doubt_posts')
      .update(updatePayload)
      .eq('id', doubtId);

    if (doubtError) throw doubtError;
    return true;
  } catch (err) {
    console.error('Error marking doubt solved:', err);
    throw err;
  }
};


/**
 * Reopen a closed doubt so students can answer again.
 * nextStatus should be 'answered' if answer_count > 0, otherwise 'open'.
 */
export const reopenDoubt = async (doubtId: string, nextStatus: 'open' | 'answered'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('doubt_posts')
      .update({ status: nextStatus })
      .eq('id', doubtId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error reopening doubt:', err);
    throw err;
  }
};

/**
 * Permanently delete a doubt.
 * UI must guard: only allow when status is 'open' or 'closed' and answer_count === 0.
 * DB DELETE policy also enforces status IN ('open','closed').
 */
export const deleteDoubt = async (doubtId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('doubt_posts')
      .delete()
      .eq('id', doubtId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting doubt:', err);
    throw err;
  }
};

/**
 * Returns the set of doubt_ids that the given user has answered.
 * Used to populate the "Answered by Me" tab.
 */
export const getDoubtIdsAnsweredByUser = async (userId: string): Promise<Set<string>> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answers')
      .select('doubt_id')
      .eq('created_by', userId);

    if (error) throw error;
    return new Set((data || []).map((r: { doubt_id: string }) => r.doubt_id));
  } catch (err) {
    console.error('Error fetching answered doubt ids:', err);
    return new Set();
  }
};

// ──────────────────────────────────────────
// DOUBT ANSWER FUNCTIONS
// ──────────────────────────────────────────

/**
 * Fetch all answers for a given doubt, with answerer profile.
 * Accepted answer sorts first, then chronologically.
 */
export const getAnswersForDoubt = async (doubtId: string): Promise<DoubtAnswerWithProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answers')
      .select(`
        *,
        answerer_profile:profiles!doubt_answers_created_by_fkey(full_name, department, year_of_study)
      `)
      .eq('doubt_id', doubtId)
      .order('created_at', { ascending: true }); // client-side sort handles pinned/accepted/likes

    if (error) throw error;
    return (data || []) as DoubtAnswerWithProfile[];
  } catch (err) {
    console.error('Error fetching answers for doubt:', err);
    return [];
  }
};

/**
 * Post a new answer to a doubt.
 * NOTE: DB trigger handle_doubt_first_answer() auto-updates doubt status to 'answered'
 * when status was 'open'. No client-side status update needed.
 */
export const createAnswer = async (input: CreateAnswerInput): Promise<DoubtAnswerWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answers')
      .insert({
        doubt_id: input.doubt_id,
        answer_text: input.answer_text.trim(),
        created_by: input.created_by,
      })
      .select(`
        *,
        answerer_profile:profiles!doubt_answers_created_by_fkey(full_name, department, year_of_study)
      `)
      .single();

    if (error) throw error;
    return data as DoubtAnswerWithProfile;
  } catch (err) {
    console.error('Error creating answer:', err);
    throw err;
  }
};

/**
 * Update the text of an existing answer.
 */
export const updateAnswer = async (
  answerId: string,
  input: UpdateAnswerInput
): Promise<DoubtAnswerWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answers')
      .update({ answer_text: input.answer_text.trim() })
      .eq('id', answerId)
      .select(`
        *,
        answerer_profile:profiles!doubt_answers_created_by_fkey(full_name, department, year_of_study)
      `)
      .single();

    if (error) throw error;
    return data as DoubtAnswerWithProfile;
  } catch (err) {
    console.error('Error updating answer:', err);
    throw err;
  }
};

// ──────────────────────────────────────────
// ANSWER RATING FUNCTIONS (Phase 3 Improvement)
// ──────────────────────────────────────────

/**
 * Fetch all ratings for all answers belonging to a doubt.
 */
export const getRatingsForDoubt = async (doubtId: string): Promise<DoubtAnswerRating[]> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_ratings')
      .select('*')
      .eq('doubt_id', doubtId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as DoubtAnswerRating[];
  } catch (err) {
    console.error('Error fetching answer ratings:', err);
    return [];
  }
};

/**
 * Submit a 1–10 rating from the doubt creator for one answer.
 */
export const rateDoubtAnswer = async (input: RateAnswerInput): Promise<DoubtAnswerRating | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_ratings')
      .insert({
        answer_id: input.answer_id,
        doubt_id: input.doubt_id,
        created_by: input.created_by,
        receiver_id: input.receiver_id,
        rating: input.rating,
        comment: input.comment?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as DoubtAnswerRating;
  } catch (err) {
    console.error('Error rating answer:', err);
    throw err;
  }
};

/**
 * Update an existing rating.
 */
export const updateDoubtAnswerRating = async (
  ratingId: string,
  input: { rating: number; comment?: string }
): Promise<DoubtAnswerRating | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_ratings')
      .update({
        rating: input.rating,
        comment: input.comment?.trim() || null,
      })
      .eq('id', ratingId)
      .select()
      .single();

    if (error) throw error;
    return data as DoubtAnswerRating;
  } catch (err) {
    console.error('Error updating answer rating:', err);
    throw err;
  }
};

// ──────────────────────────────────────────
// ANSWER REPLY FUNCTIONS (Phase 3 Improvement)
// ──────────────────────────────────────────

/**
 * Fetch all replies for all answers in a doubt (batched, not per-answer).
 */
export const getRepliesForDoubt = async (doubtId: string): Promise<DoubtAnswerReplyWithProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_replies')
      .select(`
        *,
        author_profile:profiles!doubt_answer_replies_created_by_fkey(full_name)
      `)
      .eq('doubt_id', doubtId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as DoubtAnswerReplyWithProfile[];
  } catch (err) {
    console.error('Error fetching replies for doubt:', err);
    return [];
  }
};

/**
 * Post a follow-up / cross-question reply under an answer.
 */
export const createAnswerReply = async (input: CreateReplyInput): Promise<DoubtAnswerReplyWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_replies')
      .insert({
        answer_id: input.answer_id,
        doubt_id: input.doubt_id,
        reply_text: input.reply_text.trim(),
        created_by: input.created_by,
        is_anonymous: input.is_anonymous,
      })
      .select(`
        *,
        author_profile:profiles!doubt_answer_replies_created_by_fkey(full_name)
      `)
      .single();

    if (error) throw error;
    return data as DoubtAnswerReplyWithProfile;
  } catch (err) {
    console.error('Error creating reply:', err);
    throw err;
  }
};

/**
 * Update the text of an existing reply (owner only).
 */
export const updateAnswerReply = async (
  replyId: string,
  input: { reply_text: string }
): Promise<DoubtAnswerReplyWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_replies')
      .update({ reply_text: input.reply_text.trim() })
      .eq('id', replyId)
      .select(`
        *,
        author_profile:profiles!doubt_answer_replies_created_by_fkey(full_name)
      `)
      .single();

    if (error) throw error;
    return data as DoubtAnswerReplyWithProfile;
  } catch (err) {
    console.error('Error updating reply:', err);
    throw err;
  }
};

/**
 * Update the text of a doubt answer (answer author only).
 * Only sends answer_text — never touches is_accepted / is_pinned / pinned_at.
 * Requires 'Answer author can edit own answer text' RLS policy.
 */
export const updateDoubtAnswer = async (
  answerId: string,
  answerText: string
): Promise<DoubtAnswerWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answers')
      .update({ answer_text: answerText.trim() })
      .eq('id', answerId)
      .select(`
        *,
        answerer_profile:profiles!doubt_answers_created_by_fkey(full_name, department, year_of_study)
      `)
      .single();
    if (error) throw error;
    return data as DoubtAnswerWithProfile;
  } catch (err) {
    console.error('Error updating doubt answer:', err);
    throw err;
  }
};

/**
 * Delete an answer (author only, only when not accepted and not pinned).
 * RLS policy also enforces this server-side.
 * UI must guard: only show button when !is_accepted && !is_pinned.
 */
export const deleteDoubtAnswer = async (answerId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('doubt_answers')
      .delete()
      .eq('id', answerId);
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting doubt answer:', err);
    throw err;
  }
};

/**
 * Delete a reply (author only, only when not pinned).
 * Requires 'Reply author can delete own reply' RLS policy.
 */
export const deleteDoubtReply = async (replyId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('doubt_answer_replies')
      .delete()
      .eq('id', replyId);
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting reply:', err);
    throw err;
  }
};


// ──────────────────────────────────────────
// ANSWER LIKES (Phase 3 YouTube upgrade)
// ──────────────────────────────────────────

/**
 * Fetch all likes for answers belonging to a doubt.
 * Returns [] gracefully if table does not exist yet (patch not applied).
 */
export const getAnswerLikesForDoubt = async (doubtId: string): Promise<DoubtAnswerLike[]> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_likes')
      .select('*')
      .eq('doubt_id', doubtId);
    if (error) throw error;
    return (data || []) as DoubtAnswerLike[];
  } catch (err) {
    console.error('Error fetching answer likes:', err);
    return [];
  }
};

/**
 * Toggle a like on an answer.
 * Pass currentlyLiked=true to unlike, false to like.
 */
export const toggleAnswerLike = async (
  answerId: string,
  doubtId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<void> => {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('doubt_answer_likes')
      .delete()
      .eq('answer_id', answerId)
      .eq('created_by', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('doubt_answer_likes')
      .insert({ answer_id: answerId, doubt_id: doubtId, created_by: userId });
    if (error) throw error;
  }
};

// ──────────────────────────────────────────
// REPLY LIKES (Phase 3 YouTube upgrade)
// ──────────────────────────────────────────

/**
 * Fetch all likes for replies belonging to a doubt.
 * Returns [] gracefully if table does not exist yet.
 */
export const getReplyLikesForDoubt = async (doubtId: string): Promise<DoubtReplyLike[]> => {
  try {
    const { data, error } = await supabase
      .from('doubt_reply_likes')
      .select('*')
      .eq('doubt_id', doubtId);
    if (error) throw error;
    return (data || []) as DoubtReplyLike[];
  } catch (err) {
    console.error('Error fetching reply likes:', err);
    return [];
  }
};

/**
 * Toggle a like on a reply.
 * Pass currentlyLiked=true to unlike, false to like.
 */
export const toggleReplyLike = async (
  replyId: string,
  doubtId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<void> => {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('doubt_reply_likes')
      .delete()
      .eq('reply_id', replyId)
      .eq('created_by', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('doubt_reply_likes')
      .insert({ reply_id: replyId, doubt_id: doubtId, created_by: userId });
    if (error) throw error;
  }
};

// ──────────────────────────────────────────
// PIN / UNPIN ANSWER (Phase 3 YouTube upgrade)
// ──────────────────────────────────────────

/**
 * Toggle is_pinned on a specific answer.
 * Requires the 'Doubt creator can pin answers' RLS policy
 * (applied via phase3-doubt-likes-pins-patch.sql).
 * Throws a descriptive error if 0 rows were updated (RLS blocked it or column missing).
 */
export const toggleAnswerPin = async (
  answerId: string,
  doubtId: string,
  shouldPin: boolean
): Promise<boolean> => {
  try {
    const { data: updated, error } = await supabase
      .from('doubt_answers')
      .update({
        is_pinned: shouldPin,
        pinned_at: shouldPin ? new Date().toISOString() : null,
      })
      .eq('id', answerId)
      .eq('doubt_id', doubtId)
      .select('id, is_pinned');

    if (error) throw error;

    if (!updated || updated.length === 0) {
      throw new Error(
        'Pin update failed: the database policy blocked this update. ' +
        'Apply supabase/phase3-doubt-likes-pins-patch.sql to enable pinning.'
      );
    }
    return true;
  } catch (err) {
    console.error('Error toggling answer pin:', err);
    throw err;
  }
};

// ──────────────────────────────────────────
// PIN / UNPIN REPLY (Phase 3 edit/delete patch)
// ──────────────────────────────────────────

/**
 * Toggle is_pinned on a specific reply.
 * Only the doubt creator can pin/unpin; RLS enforces this.
 * Throws if 0 rows updated (RLS blocked or column missing).
 */
export const toggleReplyPin = async (
  replyId: string,
  doubtId: string,
  shouldPin: boolean
): Promise<boolean> => {
  try {
    const { data: updated, error } = await supabase
      .from('doubt_answer_replies')
      .update({
        is_pinned: shouldPin,
        pinned_at: shouldPin ? new Date().toISOString() : null,
      })
      .eq('id', replyId)
      .eq('doubt_id', doubtId)
      .select('id, is_pinned');

    if (error) throw error;
    if (!updated || updated.length === 0) {
      throw new Error(
        'Reply pin failed: database policy blocked the update. ' +
        'Apply supabase/phase3-answer-reply-edit-delete-patch.sql to enable reply pinning.'
      );
    }
    return true;
  } catch (err) {
    console.error('Error toggling reply pin:', err);
    throw err;
  }
};

