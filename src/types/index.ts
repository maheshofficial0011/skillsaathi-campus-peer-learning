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
