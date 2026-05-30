import { supabase } from './supabase';
import type {
  ProjectPost,
  ProjectRole,
  ProjectApplication,
  ProjectApplicationWithProfile,
  ProjectTeamMember,
  ProjectWithStats
} from '../types';

/**
 * Calculates a deterministic match score between 0 and 100 for a project and a user profile.
 */
export function calculateProjectMatchScore(
  project: ProjectPost,
  roles: ProjectRole[] | undefined,
  userProfile: any
): { score: number; reasons: string[] } {
  if (!userProfile) return { score: 0, reasons: ['Log in to see your compatibility score.'] };

  let score = 0;
  const reasons: string[] = [];

  // 1. Department match (25%)
  if (!project.preferred_departments || project.preferred_departments.length === 0) {
    score += 25;
    reasons.push('Open to all academic departments.');
  } else if (userProfile.department && project.preferred_departments.includes(userProfile.department)) {
    score += 25;
    reasons.push(`Targeted department match: ${userProfile.department}`);
  } else {
    reasons.push(`Prefers departments: ${project.preferred_departments.join(', ')}`);
  }

  // 2. Academic Year match (25%)
  if (!project.preferred_years || project.preferred_years.length === 0) {
    score += 25;
    reasons.push('Open to all academic years.');
  } else if (userProfile.year_of_study && project.preferred_years.includes(userProfile.year_of_study)) {
    score += 25;
    reasons.push(`Targeted academic year match: ${userProfile.year_of_study}`);
  } else {
    reasons.push(`Prefers academic years: ${project.preferred_years.join(', ')}`);
  }

  // 3. Skills overlap (50%)
  // Combine project required skills and any role-specific skills
  const projectSkills = new Set<string>();
  if (project.required_skills) {
    project.required_skills.forEach(s => projectSkills.add(s.trim().toLowerCase()));
  }
  if (roles) {
    roles.forEach(r => {
      if (r.required_skills) {
        r.required_skills.forEach(s => projectSkills.add(s.trim().toLowerCase()));
      }
    });
  }

  const userSkills = new Set(
    (userProfile.skills_known || []).map((s: string) => s.trim().toLowerCase())
  );

  if (projectSkills.size === 0) {
    score += 50;
    reasons.push('No specific prerequisite skills required.');
  } else {
    let matchedCount = 0;
    const matchedList: string[] = [];
    projectSkills.forEach(skill => {
      if (userSkills.has(skill)) {
        matchedCount++;
        matchedList.push(skill);
      }
    });

    const skillsScore = Math.round((matchedCount / projectSkills.size) * 50);
    score += skillsScore;

    if (matchedCount > 0) {
      reasons.push(`Matched ${matchedCount} skill(s): ${matchedList.join(', ')}`);
    } else {
      reasons.push('No matching skills found in your profile.');
    }
  }

  return { score, reasons };
}

/**
 * Fetch all discoverable project posts with stats, roles, and current user status.
 */
export async function getProjectPosts(
  currentUserId?: string,
  userProfile?: any
): Promise<ProjectWithStats[]> {
  // Fetch posts with their owners
  const { data: posts, error: postsError } = await supabase
    .from('project_posts')
    .select(`
      *,
      owner_profile:profiles!project_posts_created_by_fkey(id, full_name, department, year_of_study)
    `)
    .order('created_at', { ascending: false });

  if (postsError) throw postsError;
  if (!posts) return [];

  // Fetch all roles to map them
  const { data: allRoles, error: rolesError } = await supabase
    .from('project_roles')
    .select('*');

  if (rolesError) throw rolesError;

  // Fetch current user applications and team memberships if logged in
  let myApplications: any[] = [];
  let myMemberships: any[] = [];

  if (currentUserId) {
    const { data: apps } = await supabase
      .from('project_applications')
      .select('id, project_id, status')
      .eq('applicant_id', currentUserId);

    myApplications = apps || [];

    const { data: members } = await supabase
      .from('project_team_members')
      .select('id, project_id, left_at')
      .eq('user_id', currentUserId)
      .is('left_at', null);

    myMemberships = members || [];
  }

  // Combine data
  return posts.map((post: any) => {
    const projectRoles = (allRoles || []).filter(r => r.project_id === post.id);
    const isOwner = currentUserId === post.created_by;

    const myApp = myApplications.find(a => a.project_id === post.id);
    const isMember = myMemberships.some(m => m.project_id === post.id) || isOwner || (myApp && myApp.status === 'accepted');

    // Enforce private collaboration fields gating
    const cleanPost = { ...post };
    if (!isOwner && !isMember) {
      cleanPost.coordination_link = null;
      cleanPost.github_repo_url = null;
      cleanPost.shared_doc_url = null;
      cleanPost.private_notes = null;
    }

    // Matchmaking
    const match = calculateProjectMatchScore(cleanPost, projectRoles, userProfile);

    return {
      ...cleanPost,
      roles: projectRoles,
      is_owner: isOwner,
      is_member: isMember,
      my_application_status: myApp ? myApp.status : null,
      my_application_id: myApp ? myApp.id : null,
      match_score: match.score,
      match_reasons: match.reasons
    };
  });
}

