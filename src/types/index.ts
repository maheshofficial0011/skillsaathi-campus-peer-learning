export type YearOfStudy = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';

export type HelpMode = 'Online' | 'In-Person' | 'Hybrid';

export interface Profile {
  id: string;
  full_name: string;
  department: string;
  year_of_study: string;
  section: string | null;
  skills_known: string[];
  skills_wanted: string[];
  availability: string | null;
  help_mode: string | null;
  trust_score: number;
  badge_level: string;
  is_senior_mentor: boolean;
  mentor_topics: string[];
  mentor_bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
}

// ==========================================
// PHASE 2: CORE PEER HELP MVP TYPES
// ==========================================

export type HelpRequestStatus = 'open' | 'accepted' | 'solved' | 'closed';

export type HelpRequestUrgency = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface HelpRequest {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  category: string;
  urgency: HelpRequestUrgency;
  deadline: string | null;
  status: HelpRequestStatus;
  created_by: string;
  accepted_by: string | null;
  solved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HelpRequestWithProfiles extends HelpRequest {
  creator_profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
  } | null;
  helper_profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
  } | null;
}

export interface Feedback {
  id: string;
  request_id: string;
  created_by: string;
  receiver_id: string;
  rating: number;
  helpful: boolean;
  comment: string | null;
  created_at: string;
}

// ==========================================
// PHASE 3: DOUBTS MODULE TYPES
// ==========================================

export type DoubtStatus = 'open' | 'answered' | 'solved' | 'closed';

export interface DoubtPost {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  is_anonymous: boolean;
  status: DoubtStatus;
  created_by: string;
  solved_answer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoubtPostWithProfile extends DoubtPost {
  creator_profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
  } | null;
  answer_count?: number;
}

export interface DoubtAnswer {
  id: string;
  doubt_id: string;
  answer_text: string;
  created_by: string;
  is_accepted: boolean;
  // Added by phase3-doubt-likes-pins-patch.sql — optional until patch is applied
  is_pinned?: boolean;
  pinned_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoubtAnswerWithProfile extends DoubtAnswer {
  answerer_profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
  } | null;
}

// Phase 3 improvement: answer ratings (1–10) by doubt creator
export interface DoubtAnswerRating {
  id: string;
  answer_id: string;
  doubt_id: string;
  created_by: string;
  receiver_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

// Phase 3 improvement: per-answer follow-up replies / cross-questions
export interface DoubtAnswerReply {
  id: string;
  answer_id: string;
  doubt_id: string;
  reply_text: string;
  created_by: string;
  is_anonymous: boolean;
  // Added by phase3-answer-reply-edit-delete-patch.sql — optional until patch applied
  is_pinned?: boolean;
  pinned_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoubtAnswerReplyWithProfile extends DoubtAnswerReply {
  author_profile?: {
    full_name: string;
  } | null;
}

// Phase 3 YouTube upgrade: answer likes
export interface DoubtAnswerLike {
  id: string;
  answer_id: string;
  doubt_id: string;
  created_by: string;
  created_at: string;
}

// Phase 3 YouTube upgrade: reply likes
export interface DoubtReplyLike {
  id: string;
  reply_id: string;
  doubt_id: string;
  created_by: string;
  created_at: string;
}
