import { supabase } from './supabase';
import type { Profile } from '../types';

export interface ReviewItem {
  id: string;
  rating: number;
  helpful: boolean;
  comment: string | null;
  created_at: string;
  request_title: string | null;
  // Reviewer public info (no email/UUID shown directly in UI)
  reviewer_id: string;
  reviewer_name: string | null;
  reviewer_department: string | null;
  reviewer_year: string | null;
}

export interface PublicProfileStats {
  profile: Profile;
  solvedCount: number;
  averageRating: number | null;
  reviewCount: number;
  recentReviews: ReviewItem[];
}

/**
 * Returns the public-safe profile row for any userId.
 * Uses the profiles table which is already readable by authenticated users.
 */
export const getPublicProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as Profile;
  } catch (err) {
    console.error('getPublicProfile error:', err);
    return null;
  }
};

/**
 * Returns reviews received by a userId.
 * Includes reviewer public profile info (name, department, year) and request title.
 * Reviewer email and UUID are never exposed in the UI.
 */
export const getReviewsReceived = async (userId: string): Promise<ReviewItem[]> => {
  try {
    // 1. Fetch feedback rows where receiver_id = userId
    const { data: feedbackRows, error: feedbackError } = await supabase
      .from('feedback')
      .select('id, rating, helpful, comment, created_at, request_id, created_by')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (feedbackError || !feedbackRows) return [];

    // 2. Collect unique request IDs to fetch titles
    const requestIds = [...new Set(feedbackRows.map((f) => f.request_id).filter(Boolean))];
    let titleMap: Record<string, string> = {};

    if (requestIds.length > 0) {
      const { data: reqRows } = await supabase
        .from('help_requests')
        .select('id, title')
        .in('id', requestIds);

      if (reqRows) {
        reqRows.forEach((r) => {
          titleMap[r.id] = r.title;
        });
      }
    }

    // 3. Collect unique reviewer IDs to fetch public profiles
    const reviewerIds = [...new Set(feedbackRows.map((f) => f.created_by).filter(Boolean))];
    let reviewerMap: Record<string, { full_name: string; department: string; year_of_study: string }> = {};

    if (reviewerIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name, department, year_of_study')
        .in('id', reviewerIds);

      if (profileRows) {
        profileRows.forEach((p) => {
          reviewerMap[p.id] = {
            full_name: p.full_name,
            department: p.department,
            year_of_study: p.year_of_study,
          };
        });
      }
    }

    // 4. Merge and return
    return feedbackRows.map((f) => {
      const reviewer = reviewerMap[f.created_by] ?? null;
      return {
        id: f.id,
        rating: f.rating,
        helpful: f.helpful,
        comment: f.comment ?? null,
        created_at: f.created_at,
        request_title: f.request_id ? (titleMap[f.request_id] ?? null) : null,
        reviewer_id: f.created_by,
        reviewer_name: reviewer?.full_name ?? null,
        reviewer_department: reviewer?.department ?? null,
        reviewer_year: reviewer?.year_of_study ?? null,
      };
    });
  } catch (err) {
    console.error('getReviewsReceived error:', err);
    return [];
  }
};

/**
 * Aggregates all public reputation stats for a userId.
 */
export const getPublicProfileStats = async (userId: string): Promise<PublicProfileStats | null> => {
  try {
    const profile = await getPublicProfile(userId);
    if (!profile) return null;

    // Solved count
    const { count: solvedCount, error: countError } = await supabase
      .from('help_requests')
      .select('*', { count: 'exact', head: true })
      .eq('accepted_by', userId)
      .eq('status', 'solved');

    // Reviews
    const reviews = await getReviewsReceived(userId);

    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount).toFixed(1))
        : null;

    return {
      profile,
      solvedCount: countError ? 0 : (solvedCount ?? 0),
      averageRating,
      reviewCount,
      recentReviews: reviews.slice(0, 5),
    };
  } catch (err) {
    console.error('getPublicProfileStats error:', err);
    return null;
  }
};
