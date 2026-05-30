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
 * Fetch all active roster members for a project (left_at IS NULL).
 */
export async function getActiveProjectMembers(projectId: string): Promise<ProjectTeamMember[]> {
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
    .is('left_at', null)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return (data || []) as ProjectTeamMember[];
}

/**
 * Returns active team count.
 */
export async function deriveActiveTeamSize(projectId: string): Promise<number> {
  const { count, error } = await supabase
    .from('project_team_members')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('left_at', null);

  if (error) throw error;
  return Math.max(1, count || 1);
}

/**
 * Synchronizes the cached metrics inside project_posts and project_roles with active team memberships.
 */
export async function syncProjectTeamMetrics(projectId: string): Promise<void> {
  try {
    // 1. Fetch active team members
    const { data: activeMembers, error: membersErr } = await supabase
      .from('project_team_members')
      .select('id, role_id, user_id')
      .eq('project_id', projectId)
      .is('left_at', null);

    if (membersErr) throw membersErr;
    const activeCount = Math.max(1, activeMembers ? activeMembers.length : 1);

    // 2. Fetch project details
    const { data: project, error: projErr } = await supabase
      .from('project_posts')
      .select('status, max_team_size')
      .eq('id', projectId)
      .single();

    if (projErr) throw projErr;

    // Determine status
    let newStatus = project.status;
    if (activeCount >= project.max_team_size) {
      newStatus = 'team_full';
    } else if (activeCount < project.max_team_size && project.status === 'team_full') {
      newStatus = 'recruiting';
    }

    // 3. Update project_posts
    const { error: updateProjErr } = await supabase
      .from('project_posts')
      .update({
        current_team_size: activeCount,
        status: newStatus
      })
      .eq('id', projectId);

    if (updateProjErr) throw updateProjErr;

    // 4. Fetch roles
    const { data: roles, error: rolesErr } = await supabase
      .from('project_roles')
      .select('id')
      .eq('project_id', projectId);

    if (rolesErr) throw rolesErr;

    // 5. Update slots_filled for each role
    if (roles && roles.length > 0) {
      for (const role of roles) {
        const roleFilled = activeMembers ? activeMembers.filter(m => m.role_id === role.id).length : 0;
        await supabase
          .from('project_roles')
          .update({ slots_filled: roleFilled })
          .eq('id', role.id);
      }
    }
  } catch (err) {
    console.error(`[ProjectMate] syncProjectTeamMetrics failed for ${projectId}:`, err);
  }
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

  // Fetch all active team members in bulk to overwrite current_team_size and slots_filled
  const { data: allActiveMembers, error: activeMembersError } = await supabase
    .from('project_team_members')
    .select('id, project_id, role_id, user_id')
    .is('left_at', null);

  if (activeMembersError) throw activeMembersError;

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
    const projectActiveMembers = (allActiveMembers || []).filter(m => m.project_id === post.id);
    const activeCount = Math.max(1, projectActiveMembers.length);

    const projectRoles = (allRoles || []).filter(r => r.project_id === post.id).map(role => {
      const roleActive = projectActiveMembers.filter(m => m.role_id === role.id).length;
      return {
        ...role,
        slots_filled: roleActive,
        live_slots_filled: roleActive
      };
    });

    const isOwner = currentUserId === post.created_by;
    const myApp = myApplications.find(a => a.project_id === post.id);
    const isMember = isOwner || myMemberships.some(m => m.project_id === post.id);

    // Enforce private collaboration fields gating
    const cleanPost = { 
      ...post,
      current_team_size: activeCount
    };
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

  // Fetch all active team members for this project
  const { data: allActiveMembers, error: activeMembersError } = await supabase
    .from('project_team_members')
    .select('id, role_id, user_id')
    .eq('project_id', projectId)
    .is('left_at', null);

  if (activeMembersError) throw activeMembersError;
  const activeCount = Math.max(1, allActiveMembers ? allActiveMembers.length : 1);

  // Roles
  const { data: roles } = await supabase
    .from('project_roles')
    .select('*')
    .eq('project_id', projectId);

  const cleanRoles = (roles || []).map(role => {
    const roleActive = allActiveMembers ? allActiveMembers.filter(m => m.role_id === role.id).length : 0;
    return {
      ...role,
      slots_filled: roleActive,
      live_slots_filled: roleActive
    };
  });

  // Application
  const { data: apps } = await supabase
    .from('project_applications')
    .select('id, status')
    .eq('project_id', projectId)
    .eq('applicant_id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(1);

  const myApp = apps && apps.length > 0 ? apps[0] : null;

  const isOwner = currentUserId === post.created_by;
  const isMember = isOwner || (allActiveMembers && allActiveMembers.some(m => m.user_id === currentUserId));

  // Enforce private collaboration fields gating
  const cleanPost = { 
    ...post,
    current_team_size: activeCount
  };
  if (!isOwner && !isMember) {
    cleanPost.coordination_link = null;
    cleanPost.github_repo_url = null;
    cleanPost.shared_doc_url = null;
    cleanPost.private_notes = null;
  }

  const match = calculateProjectMatchScore(cleanPost, cleanRoles, userProfile);

  return {
    ...cleanPost,
    roles: cleanRoles,
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
  owner_role_type?: 'project_lead_only' | 'role_index' | 'other';
  owner_role_index?: number;
  owner_custom_role?: string;
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

  // Insert roles if provided, and get generated IDs
  let insertedRoles: any[] = [];
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

    const { data: rolesData, error: rolesError } = await supabase
      .from('project_roles')
      .insert(rolesPayload)
      .select();

    if (rolesError) throw rolesError;
    insertedRoles = rolesData || [];
  }

  // Determine owner's dynamic reserved role
  let ownerRoleName = 'Project Lead';
  let ownerRoleId: string | null = null;

  if (input.owner_role_type === 'other') {
    ownerRoleName = input.owner_custom_role || 'Project Lead';
  } else if (input.owner_role_type === 'role_index' && typeof input.owner_role_index === 'number') {
    const matchingRole = insertedRoles[input.owner_role_index];
    if (matchingRole) {
      ownerRoleName = matchingRole.role_name;
      ownerRoleId = matchingRole.id;
    }
  }

  // Owner bootstrap membership
  const { error: memberError } = await supabase
    .from('project_team_members')
    .insert({
      project_id: project.id,
      user_id: input.created_by,
      role_id: ownerRoleId,
      role_name: ownerRoleName,
      added_by: input.created_by
    });

  if (memberError) throw memberError;

  // Sync metrics (owner is now registered in the dynamic slot, sync will calculate correct staffing counts!)
  await syncProjectTeamMetrics(project.id);

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

  // Check if applicant is already an active member of the project team
  const { data: activeMember } = await supabase
    .from('project_team_members')
    .select('id')
    .eq('project_id', input.project_id)
    .eq('user_id', input.applicant_id)
    .is('left_at', null)
    .maybeSingle();

  if (activeMember) {
    throw new Error('You are already an active team member of this project.');
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
    // 0. Duplicate Membership Guard
    const { data: existingActiveMember, error: activeCheckErr } = await supabase
      .from('project_team_members')
      .select('id')
      .eq('project_id', app.project_id)
      .eq('user_id', app.applicant_id)
      .is('left_at', null)
      .maybeSingle();

    if (activeCheckErr) throw activeCheckErr;
    if (existingActiveMember) {
      // User is already active. Just update application status to accepted.
      const { error: updateAppErr } = await supabase
        .from('project_applications')
        .update({
          status: 'accepted',
          owner_response: ownerResponse || 'Approved by project owner (already in team).',
          reviewed_by: project.created_by,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateAppErr) throw updateAppErr;
      
      await syncProjectTeamMetrics(app.project_id);
      return;
    }

    // Fetch live active roster members to make sure we don't exceed max capacity
    const activeCount = await deriveActiveTeamSize(app.project_id);

    // 1. Check capacity
    if (activeCount >= project.max_team_size) {
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
        const liveRoleFilled = role.slots_filled; // Overwritten live by sync if stale
        if (liveRoleFilled >= role.slots_needed) {
          throw new Error(`Cannot accept: The selected role "${role.role_name}" is already fully staffed.`);
        }
        await supabase
          .from('project_roles')
          .update({ slots_filled: liveRoleFilled + 1 })
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

    // 5. Update team size and sync project team metrics
    await syncProjectTeamMetrics(app.project_id);

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
 * Fetch all active roster members for a project (left_at IS NULL).
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
    .is('left_at', null)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return (data || []) as ProjectTeamMember[];
}

/**
 * Fetch all past roster members for a project (left_at IS NOT NULL).
 */
export async function getProjectPastTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
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
    .not('left_at', 'is', null)
    .order('left_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ProjectTeamMember[];
}


/**
 * Member voluntarily leaves project.
 */
export async function leaveProject(projectId: string, userId: string, reason: string): Promise<void> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const effectiveUserId = authUser ? authUser.id : userId;

  // Check membership exists
  const { data: member, error: findErr } = await supabase
    .from('project_team_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', effectiveUserId)
    .is('left_at', null)
    .maybeSingle();

  if (findErr || !member) throw new Error('Active membership not found.');

  // Check if owner is trying to leave
  const { data: project } = await supabase
    .from('project_posts')
    .select('created_by')
    .eq('id', projectId)
    .single();

  if (project?.created_by === effectiveUserId) {
    throw new Error('Project owner cannot leave their own project. Archive the project or transfer ownership later.');
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

  // Sync team count, role slots, and status
  await syncProjectTeamMetrics(projectId);
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
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const effectiveRemovedBy = authUser ? authUser.id : removedByUserId;

  if (userId === effectiveRemovedBy) {
    throw new Error('You cannot remove yourself. Use leave project action instead.');
  }

  // Fetch project details to check owner
  const { data: project } = await supabase
    .from('project_posts')
    .select('created_by')
    .eq('id', projectId)
    .single();

  if (project?.created_by !== effectiveRemovedBy) {
    throw new Error('Only the project owner can remove team members.');
  }

  // Check membership exists
  const { data: member, error: findErr } = await supabase
    .from('project_team_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  if (findErr || !member) throw new Error('Active membership not found.');

  // Update membership status
  const { error: updateErr } = await supabase
    .from('project_team_members')
    .update({
      left_at: new Date().toISOString(),
      leave_reason: reason || 'Removed by project owner.',
      removed_by: effectiveRemovedBy
    })
    .eq('id', member.id);

  if (updateErr) throw updateErr;

  // Sync team count, role slots, and status
  await syncProjectTeamMetrics(projectId);
}

/**
 * Fetch discussion posts for a project.
 */
export async function getProjectDiscussionPosts(
  projectId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('project_discussion_posts')
    .select(`
      *,
      author_profile:profiles!project_discussion_posts_created_by_fkey(full_name)
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  const postsWithCounts = await Promise.all((data || []).map(async (post: any) => {
    const { count: repliesCount } = await supabase
      .from('project_discussion_replies')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id)
      .is('deleted_at', null);

    const { count: helpfulCount } = await supabase
      .from('project_discussion_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id)
      .eq('reaction_type', 'helpful');

    const { data: { user } } = await supabase.auth.getUser();
    let reactedByMe = false;
    if (user) {
      const { data: reaction } = await supabase
        .from('project_discussion_reactions')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .eq('reaction_type', 'helpful')
        .maybeSingle();
      reactedByMe = !!reaction;
    }

    return {
      ...post,
      replies_count: repliesCount || 0,
      helpful_count: helpfulCount || 0,
      reacted_by_me: reactedByMe
    };
  }));

  return postsWithCounts;
}

/**
 * Create a new project discussion post.
 */
export async function createProjectDiscussionPost(input: {
  project_id: string;
  created_by: string;
  title: string;
  body: string;
  post_type: 'update' | 'question' | 'announcement' | 'task';
  tags?: string[];
}): Promise<any> {
  if (input.title.length < 5) throw new Error('Post title must be at least 5 characters.');
  if (input.body.length < 10) throw new Error('Post body must be at least 10 characters.');

  const { data, error } = await supabase
    .from('project_discussion_posts')
    .insert({
      project_id: input.project_id,
      created_by: input.created_by,
      title: input.title,
      body: input.body,
      post_type: input.post_type,
      tags: input.tags || []
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing discussion post.
 */
export async function updateProjectDiscussionPost(
  postId: string,
  input: { title: string; body: string; post_type?: any; tags?: string[]; is_pinned?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('project_discussion_posts')
    .update({
      ...input,
      edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', postId);

  if (error) throw error;
}

/**
 * Soft delete a discussion post.
 */
export async function softDeleteProjectDiscussionPost(postId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { error } = await supabase
    .from('project_discussion_posts')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id
    })
    .eq('id', postId);

  if (error) throw error;
}

/**
 * Fetch replies for a post.
 */
export async function getProjectDiscussionReplies(postId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('project_discussion_replies')
    .select(`
      *,
      author_profile:profiles!project_discussion_replies_created_by_fkey(full_name)
    `)
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const repliesWithReactions = await Promise.all((data || []).map(async (reply: any) => {
    const { count: helpfulCount } = await supabase
      .from('project_discussion_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('reply_id', reply.id)
      .eq('reaction_type', 'helpful');

    const { data: { user } } = await supabase.auth.getUser();
    let reactedByMe = false;
    if (user) {
      const { data: reaction } = await supabase
        .from('project_discussion_reactions')
        .select('id')
        .eq('reply_id', reply.id)
        .eq('user_id', user.id)
        .eq('reaction_type', 'helpful')
        .maybeSingle();
      reactedByMe = !!reaction;
    }

    return {
      ...reply,
      helpful_count: helpfulCount || 0,
      reacted_by_me: reactedByMe
    };
  }));

  return repliesWithReactions;
}

/**
 * Add a reply/comment to a discussion post.
 */
export async function addProjectDiscussionReply(
  postId: string,
  projectId: string,
  body: string
): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  if (body.length < 2) throw new Error('Comment must be at least 2 characters.');

  const { data, error } = await supabase
    .from('project_discussion_replies')
    .insert({
      post_id: postId,
      project_id: projectId,
      created_by: user.id,
      body: body
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft delete a reply.
 */
export async function softDeleteProjectDiscussionReply(replyId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { error } = await supabase
    .from('project_discussion_replies')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id
    })
    .eq('id', replyId);

  if (error) throw error;
}

/**
 * Toggle a reaction on a post or reply.
 */
export async function toggleProjectDiscussionHelpful(input: {
  postId?: string;
  replyId?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  if (input.postId) {
    const { data: existing } = await supabase
      .from('project_discussion_reactions')
      .select('id')
      .eq('post_id', input.postId)
      .eq('user_id', user.id)
      .eq('reaction_type', 'helpful')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('project_discussion_reactions')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('project_discussion_reactions')
        .insert({
          post_id: input.postId,
          user_id: user.id,
          reaction_type: 'helpful'
        });
      if (error) throw error;
    }
  } else if (input.replyId) {
    const { data: existing } = await supabase
      .from('project_discussion_reactions')
      .select('id')
      .eq('reply_id', input.replyId)
      .eq('user_id', user.id)
      .eq('reaction_type', 'helpful')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('project_discussion_reactions')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('project_discussion_reactions')
        .insert({
          reply_id: input.replyId,
          user_id: user.id,
          reaction_type: 'helpful'
        });
      if (error) throw error;
    }
  }
}

/**
 * Toggle helpful reaction for a resource. Strict one-helpful-reaction-per-user model.
 */
export async function toggleProjectResourceHelpful(
  resourceId: string
): Promise<{ reacted_by_me: boolean; helpful_count: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  // Check if reaction already exists for this user
  const { data: existing, error: findErr } = await supabase
    .from('project_resource_reactions')
    .select('id')
    .eq('resource_id', resourceId)
    .eq('user_id', user.id)
    .eq('reaction_type', 'helpful')
    .maybeSingle();

  if (findErr) throw findErr;

  let reactedByMe = false;
  if (existing) {
    // Delete reaction (trigger will decrement helpful_count)
    const { error: delErr } = await supabase
      .from('project_resource_reactions')
      .delete()
      .eq('id', existing.id);
    if (delErr) throw delErr;
    reactedByMe = false;
  } else {
    // Insert reaction (trigger will increment helpful_count)
    const { error: insErr } = await supabase
      .from('project_resource_reactions')
      .insert({
        resource_id: resourceId,
        user_id: user.id,
        reaction_type: 'helpful'
      });
    if (insErr) throw insErr;
    reactedByMe = true;
  }

  // Fetch updated count from database cache
  const { data: res, error: resErr } = await supabase
    .from('project_resources')
    .select('helpful_count')
    .eq('id', resourceId)
    .single();

  if (resErr) throw resErr;

  return {
    reacted_by_me: reactedByMe,
    helpful_count: res?.helpful_count ?? 0
  };
}
/**
 * Add verified resource link.
 */
export async function addProjectResource(input: {
  project_id: string;
  title: string;
  description?: string;
  resource_type: 'link' | 'pdf' | 'document' | 'presentation' | 'notes' | 'image' | 'dataset' | 'code_repo' | 'folder' | 'other';
  url?: string;
  file_path?: string;
  file_name?: string;
  file_mime_type?: string;
  file_size_bytes?: number;
  storage_bucket?: string;
}): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  if (input.title.length < 3) throw new Error('Title must be at least 3 characters.');
  
  const isLinkMode = input.resource_type === 'link' || input.resource_type === 'code_repo' || input.resource_type === 'folder';
  if (isLinkMode && (!input.url || !input.url.startsWith('https://'))) {
    throw new Error('Verified link resources must strictly use the https:// protocol.');
  }

  const { data: project } = await supabase
    .from('project_posts')
    .select('created_by')
    .eq('id', input.project_id)
    .single();

  const isOwner = project?.created_by === user.id;
  const status = isOwner ? 'verified' : 'pending_verification';

  const { data, error } = await supabase
    .from('project_resources')
    .insert({
      project_id: input.project_id,
      uploaded_by: user.id,
      title: input.title,
      description: input.description || null,
      resource_type: input.resource_type,
      url: input.url || null,
      file_path: input.file_path || null,
      file_name: input.file_name || null,
      file_mime_type: input.file_mime_type || null,
      file_size_bytes: input.file_size_bytes || null,
      storage_bucket: input.storage_bucket || null,
      verification_status: status,
      verified_by: isOwner ? user.id : null,
      verified_at: isOwner ? new Date().toISOString() : null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get resources.
 */
export async function getProjectResources(projectId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('project_resources')
    .select(`
      *,
      uploader_profile:profiles!project_resources_uploaded_by_fkey(full_name)
    `)
    .eq('project_id', projectId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  // Map reacted_by_me boolean flag based on database reaction rows for the logged in user
  const { data: authData } = await supabase.auth.getUser();
  let reactedResourceIds: string[] = [];
  if (authData?.user?.id) {
    const { data: reactions } = await supabase
      .from('project_resource_reactions')
      .select('resource_id')
      .eq('user_id', authData.user.id);
    reactedResourceIds = (reactions || []).map(r => r.resource_id);
  }

  return data.map((res: any) => ({
    ...res,
    reacted_by_me: reactedResourceIds.includes(res.id)
  }));
}

/**
 * Get pending verification resources.
 */
export async function getProjectResourceVerificationQueue(projectId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('project_resources')
    .select(`
      *,
      uploader_profile:profiles!project_resources_uploaded_by_fkey(full_name)
    `)
    .eq('project_id', projectId)
    .eq('verification_status', 'pending_verification')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Verify a resource.
 */
export async function verifyProjectResource(resourceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { error } = await supabase
    .from('project_resources')
    .update({
      verification_status: 'verified',
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null
    })
    .eq('id', resourceId);

  if (error) throw error;
}

/**
 * Reject a resource.
 */
export async function rejectProjectResource(resourceId: string, reason: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  if (!reason || reason.trim().length < 5) {
    throw new Error('Please provide a specific rejection reason (at least 5 characters).');
  }

  const { error } = await supabase
    .from('project_resources')
    .update({
      verification_status: 'rejected',
      rejected_by: user.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason
    })
    .eq('id', resourceId);

  if (error) throw error;
}

/**
 * Pin or unpin a resource.
 */
export async function pinProjectResource(resourceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { data: resource } = await supabase
    .from('project_resources')
    .select('is_pinned')
    .eq('id', resourceId)
    .single();

  if (!resource) throw new Error('Resource not found.');

  const { error } = await supabase
    .from('project_resources')
    .update({
      is_pinned: !resource.is_pinned,
      pinned_by: !resource.is_pinned ? user.id : null,
      pinned_at: !resource.is_pinned ? new Date().toISOString() : null
    })
    .eq('id', resourceId);

  if (error) throw error;
}

/**
 * Delete a resource. Uploader or project owner only (RLS enforced).
 */
export async function deleteProjectResource(resourceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  try {
    // 1. Fetch metadata row to inspect uploader, project ID, and status
    const { data: resource, error: fetchErr } = await supabase
      .from('project_resources')
      .select('project_id, uploaded_by, verification_status, file_path, storage_bucket')
      .eq('id', resourceId)
      .single();

    if (fetchErr || !resource) throw new Error('Resource not found.');

    // Fetch project owner ID to verify permissions
    const { data: project } = await supabase
      .from('project_posts')
      .select('created_by')
      .eq('id', resource.project_id)
      .single();

    const isOwner = project?.created_by === user.id;
    const isUploader = resource.uploaded_by === user.id;

    if (!isOwner && !isUploader) {
      throw new Error('Only the uploader of the resource or the project owner can delete this material.');
    }

    if (!isOwner && isUploader && resource.verification_status === 'verified') {
      throw new Error('You cannot remove a verified resource once approved. Please contact the project lead.');
    }

    // 2. Delete row from database
    const { error: dbErr } = await supabase
      .from('project_resources')
      .delete()
      .eq('id', resourceId);

    if (dbErr) throw dbErr;

    // 3. If file exists in storage, delete it
    if (resource.file_path && resource.storage_bucket) {
      const { error: storageErr } = await supabase.storage
        .from(resource.storage_bucket)
        .remove([resource.file_path]);

      if (storageErr) {
        console.error('[deleteProjectResource] storage file remove failed:', storageErr);
      }
    }
  } catch (err) {
    console.error('deleteProjectResource error:', err);
    throw err;
  }
}

export interface UploadProjectResourceFileInput {
  projectId: string;
  file: File;
  resourceId: string;
}

export interface UploadProjectResourceFileResult {
  file_path: string;
  file_name: string;
  file_mime_type: string;
  file_size_bytes: number;
  storage_bucket: string;
}

/**
 * Upload a study resource file to Supabase Storage private bucket.
 */
export const uploadProjectResourceFile = async (
  input: UploadProjectResourceFileInput
): Promise<UploadProjectResourceFileResult> => {
  const { projectId, file, resourceId } = input;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.id) {
    throw new Error('Please sign in again before uploading files.');
  }

  // Allowed file types check (Allowed: PDF, DOC, DOCX, PPT, PPTX, TXT, MD, PNG, JPG, JPEG, WEBP, CSV, JSON)
  const allowedMimeTypes = [
    'application/pdf',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'text/csv',
    'application/json',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error('Unsupported file type. Only PDFs, text files, images, datasets, and standard office documents are allowed.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size exceeds the 10 MB limit.');
  }

  // Sanitize filename
  const extIndex = file.name.lastIndexOf('.');
  const ext = extIndex !== -1 ? file.name.substring(extIndex) : '';
  const baseName = extIndex !== -1 ? file.name.substring(0, extIndex) : file.name;
  const cleanBase = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const safeFileName = `${cleanBase}${ext}`;

  // Storage path: project-mates/{projectId}/{resourceId}/{safeFileName}
  const filePath = `project-mates/${projectId}/${resourceId}/${safeFileName}`;

  const { error: uploadErr } = await supabase.storage
    .from('project-resources')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadErr) {
    console.error('[uploadProjectResourceFile] upload failed:', uploadErr);
    throw new Error(uploadErr.message || 'Could not upload file.');
  }

  return {
    file_path: filePath,
    file_name: file.name,
    file_mime_type: file.type,
    file_size_bytes: file.size,
    storage_bucket: 'project-resources'
  };
};

/**
 * Create a short-lived (5 minutes) signed URL for viewing/downloading a file resource.
 * Only works if user is authorized under Storage RLS policies.
 */
export const getSignedProjectResourceUrl = async (
  bucket: string,
  path: string
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 300); // 300 seconds = 5 minutes

  if (error) {
    console.error('[getSignedProjectResourceUrl] failed:', error);
    throw new Error(error.message || 'Could not generate preview link.');
  }

  return data.signedUrl;
};



// ============================================================
// PHASE 6.3C: Role Management After Project Creation
// ============================================================


// ============================================================
// PHASE 6.3C: Role Management After Project Creation
// ============================================================

/**
 * Add a new role to an existing project (Team Lead only).
 */
export async function addProjectRole(input: {
  project_id: string;
  role_name: string;
  description?: string;
  required_skills: string[];
  slots_needed: number;
  priority: 'low' | 'medium' | 'high';
}): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  if (input.role_name.trim().length < 2) throw new Error('Role name must be at least 2 characters.');
  if (input.slots_needed < 1 || input.slots_needed > 10) throw new Error('Slots needed must be between 1 and 10.');

  const { data: project, error: projErr } = await supabase
    .from('project_posts')
    .select('created_by')
    .eq('id', input.project_id)
    .single();

  if (projErr || !project) throw new Error('Project not found.');
  if (project.created_by !== user.id) throw new Error('Only the project Team Lead can add roles.');

  const { data, error } = await supabase
    .from('project_roles')
    .insert({
      project_id: input.project_id,
      role_name: input.role_name.trim(),
      description: input.description?.trim() || null,
      required_skills: input.required_skills,
      slots_needed: input.slots_needed,
      slots_filled: 0,
      priority: input.priority
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing project role (Team Lead only).
 * Cannot reduce slots_needed below currently filled count.
 */
export async function updateProjectRole(
  roleId: string,
  input: {
    role_name: string;
    description?: string;
    required_skills: string[];
    slots_needed: number;
    priority: 'low' | 'medium' | 'high';
  }
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  if (input.role_name.trim().length < 2) throw new Error('Role name must be at least 2 characters.');
  if (input.slots_needed < 1 || input.slots_needed > 10) throw new Error('Slots needed must be between 1 and 10.');

  const { data: role, error: roleErr } = await supabase
    .from('project_roles')
    .select('slots_filled, project_id')
    .eq('id', roleId)
    .single();

  if (roleErr || !role) throw new Error('Role not found.');

  const { data: project, error: pErr } = await supabase
    .from('project_posts')
    .select('created_by')
    .eq('id', role.project_id)
    .single();

  if (pErr || !project) throw new Error('Project not found.');
  if (project.created_by !== user.id) throw new Error('Only the project Team Lead can edit roles.');

  const currentFilled = role.slots_filled || 0;
  if (input.slots_needed < currentFilled) {
    throw new Error(`Cannot reduce slots below the currently filled count (${currentFilled} member(s) in this role).`);
  }

  const { error } = await supabase
    .from('project_roles')
    .update({
      role_name: input.role_name.trim(),
      description: input.description?.trim() || null,
      required_skills: input.required_skills,
      slots_needed: input.slots_needed,
      priority: input.priority
    })
    .eq('id', roleId);

  if (error) throw error;
}

/**
 * Delete a project role (Team Lead only). Blocked if role has active members.
 */
export async function deleteProjectRole(roleId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { data: role, error: roleErr } = await supabase
    .from('project_roles')
    .select('slots_filled, project_id')
    .eq('id', roleId)
    .single();

  if (roleErr || !role) throw new Error('Role not found.');

  const { data: project, error: pErr } = await supabase
    .from('project_posts')
    .select('created_by')
    .eq('id', role.project_id)
    .single();

  if (pErr || !project) throw new Error('Project not found.');
  if (project.created_by !== user.id) throw new Error('Only the project Team Lead can delete roles.');

  const { count: activeMemberCount, error: countErr } = await supabase
    .from('project_team_members')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', roleId)
    .is('left_at', null);

  if (countErr) throw countErr;
  if ((activeMemberCount || 0) > 0) {
    throw new Error('This role has active members. Reassign or remove members before deleting this role.');
  }

  const { error } = await supabase
    .from('project_roles')
    .delete()
    .eq('id', roleId);

  if (error) throw error;
}

// ============================================================
// PHASE 6.3C: Project Lifecycle Controls
// ============================================================

/**
 * Archive a project (Team Lead only). Sets status to archived. Preserves all history.
 */
export async function archiveProject(projectId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { data: project, error: projErr } = await supabase
    .from('project_posts')
    .select('created_by')
    .eq('id', projectId)
    .single();

  if (projErr || !project) throw new Error('Project not found.');
  if (project.created_by !== user.id) throw new Error('Only the project Team Lead can archive this project.');

  const { error } = await supabase
    .from('project_posts')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString()
    })
    .eq('id', projectId);

  if (error) throw error;
}

/**
 * Mark a project as completed (Team Lead only).
 */
export async function completeProject(projectId: string, summaryText?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { data: project, error: projErr } = await supabase
    .from('project_posts')
    .select('created_by')
    .eq('id', projectId)
    .single();

  if (projErr || !project) throw new Error('Project not found.');
  if (project.created_by !== user.id) throw new Error('Only the project Team Lead can mark a project completed.');

  const { error } = await supabase
    .from('project_posts')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_summary: summaryText?.trim() || null
    })
    .eq('id', projectId);

  if (error) throw error;
}

/**
 * Restore an archived, completed, or paused project (Team Lead only).
 */
export async function restoreProject(
  projectId: string,
  toStatus: 'recruiting' | 'in_progress'
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { data: project, error: projErr } = await supabase
    .from('project_posts')
    .select('created_by, status')
    .eq('id', projectId)
    .single();

  if (projErr || !project) throw new Error('Project not found.');
  if (project.created_by !== user.id) throw new Error('Only the project Team Lead can restore this project.');

  if (!['archived', 'completed', 'paused'].includes(project.status)) {
    throw new Error('Only archived, completed, or paused projects can be restored.');
  }

  const { error } = await supabase
    .from('project_posts')
    .update({
      status: toStatus,
      archived_at: null
    })
    .eq('id', projectId);

  if (error) throw error;
}

/**
 * Pause a project (Team Lead only).
 */
export async function pauseProject(projectId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { data: project, error: projErr } = await supabase
    .from('project_posts')
    .select('created_by')
    .eq('id', projectId)
    .single();

  if (projErr || !project) throw new Error('Project not found.');
  if (project.created_by !== user.id) throw new Error('Only the project Team Lead can pause this project.');

  const { error } = await supabase
    .from('project_posts')
    .update({ status: 'paused' })
    .eq('id', projectId);

  if (error) throw error;
}

/**
 * Mark a project as in_progress / running (Team Lead only).
 */
export async function markProjectRunning(projectId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { data: project, error: projErr } = await supabase
    .from('project_posts')
    .select('created_by')
    .eq('id', projectId)
    .single();

  if (projErr || !project) throw new Error('Project not found.');
  if (project.created_by !== user.id) throw new Error('Only the project Team Lead can update this project.');

  const { error } = await supabase
    .from('project_posts')
    .update({ status: 'in_progress' })
    .eq('id', projectId);

  if (error) throw error;
}
