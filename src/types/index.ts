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