/**
 * Fetch a single project post by ID, with privacy rules enforced.
 */
export async function getProjectById(
  projectId: string,
  currentUserId: string,
  userProfile?: any
): Promise<ProjectWithStats> {
  const { data: post, error: postError } = await supabase
    .from('project_posts')
    .select(`
      *,
      owner_profile:profiles!project_posts_created_by_fkey(id, full_name, department, year_of_study)
    `)
    .eq('id', projectId)
    .single();

  if (postError) throw postError;

  // Roles
  const { data: roles } = await supabase
    .from('project_roles')
    .select('*')
    .eq('project_id', projectId);

  // Application
  const { data: apps } = await supabase
    .from('project_applications')
    .select('id, status')
    .eq('project_id', projectId)
    .eq('applicant_id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(1);

  const myApp = apps && apps.length > 0 ? apps[0] : null;

  // Memberships to check access
  const { data: activeMembers } = await supabase
    .from('project_team_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', currentUserId)
    .is('left_at', null);

  const isOwner = currentUserId === post.created_by;
  const isMember = isOwner || (activeMembers && activeMembers.length > 0) || (myApp && myApp.status === 'accepted');

  // Enforce private collaboration fields gating
  const cleanPost = { ...post };
  if (!isOwner && !isMember) {
    cleanPost.coordination_link = null;
    cleanPost.github_repo_url = null;
    cleanPost.shared_doc_url = null;
    cleanPost.private_notes = null;
  }

  const match = calculateProjectMatchScore(cleanPost, roles || [], userProfile);

  return {
    ...cleanPost,
    roles: roles || [],
    is_owner: isOwner,
    is_member: isMember,
    my_application_status: myApp ? myApp.status : null,
    my_application_id: myApp ? myApp.id : null,
    match_score: match.score,
    match_reasons: match.reasons
  };
}

/**
 * Creates a project, bootstraps the owner, and registers role slots.
 */
export async function createProjectPost(input: {
  created_by: string;
  title: string;
  summary?: string;
  description: string;
  category: string;
  project_type: string;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced';
  required_skills: string[];
  preferred_departments: string[];
  preferred_years: string[];
  work_mode: 'Online' | 'Offline' | 'Hybrid' | 'Campus only';
  expected_timeline?: string;
  meeting_preference?: string;
  max_team_size: number;
  is_beginner_friendly: boolean;
  is_hackathon: boolean;
  deadline?: string | null;
  coordination_link?: string;
  github_repo_url?: string;
  shared_doc_url?: string;
  private_notes?: string;
  roles?: {
    role_name: string;
    description?: string;
    required_skills: string[];
    slots_needed: number;
    priority: 'low' | 'medium' | 'high';
  }[];
}): Promise<ProjectPost> {
  if (input.title.length < 5) throw new Error('Title must be at least 5 characters long.');
  if (input.description.length < 20) throw new Error('Description must be at least 20 characters long.');
  if (input.max_team_size < 2 || input.max_team_size > 20) {
    throw new Error('Max team size must be between 2 and 20.');
  }

  // Helper validation for secure HTTPS links
  const validateHttps = (url?: string) => {
    if (!url || url.trim() === '') return true;
    return url.trim().toLowerCase().startsWith('https://');
  };

  if (!validateHttps(input.coordination_link) ||
      !validateHttps(input.github_repo_url) ||
      !validateHttps(input.shared_doc_url)) {
    throw new Error('All external links must strictly use the https:// protocol.');
  }

  // Insert project
  const { data: project, error: projectError } = await supabase
    .from('project_posts')
    .insert({
      created_by: input.created_by,
      title: input.title,
      summary: input.summary || null,
      description: input.description,
      category: input.category,
      project_type: input.project_type,
      difficulty_level: input.difficulty_level,
      required_skills: input.required_skills,
      preferred_departments: input.preferred_departments,
      preferred_years: input.preferred_years,
      work_mode: input.work_mode,
      expected_timeline: input.expected_timeline || null,
      meeting_preference: input.meeting_preference || null,
      max_team_size: input.max_team_size,
      current_team_size: 1, // Start with owner
      status: 'recruiting',
      is_beginner_friendly: input.is_beginner_friendly,
      is_hackathon: input.is_hackathon,
      deadline: input.deadline || null,
      coordination_link: input.coordination_link || null,
      github_repo_url: input.github_repo_url || null,
      shared_doc_url: input.shared_doc_url || null,
      private_notes: input.private_notes || null
    })
    .select()
    .single();

  if (projectError) throw projectError;

  // Owner bootstrap membership
  const { error: memberError } = await supabase
    .from('project_team_members')
    .insert({
      project_id: project.id,
      user_id: input.created_by,
      role_name: 'Project Owner',
      added_by: input.created_by
    });

  if (memberError) throw memberError;

  // Insert roles if provided
  if (input.roles && input.roles.length > 0) {
    const rolesPayload = input.roles.map(r => ({
      project_id: project.id,
      role_name: r.role_name,
      description: r.description || null,
      required_skills: r.required_skills,
      slots_needed: r.slots_needed,
      slots_filled: 0,
      priority: r.priority
    }));

    const { error: rolesError } = await supabase
      .from('project_roles')
      .insert(rolesPayload);

    if (rolesError) throw rolesError;
  }

  return project;
}

/**
 * Updates a project post (owner only).
 */
export async function updateProjectPost(
  projectId: string,
  input: {
    title: string;
    summary?: string;
    description: string;
    category: string;
    project_type: string;
    difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced';
    required_skills: string[];
    preferred_departments: string[];
    preferred_years: string[];
    work_mode: 'Online' | 'Offline' | 'Hybrid' | 'Campus only';
    expected_timeline?: string;
    meeting_preference?: string;
    max_team_size: number;
    status: 'recruiting' | 'in_progress' | 'team_full' | 'completed' | 'paused' | 'archived';
    is_beginner_friendly: boolean;
    is_hackathon: boolean;
    deadline?: string | null;
    coordination_link?: string;
    github_repo_url?: string;
    shared_doc_url?: string;
    private_notes?: string;
  }
): Promise<void> {
  if (input.title.length < 5) throw new Error('Title must be at least 5 characters long.');
  if (input.description.length < 20) throw new Error('Description must be at least 20 characters long.');

  const validateHttps = (url?: string) => {
    if (!url || url.trim() === '') return true;
    return url.trim().toLowerCase().startsWith('https://');
  };

  if (!validateHttps(input.coordination_link) ||
      !validateHttps(input.github_repo_url) ||
      !validateHttps(input.shared_doc_url)) {
    throw new Error('All external links must strictly use the https:// protocol.');
  }

  const { error } = await supabase
    .from('project_posts')
    .update({
      title: input.title,
      summary: input.summary || null,
      description: input.description,
      category: input.category,
      project_type: input.project_type,
      difficulty_level: input.difficulty_level,
      required_skills: input.required_skills,
      preferred_departments: input.preferred_departments,
      preferred_years: input.preferred_years,
      work_mode: input.work_mode,
      expected_timeline: input.expected_timeline || null,
      meeting_preference: input.meeting_preference || null,
      max_team_size: input.max_team_size,
      status: input.status,
      is_beginner_friendly: input.is_beginner_friendly,
      is_hackathon: input.is_hackathon,
      deadline: input.deadline || null,
      coordination_link: input.coordination_link || null,
      github_repo_url: input.github_repo_url || null,
      shared_doc_url: input.shared_doc_url || null,
      private_notes: input.private_notes || null
    })
    .eq('id', projectId);

  if (error) throw error;
}

/**
 * Apply to join a project.
 */
export async function applyToProject(input: {
  project_id: string;
  applicant_id: string;
  role_id: string | null;
  role_interest?: string;
  message: string;
  skills_snapshot: string[];
  experience_summary?: string;
  portfolio_url?: string;
  availability?: string;
  expected_contribution?: string;
}): Promise<ProjectApplication> {
  if (input.message.length < 10) throw new Error('Application message must be at least 10 characters.');
  
  if (input.portfolio_url && !input.portfolio_url.trim().toLowerCase().startsWith('https://')) {
    throw new Error('Portfolio URL must strictly use the https:// protocol.');
  }

  // Double check that user isn't project owner
  const { data: post } = await supabase
    .from('project_posts')
    .select('created_by, status')
    .eq('id', input.project_id)
    .single();

  if (post?.created_by === input.applicant_id) {
    throw new Error('Project owners cannot apply to their own projects.');
  }
  if (post?.status === 'archived' || post?.status === 'completed') {
    throw new Error('This project is not accepting applications right now.');
  }

  // Check duplicate active pending
  const { data: existingPending } = await supabase
    .from('project_applications')
    .select('id')
    .eq('project_id', input.project_id)
    .eq('applicant_id', input.applicant_id)
    .eq('status', 'pending');

  if (existingPending && existingPending.length > 0) {
    throw new Error('You already have an active pending application for this project.');
  }

  const { data: application, error } = await supabase
    .from('project_applications')
    .insert({
      project_id: input.project_id,
      applicant_id: input.applicant_id,
      role_id: input.role_id || null,
      role_interest: input.role_interest || null,
      message: input.message,
      skills_snapshot: input.skills_snapshot,
      experience_summary: input.experience_summary || null,
      portfolio_url: input.portfolio_url || null,
      availability: input.availability || null,
      expected_contribution: input.expected_contribution || null,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return application;
}

/**
 * Withdraw a pending application.
 */
export async function withdrawApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('project_applications')
    .update({ status: 'withdrawn' })
    .eq('id', applicationId)
    .eq('status', 'pending');

  if (error) throw error;
}

/**
 * Get all applications submitted by a user.
 */
export async function getMyApplications(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('project_applications')
    .select(`
      *,
      project:project_posts(title, status, created_by, max_team_size, current_team_size)
    `)
    .eq('applicant_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all applications submitted to an owned project.
 */
export async function getProjectApplications(projectId: string): Promise<ProjectApplicationWithProfile[]> {
  // Fetch applications and join ONLY safe public profile details
  const { data, error } = await supabase
    .from('project_applications')
    .select(`
      *,
      applicant_profile:profiles!project_applications_applicant_id_fkey(
        full_name,
        department,
        year_of_study,
        skills_known,
        headline,
        academic_interests,
        learning_goals,
        qualification_summary,
        github_url,
        linkedin_url,
        portfolio_url
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ProjectApplicationWithProfile[];
}

/**
 * Respond to an application (Accept / Reject).
 */
export async function respondToProjectApplication(
  applicationId: string,
  action: 'accepted' | 'rejected',
  ownerResponse?: string
): Promise<void> {
  // Fetch application details
  const { data: app, error: appError } = await supabase
    .from('project_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (appError || !app) throw new Error('Application not found.');

  // Fetch project details to check limits
  const { data: project, error: projError } = await supabase
    .from('project_posts')
    .select('*')
    .eq('id', app.project_id)
    .single();

  if (projError || !project) throw new Error('Project not found.');

  if (action === 'accepted') {
    // 1. Check capacity
    if (project.current_team_size >= project.max_team_size) {
      throw new Error('Cannot accept: Project team has reached maximum capacity.');
    }

    // 2. Increment role slot if a specific role was selected
    if (app.role_id) {
      const { data: role } = await supabase
        .from('project_roles')
        .select('*')
        .eq('id', app.role_id)
        .single();

      if (role) {
        if (role.slots_filled >= role.slots_needed) {
          throw new Error(`Cannot accept: The selected role "${role.role_name}" is already fully staffed.`);
        }
        await supabase
          .from('project_roles')
          .update({ slots_filled: role.slots_filled + 1 })
          .eq('id', app.role_id);
      }
    }

    // 3. Update application status
    const { error: updateAppErr } = await supabase
      .from('project_applications')
      .update({
        status: 'accepted',
        owner_response: ownerResponse || 'Approved by project owner.',
        reviewed_by: project.created_by,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateAppErr) throw updateAppErr;

    // 4. Create membership row
    const { error: memberErr } = await supabase
      .from('project_team_members')
      .insert({
        project_id: app.project_id,
        user_id: app.applicant_id,
        role_id: app.role_id,
        role_name: app.role_interest || 'Team Member',
        added_by: project.created_by
      });

    if (memberErr) throw memberErr;

    // 5. Update team size and check if team is full
    const newTeamSize = project.current_team_size + 1;
    const newStatus = newTeamSize >= project.max_team_size ? 'team_full' : project.status;

    await supabase
      .from('project_posts')
      .update({
        current_team_size: newTeamSize,
        status: newStatus
      })
      .eq('id', app.project_id);

  } else {
    // Action: rejected
    const { error: rejectErr } = await supabase
      .from('project_applications')
      .update({
        status: 'rejected',
        owner_response: ownerResponse || 'Thank you for your interest. We selected other applicants for this project.',
        reviewed_by: project.created_by,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (rejectErr) throw rejectErr;
  }
}

/**
 * Fetch all roster members for a project.
 */
export async function getProjectTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
  const { data, error } = await supabase
    .from('project_team_members')
    .select(`
      *,
      profile:profiles!project_team_members_user_id_fkey(
        full_name,
        department,
        year_of_study
      )
    `)
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return (data || []) as ProjectTeamMember[];
}

/**
 * Member voluntarily leaves project.
 */
export async function leaveProject(projectId: string, userId: string, reason: string): Promise<void> {
  // Check membership exists
  const { data: member, error: findErr } = await supabase
    .from('project_team_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .is('left_at', null)
    .single();

  if (findErr || !member) throw new Error('Active membership not found.');

  // Check if owner is trying to leave
  const { data: project } = await supabase
    .from('project_posts')
    .select('created_by, current_team_size, status')
    .eq('id', projectId)
    .single();

  if (project?.created_by === userId) {
    throw new Error('Project owners cannot leave their own projects. Archive or complete the project instead.');
  }

  // Update membership status
  const { error: updateErr } = await supabase
    .from('project_team_members')
    .update({
      left_at: new Date().toISOString(),
      leave_reason: reason || 'Left the team.'
    })
    .eq('id', member.id);

  if (updateErr) throw updateErr;

  // Decrement current_team_size and unlock status if it was full
  const newSize = Math.max(1, (project?.current_team_size || 2) - 1);
  const newStatus = project?.status === 'team_full' ? 'recruiting' : project?.status;

  await supabase
    .from('project_posts')
    .update({
      current_team_size: newSize,
      status: newStatus
    })
    .eq('id', projectId);

  // Decrement role spots if needed
  if (member.role_id) {
    const { data: role } = await supabase
      .from('project_roles')
      .select('slots_filled')
      .eq('id', member.role_id)
      .single();

    if (role && role.slots_filled > 0) {
      await supabase
        .from('project_roles')
        .update({ slots_filled: role.slots_filled - 1 })
        .eq('id', member.role_id);
    }
  }
}

/**
 * Project Owner removes/kicks a team member.
 */
export async function removeProjectMember(
  projectId: string,
  userId: string,
  removedByUserId: string,
  reason: string
): Promise<void> {
  if (userId === removedByUserId) {
    throw new Error('You cannot remove yourself. Use leave study group action instead.');
  }

  // Check membership exists
  const { data: member, error: findErr } = await supabase
    .from('project_team_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .is('left_at', null)
    .single();

  if (findErr || !member) throw new Error('Active membership not found.');

  // Update membership status
  const { error: updateErr } = await supabase
    .from('project_team_members')
    .update({
      left_at: new Date().toISOString(),
      leave_reason: reason || 'Removed by project owner.',
      removed_by: removedByUserId
    })
    .eq('id', member.id);

  if (updateErr) throw updateErr;

  // Decrement current_team_size
  const { data: project } = await supabase
    .from('project_posts')
    .select('current_team_size, status')
    .eq('id', projectId)
    .single();

  const newSize = Math.max(1, (project?.current_team_size || 2) - 1);
  const newStatus = project?.status === 'team_full' ? 'recruiting' : project?.status;

  await supabase
    .from('project_posts')
    .update({
      current_team_size: newSize,
      status: newStatus
    })
    .eq('id', projectId);

  // Decrement role spots if needed
  if (member.role_id) {
    const { data: role } = await supabase
      .from('project_roles')
      .select('slots_filled')
      .eq('id', member.role_id)
      .single();

    if (role && role.slots_filled > 0) {
      await supabase
        .from('project_roles')
        .update({ slots_filled: role.slots_filled - 1 })
        .eq('id', member.role_id);
    }
  }
}
