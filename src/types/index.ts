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
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  contact_other: string | null;
  share_phone_after_accept: boolean;
  share_whatsapp_after_accept: boolean;
  share_email_after_accept: boolean;
  share_other_contact_after_accept: boolean;
  share_contact_after_accept: boolean;
  mentor_status?: 'accepting' | 'busy' | 'unavailable';
  headline?: string | null;
  academic_interests?: string[];
  learning_goals?: string | null;
  current_focus?: string | null;
  qualification_summary?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
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

// ==========================================
// PHASE 4: SENIOR CONNECT TYPES
// ==========================================

export type SeniorGuidanceStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'cancelled';

export type GuidanceMode = 'Online' | 'In-Person' | 'Hybrid';

export interface SeniorGuidanceRequest {
  id: string;
  requester_id: string;
  senior_id: string;
  topic: string;
  message: string;
  preferred_mode: GuidanceMode;
  preferred_time: string | null;
  status: SeniorGuidanceStatus;
  response_message: string | null;
  completed_at: string | null;
  meeting_mode: GuidanceMode | null;
  meeting_details: string | null;
  scheduled_time: string | null;
  meeting_link: string | null;
  meeting_password: string | null;
  meeting_location: string | null;
  meeting_platform: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeniorGuidanceRequestWithProfiles extends SeniorGuidanceRequest {
  requester_profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
    section: string | null;
  } | null;
  senior_profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
    is_senior_mentor: boolean;
    mentor_topics: string[];
    mentor_bio: string | null;
    availability: string | null;
    help_mode: string | null;
    trust_score: number;
    badge_level: string;
  } | null;
}

/** Subset of Profile containing mentor-specific fields, used in Find Seniors tab */
export interface SeniorMentorProfile {
  id: string;
  full_name: string;
  department: string;
  year_of_study: string;
  section: string | null;
  mentor_topics: string[];
  mentor_bio: string | null;
  availability: string | null;
  help_mode: string | null;
  trust_score: number;
  badge_level: string;
  skills_known: string[];
  mentor_status?: 'accepting' | 'busy' | 'unavailable';
}

export interface SeniorGuidanceFeedback {
  id: string;
  request_id: string;
  senior_id: string;
  created_by: string;
  rating: number;
  helpful: boolean;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeniorGuidanceFeedbackWithProfiles extends SeniorGuidanceFeedback {
  requester_profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
  } | null;
  guidance_request?: {
    topic: string;
  } | null;
}

// ==========================================
// PHASE 5: LEARNING CIRCLES TYPES
// ==========================================

export type CircleRole = 'owner' | 'member';
export type CircleDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Mixed';
export type CircleMeetingMode = 'Online' | 'In-Person' | 'Hybrid';
export type CircleStatus = 'active' | 'paused' | 'archived';
export type CircleResourceType = 'Link' | 'PDF' | 'Video' | 'Notes' | 'Book' | 'Other';
export type CirclePostType = 'Update' | 'Question' | 'Plan' | 'Announcement' | 'discussion' | 'question' | 'announcement' | 'study_plan';

export interface LearningCircle {
  id: string;
  title: string;
  description: string;
  category: string;
  department: string | null;
  difficulty_level: CircleDifficulty;
  meeting_mode: CircleMeetingMode;
  meeting_schedule: string | null;
  location_or_link: string | null;
  meeting_link?: string | null;
  meeting_password?: string | null;
  max_members: number;
  is_public: boolean;
  created_by: string;
  status: CircleStatus;
  created_at: string;
  updated_at: string;
}

export interface LearningCircleWithStats extends LearningCircle {
  creator_name?: string;
  member_count?: number;
  my_role?: CircleRole | null;
}

export interface LearningCircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role: CircleRole;
  joined_at: string;
  profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
  } | null;
}

export type ResourceVerificationStatus = 'pending_verification' | 'verified' | 'rejected';

export interface LearningCircleResource {
  id: string;
  circle_id: string;
  shared_by: string;
  title: string;
  description: string | null;
  resource_type: CircleResourceType;
  url: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_mime_type?: string | null;
  file_size_bytes?: number | null;
  storage_bucket?: string | null;
  is_pinned?: boolean;
  pinned_by?: string | null;
  pinned_at?: string | null;
  likes_count?: number;
  liked_by_me?: boolean;
  verification_status?: ResourceVerificationStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  owner_recommended?: boolean;
  owner_recommended_by?: string | null;
  owner_recommended_at?: string | null;
  created_at: string;
  updated_at: string;
  uploader_profile?: {
    full_name: string;
  } | null;
}

export interface LearningCirclePost {
  id: string;
  circle_id: string;
  created_by: string;
  content: string;
  title: string | null;
  body: string | null;
  post_type: CirclePostType;
  tags: string[];
  is_pinned: boolean;
  pinned_by: string | null;
  pinned_at: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  author_profile?: {
    full_name: string;
  } | null;
  replies_count?: number;
  helpful_count?: number;
  reacted_by_me?: boolean;
}

export interface LearningCirclePostReply {
  id: string;
  post_id: string;
  circle_id: string;
  created_by: string;
  body: string;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  author_profile?: {
    full_name: string;
  } | null;
  helpful_count?: number;
  reacted_by_me?: boolean;
}

export interface LearningCirclePostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: 'helpful';
  created_at: string;
}

export interface LearningCirclePostReplyReaction {
  id: string;
  reply_id: string;
  user_id: string;
  reaction_type: 'helpful';
  created_at: string;
}

export interface LearningCirclePresence {
  id: string;
  circle_id: string;
  user_id: string;
  last_seen_at: string;
  current_tab: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
  } | null;
}


export type LearningCircleJoinRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type LearningCircleRoleInterest = 'learner' | 'contributor' | 'peer_mentor';

export interface LearningCircleJoinRequest {
  id: string;
  circle_id: string;
  requester_id: string;
  message: string | null;
  role_interest: LearningCircleRoleInterest;
  status: LearningCircleJoinRequestStatus;
  response_message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  membership_created_at?: string | null;
  member_left_at?: string | null;
  leave_reason?: string | null;
  leave_message?: string | null;
  left_by?: string | null;
  removed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LearningCircleJoinRequestWithProfile extends LearningCircleJoinRequest {
  requester_profile?: Profile | null;
}

// ==========================================
// PHASE 6: PROJECT MATE FINDER TYPES
// ==========================================

export type ProjectPostStatus = 'recruiting' | 'in_progress' | 'team_full' | 'completed' | 'paused' | 'archived';
export type ProjectDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type ProjectWorkMode = 'Online' | 'Offline' | 'Hybrid' | 'Campus only';
export type ProjectRolePriority = 'low' | 'medium' | 'high';
export type ProjectApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface ProjectPost {
  id: string;
  created_by: string;
  title: string;
  summary: string | null;
  description: string;
  category: string;
  project_type: string;
  difficulty_level: ProjectDifficulty;
  required_skills: string[];
  preferred_departments: string[];
  preferred_years: string[];
  work_mode: ProjectWorkMode;
  expected_timeline: string | null;
  meeting_preference: string | null;
  max_team_size: number;
  current_team_size: number;
  status: ProjectPostStatus;
  is_beginner_friendly: boolean;
  is_hackathon: boolean;
  deadline: string | null;
  // Private team-only fields:
  coordination_link: string | null;
  github_repo_url: string | null;
  shared_doc_url: string | null;
  private_notes: string | null;
  // Phase 6.3C: Lifecycle tracking columns (optional until patch is applied)
  completed_at?: string | null;
  completion_summary?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectRole {
  id: string;
  project_id: string;
  role_name: string;
  description: string | null;
  required_skills: string[];
  slots_needed: number;
  slots_filled: number;
  priority: ProjectRolePriority;
  created_at: string;
  updated_at: string;
}

export interface ProjectApplication {
  id: string;
  project_id: string;
  applicant_id: string;
  role_id: string | null;
  role_interest: string | null;
  message: string;
  skills_snapshot: string[];
  experience_summary: string | null;
  portfolio_url: string | null;
  availability: string | null;
  expected_contribution: string | null;
  status: ProjectApplicationStatus;
  owner_response: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectApplicationWithProfile extends ProjectApplication {
  applicant_profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
    skills_known: string[];
    headline?: string | null;
    academic_interests?: string[];
    learning_goals?: string | null;
    qualification_summary?: string | null;
    github_url?: string | null;
    linkedin_url?: string | null;
    portfolio_url?: string | null;
  } | null;
}

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role_id: string | null;
  role_name: string | null;
  joined_at: string;
  added_by: string | null;
  left_at: string | null;
  leave_reason: string | null;
  removed_by: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
  } | null;
}

export interface ProjectWithStats extends ProjectPost {
  owner_profile?: {
    full_name: string;
    department: string;
    year_of_study: string;
  } | null;
  roles?: ProjectRole[];
  my_application_status?: ProjectApplicationStatus | null;
  my_application_id?: string | null;
  is_owner?: boolean;
  is_member?: boolean;
  match_score?: number;
  match_reasons?: string[];
}

export interface ProjectDiscussionPost {
  id: string;
  project_id: string;
  created_by: string;
  title: string;
  body: string;
  post_type: 'update' | 'question' | 'announcement' | 'task';
  tags: string[];
  is_pinned: boolean;
  pinned_by: string | null;
  pinned_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  author_profile?: {
    full_name: string;
  } | null;
  replies_count?: number;
  helpful_count?: number;
  reacted_by_me?: boolean;
}

export interface ProjectDiscussionReply {
  id: string;
  post_id: string;
  project_id: string;
  created_by: string;
  body: string;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  author_profile?: {
    full_name: string;
  } | null;
  helpful_count?: number;
  reacted_by_me?: boolean;
}

export interface ProjectDiscussionReaction {
  id: string;
  post_id: string | null;
  reply_id: string | null;
  user_id: string;
  reaction_type: 'helpful';
  created_at: string;
}

export interface ProjectResource {
  id: string;
  project_id: string;
  uploaded_by: string;
  title: string;
  description: string | null;
  resource_type: 'link' | 'pdf' | 'document' | 'presentation' | 'notes' | 'image' | 'dataset' | 'code_repo' | 'folder' | 'other';
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size_bytes: number | null;
  storage_bucket: string | null;
  verification_status: 'pending_verification' | 'verified' | 'rejected';
  verified_by: string | null;
  verified_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  is_pinned: boolean;
  pinned_by: string | null;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
  uploader_profile?: {
    full_name: string;
  } | null;
  helpful_count?: number;
  owner_recommended?: boolean;
  reacted_by_me?: boolean;
}




