import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getCurrentProfile } from '../lib/profiles';
import { DEPARTMENTS } from '../lib/departments';
import { PublicProfileModal } from '../components/profile/PublicProfileModal';
import { supabase } from '../lib/supabase';
import type {
  ProjectRole,
  ProjectApplicationWithProfile,
  ProjectTeamMember,
  ProjectWithStats,
  ProjectDifficulty,
  ProjectWorkMode,
  ProjectRolePriority,
  ProjectTask
} from '../types';
import {
  getProjectPosts,
  getProjectById,
  createProjectPost,
  updateProjectPost,
  applyToProject,
  withdrawApplication,
  getMyApplications,
  getProjectApplications,
  respondToProjectApplication,
  getProjectTeamMembers,
  getProjectPastTeamMembers,
  leaveProject,
  removeProjectMember,
  getProjectDiscussionPosts,
  createProjectDiscussionPost,
  updateProjectDiscussionPost,
  softDeleteProjectDiscussionPost,
  getProjectDiscussionReplies,
  addProjectDiscussionReply,
  softDeleteProjectDiscussionReply,
  toggleProjectDiscussionHelpful,
  addProjectResource,
  getProjectResources,
  getProjectResourceVerificationQueue,
  verifyProjectResource,
  rejectProjectResource,
  pinProjectResource,
  deleteProjectResource,
  syncProjectTeamMetrics,
  uploadProjectResourceFile,
  getSignedProjectResourceUrl,
  toggleProjectResourceHelpful,
  // Phase 6.3C: Role management
  addProjectRole,
  updateProjectRole,
  deleteProjectRole,
  // Phase 6.3C: Lifecycle controls
  archiveProject,
  completeProject,
  restoreProject,
  pauseProject,
  markProjectRunning,
  // Phase 6.4: Tasks
  getProjectTasks,
  getMyTasks
} from '../lib/projectMates';


import { ProjectTasksTab } from '../components/project-tasks/ProjectTasksTab';

const CATEGORIES = [
  'AI & Machine Learning',
  'Web Development',
  'Mobile App',
  'Data Science',
  'Cybersecurity',
  'IoT / Hardware',
  'UI/UX Design',
  'Research',
  'Hackathon',
  'Open Source',
  'Other'
];

const PROJECT_TYPES = [
  { id: 'Portfolio Project', label: 'Portfolio Project' },
  { id: 'College Project', label: 'College Project' },
  { id: 'Hackathon', label: 'Hackathon' },
  { id: 'Research Project', label: 'Research Project' },
  { id: 'Startup Idea', label: 'Startup Idea' },
  { id: 'Open Source', label: 'Open Source' },
  { id: 'Competition Project', label: 'Competition Project' },
  { id: 'Learning Project', label: 'Learning Project' },
  { id: 'Other', label: 'Other' }
];

export function formatProjectDisplayType(type: string): string {
  if (!type) return '';
  const mapping: Record<string, string> = {
    portfolio_project: 'Portfolio Project',
    hackathon_project: 'Hackathon Project',
    academic_term_project: 'Academic Term Project',
    open_source_contribution: 'Open Source Contribution',
    other: 'Other'
  };
  return mapping[type] || type;
}

const DIFFICULTIES: ProjectDifficulty[] = ['Beginner', 'Intermediate', 'Advanced'];
const WORK_MODES: ProjectWorkMode[] = ['Online', 'Offline', 'Hybrid', 'Campus only'];
const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const ProjectMatePage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const isResourceVideo = (res: any) => {
    if (!res) return false;
    if (res.resource_type === 'video') return true;
    const mime = res.file_mime_type?.toLowerCase() || '';
    const name = res.file_name?.toLowerCase() || '';
    const url = res.url?.toLowerCase() || '';
    const isMimeVideo = mime.startsWith('video/');
    const isExtVideo = name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov') ||
                       url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') ||
                       url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
    return isMimeVideo || isExtVideo;
  };

  // Tab State
  const [activeTab, setActiveTab] = useState<'discover' | 'my_projects' | 'my_applications' | 'workspace'>('discover');

  // Core Data State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<ProjectTask[]>([]);
  const [ownedProjects, setOwnedProjects] = useState<ProjectWithStats[]>([]);

  // Dynamically discover unique categories and project types for filters
  const discoveredCategories = React.useMemo(() => {
    const base = [...CATEGORIES];
    const customs = projects
      .map(p => p.category)
      .filter(cat => cat && cat.trim() !== '' && !base.includes(cat));
    const uniqueCustoms = Array.from(new Set(customs)).sort((a, b) => a.localeCompare(b));
    return [...base, ...uniqueCustoms];
  }, [projects]);

  const discoveredTypes = React.useMemo(() => {
    const defaultLabels = PROJECT_TYPES.map(t => t.label);
    const defaultIds = PROJECT_TYPES.map(t => t.id);
    const customs = projects
      .map(p => formatProjectDisplayType(p.project_type))
      .filter(type => type && type.trim() !== '' && !defaultLabels.includes(type) && !defaultIds.includes(type));
    const uniqueCustoms = Array.from(new Set(customs)).sort((a, b) => a.localeCompare(b));
    
    const defaults = PROJECT_TYPES.map(t => t.label);
    return [...defaults, ...uniqueCustoms];
  }, [projects]);
  
  // Selected Project for Workspace or Manage
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [pastTeamMembers, setPastTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [isPastRosterOpen, setIsPastRosterOpen] = useState(false);
  const [pendingApplicants, setPendingApplicants] = useState<ProjectApplicationWithProfile[]>([]);

  // Modals & Panels State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedRoleForApply, setSelectedRoleForApply] = useState<ProjectRole | null>(null);
  const [applyProjectId, setApplyProjectId] = useState<string | null>(null);
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Profile View Modal
  const [selectedUserIdForProfile, setSelectedUserIdForProfile] = useState<string | null>(null);

  // Workspace Setting Edit States
  const [editStatus, setEditStatus] = useState<string>('recruiting');
  const [editExpectedTimeline, setEditExpectedTimeline] = useState<string>('');
  const [editMeetingPreference, setEditMeetingPreference] = useState<string>('');
  const [editMaxTeamSize, setEditMaxTeamSize] = useState<number>(4);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSummary, setEditSummary] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editProjectType, setEditProjectType] = useState<string>('');
  const [editDifficultyLevel, setEditDifficultyLevel] = useState<ProjectDifficulty>('Beginner');
  const [editWorkMode, setEditWorkMode] = useState<ProjectWorkMode>('Hybrid');
  const [editRequiredSkills, setEditRequiredSkills] = useState<string>('');
  const [editPreferredDepartments, setEditPreferredDepartments] = useState<string[]>([]);
  const [editPreferredYears, setEditPreferredYears] = useState<string[]>([]);
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [editIsBeginnerFriendly, setEditIsBeginnerFriendly] = useState<boolean>(false);
  const [editIsHackathon, setEditIsHackathon] = useState<boolean>(false);

  // Discussion & Resource Paging States
  const [discussionLimit, setDiscussionLimit] = useState(3);
  const [resourcesLimit, setResourcesLimit] = useState(3);

  // Phase 6.3D limits states (all removed in 6.3E)

  // Phase 6.3E local states for teammates filter & search
  const [teammateSearch, setTeammateSearch] = useState('');
  const [teammateRoleFilter, setTeammateRoleFilter] = useState('');

  // Discover Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedWorkMode, setSelectedWorkMode] = useState('');
  const [hasOpenSlotsFilter, setHasOpenSlotsFilter] = useState(false);
  const [isBeginnerFriendlyFilter, setIsBeginnerFriendlyFilter] = useState(false);
  const [isHackathonFilter, setIsHackathonFilter] = useState(false);

  // Create Project Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newType, setNewType] = useState(PROJECT_TYPES[0].id);
  const [newDifficulty, setNewDifficulty] = useState<ProjectDifficulty>('Beginner');
  const [newWorkMode, setNewWorkMode] = useState<ProjectWorkMode>('Hybrid');
  const [newRequiredSkills, setNewRequiredSkills] = useState('');
  const [newPreferredDepartments, setNewPreferredDepartments] = useState<string[]>([]);
  const [newPreferredYears, setNewPreferredYears] = useState<string[]>([]);
  const [newTimeline, setNewTimeline] = useState('');
  const [newMeetingPreference, setNewMeetingPreference] = useState('');
  const [newMaxTeamSize, setNewMaxTeamSize] = useState(4);
  const [newDeadline, setNewDeadline] = useState('');
  const [newBeginnerFriendly, setNewBeginnerFriendly] = useState(false);
  const [newHackathon, setNewHackathon] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [customProjectType, setCustomProjectType] = useState('');
  
  // Create Project Private coordination links
  const [newCoordLink, setNewCoordLink] = useState('');
  const [newGithubUrl, setNewGithubUrl] = useState('');
  const [newSharedDocUrl, setNewSharedDocUrl] = useState('');
  const [newPrivateNotes, setNewPrivateNotes] = useState('');

  // Create Project Roles List Builder
  const [rolesBuilder, setRolesBuilder] = useState<{
    role_name: string;
    description: string;
    required_skills: string;
    slots_needed: number;
    priority: ProjectRolePriority;
  }[]>([
    { role_name: '', description: '', required_skills: '', slots_needed: 1, priority: 'medium' }
  ]);

  // Owner dynamic role reservation states
  const [ownerRoleType, setOwnerRoleType] = useState<'project_lead_only' | 'role_index' | 'other'>('project_lead_only');
  const [ownerRoleIndex, setOwnerRoleIndex] = useState<number>(-1);
  const [ownerCustomRole, setOwnerCustomRole] = useState<string>('');

  // Apply Form State
  const [applyMessage, setApplyMessage] = useState('');
  const [applySkills, setApplySkills] = useState('');
  const [applyExperience, setApplyExperience] = useState('');
  const [applyPortfolioUrl, setApplyPortfolioUrl] = useState('');
  const [applyAvailability, setApplyAvailability] = useState('');
  const [applyExpectedContribution, setApplyExpectedContribution] = useState('');

  // Respond Form State
  const [responseReason, setResponseReason] = useState('');
  const [respondingAppId, setRespondingAppId] = useState<string | null>(null);
  const [respondingAction, setRespondingAction] = useState<'accepted' | 'rejected' | null>(null);

  // Leave / Kick reason state
  const [exitReason, setExitReason] = useState('');
  const [exitingMemberId, setExitingMemberId] = useState<string | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isKickModalOpen, setIsKickModalOpen] = useState(false);

  // Edit project coordinates state
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [editCoordLink, setEditCoordLink] = useState('');
  const [editGithubUrl, setEditGithubUrl] = useState('');
  const [editSharedDocUrl, setEditSharedDocUrl] = useState('');
  const [editPrivateNotes, setEditPrivateNotes] = useState('');

  // Workspace tabs & memberships
  const [workspaceSubTab, setWorkspaceSubTab] = useState<'coordination' | 'discussion' | 'resources' | 'tasks'>('coordination');
  const [userMemberships, setUserMemberships] = useState<any[]>([]);

  // Discussion state
  const [discussionPosts, setDiscussionPosts] = useState<any[]>([]);
  const [selectedPostForReplies, setSelectedPostForReplies] = useState<any | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [newReplyBody, setNewReplyBody] = useState('');
  const [discussionSearchQuery, setDiscussionSearchQuery] = useState('');
  const [discussionTypeFilter, setDiscussionTypeFilter] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [newPostType, setNewPostType] = useState<'update' | 'question' | 'announcement' | 'task'>('update');
  const [newPostTags, setNewPostTags] = useState('');

  // Resource state
  const [resources, setResources] = useState<any[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<any[]>([]);

  // Task state
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  // Removed unused extension state
  const [, setTasksLoading] = useState(false);
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceDesc, setNewResourceDesc] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [rejectionResourceId, setRejectionResourceId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);

  // Upgraded Resource Upload / Preview States
  const [resourceMode, setResourceMode] = useState<'link' | 'file' | 'folder' | 'code_repo'>('link');
  const [resourceType, setResourceType] = useState<string>('link');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewResource, setPreviewResource] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Phase 6.3C: Role Management States
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleSkills, setNewRoleSkills] = useState('');
  const [newRoleSlots, setNewRoleSlots] = useState(1);
  const [newRolePriority, setNewRolePriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Phase 6.3C: Archive/Complete Project States
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState<string | null>(null);
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = useState(false);
  const [projectToComplete, setProjectToComplete] = useState<string | null>(null);
  const [completionSummaryText, setCompletionSummaryText] = useState('');

    // Phase 6.3C: Section collapse states (default collapsed for archived section)
  const [isArchivedSectionCollapsed, setIsArchivedSectionCollapsed] = useState(true);
  const [isCompletedSectionCollapsed, setIsCompletedSectionCollapsed] = useState(true);

  // Phase 6.3C: Show More / Show Fewer states
  const [showMoreCompletedProjects, setShowMoreCompletedProjects] = useState(false);



  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const profile = await getCurrentProfile(user.id);
      setUserProfile(profile);

      const allPosts = await getProjectPosts(user.id, profile);
      setProjects(allPosts);

      const apps = await getMyApplications(user.id);
      setMyApplications(apps);

      const tasks = await getMyTasks(user.id);
      setMyTasks(tasks);

      const owned = allPosts.filter(p => p.is_owner);
      setOwnedProjects(owned);

      const { data: memberships } = await supabase
        .from('project_team_members')
        .select('*')
        .eq('user_id', user.id);
      setUserMemberships(memberships || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Error loading project mates dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load Workspace Detail
  const loadWorkspace = async (projectId: string) => {
    if (!user) return;
    try {
      setIsLoading(true);
      console.log('[ProjectMate] entering workspace for project:', projectId);
      try {
        await syncProjectTeamMetrics(projectId);
      } catch (syncErr) {
        console.error('Failed to sync project team metrics:', syncErr);
      }
      const proj = await getProjectById(projectId, user.id, userProfile);
      setSelectedProject(proj);
      setSelectedProjectId(projectId);
      setIsEditingLinks(false);
      setWorkspaceSubTab('coordination');
      
      let roster: ProjectTeamMember[] = [];
      let pastRoster: ProjectTeamMember[] = [];
      try {
        roster = await getProjectTeamMembers(projectId);
      } catch (rosterErr) {
        console.error('[ProjectMate] Failed to load team members:', rosterErr);
      }
      
      if (proj.is_owner) {
        try {
          pastRoster = await getProjectPastTeamMembers(projectId);
        } catch (pastRosterErr) {
          console.error('[ProjectMate] Failed to load past members:', pastRosterErr);
        }
      }
      
      setTeamMembers(roster || []);
      setPastTeamMembers(pastRoster || []);

      if (proj.is_owner) {
        let apps: ProjectApplicationWithProfile[] = [];
        try {
          apps = await getProjectApplications(projectId);
        } catch (appsErr) {
          console.error('[ProjectMate] Failed to load applications:', appsErr);
        }
        setPendingApplicants((apps || []).filter(a => a.status === 'pending'));
      } else {
        setPendingApplicants([]);
      }

      // Load discussion posts
      try {
        const posts = await getProjectDiscussionPosts(projectId);
        setDiscussionPosts(posts);
      } catch (postErr) {
        console.error('Failed to load discussion posts:', postErr);
      }

      // Load resources
      try {
        const resList = await getProjectResources(projectId);
        setResources(resList);
      } catch (resErr) {
        console.error('Failed to load resources:', resErr);
      }

      // Load verification queue if owner
      if (proj.is_owner) {
        try {
          const queue = await getProjectResourceVerificationQueue(projectId);
          setVerificationQueue(queue);
        } catch (queueErr) {
          console.error('Failed to load verification queue:', queueErr);
        }
      }
      
      // Load tasks
      setTasksLoading(true);
      try {
        const tasks = await getProjectTasks(projectId);
        setProjectTasks(tasks);
      } catch (tasksErr) {
        console.error('Failed to load tasks:', tasksErr);
      } finally {
        setTasksLoading(false);
      }

      setActiveTab('workspace');
    } catch (err: any) {
      console.error('[ProjectMate] workspace load failed:', err);
      toast.error(`Could not open workspace: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset filter variables
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedDifficulty('');
    setSelectedWorkMode('');
    setHasOpenSlotsFilter(false);
    setIsBeginnerFriendlyFilter(false);
    setIsHackathonFilter(false);
    toast.info('Filters cleared');
  };

  // Add Row to Roles Builder
  const handleAddRoleBuilderRow = () => {
    setRolesBuilder([
      ...rolesBuilder,
      { role_name: '', description: '', required_skills: '', slots_needed: 1, priority: 'medium' }
    ]);
  };

  // Remove Row from Roles Builder
  const handleRemoveRoleBuilderRow = (idx: number) => {
    if (rolesBuilder.length <= 1) return;
    setRolesBuilder(rolesBuilder.filter((_, i) => i !== idx));
  };

  // Handle Multi-Select preference arrays
  const togglePreferenceArr = (val: string, current: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (current.includes(val)) {
      setter(current.filter(x => x !== val));
    } else {
      setter([...current, val]);
    }
  };

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    let finalCategory = newCategory;
    if (newCategory === 'Other') {
      if (!customCategory || customCategory.trim().length < 2) {
        toast.error('Custom Category must be at least 2 characters.');
        return;
      }
      finalCategory = customCategory.trim();
    }

    let finalType = newType;
    if (newType === 'Other' || newType === 'other') {
      if (!customProjectType || customProjectType.trim().length < 2) {
        toast.error('Custom Project Type must be at least 2 characters.');
        return;
      }
      finalType = customProjectType.trim();
    }

    setActionLoading(true);
    try {
      if (ownerRoleType === 'role_index' && (ownerRoleIndex === -1 || !rolesBuilder[ownerRoleIndex]?.role_name.trim())) {
        toast.error('Please select which role slot to reserve.');
        setActionLoading(false);
        return;
      }

      // Validate Roles Builder payload
      const validRoles = rolesBuilder
        .filter(r => r.role_name.trim() !== '')
        .map(r => ({
          role_name: r.role_name,
          description: r.description || undefined,
          required_skills: r.required_skills ? r.required_skills.split(',').map(s => s.trim()) : [],
          slots_needed: r.slots_needed,
          priority: r.priority
        }));

      await createProjectPost({
        created_by: user.id,
        title: newTitle,
        summary: newSummary || undefined,
        description: newDescription,
        category: finalCategory,
        project_type: finalType,
        difficulty_level: newDifficulty,
        work_mode: newWorkMode,
        required_skills: newRequiredSkills ? newRequiredSkills.split(',').map(s => s.trim()) : [],
        preferred_departments: newPreferredDepartments,
        preferred_years: newPreferredYears,
        expected_timeline: newTimeline || undefined,
        meeting_preference: newMeetingPreference || undefined,
        max_team_size: newMaxTeamSize,
        is_beginner_friendly: newBeginnerFriendly,
        is_hackathon: newHackathon,
        deadline: newDeadline || null,
        coordination_link: newCoordLink || undefined,
        github_repo_url: newGithubUrl || undefined,
        shared_doc_url: newSharedDocUrl || undefined,
        private_notes: newPrivateNotes || undefined,
        roles: validRoles,
        owner_role_type: ownerRoleType,
        owner_role_index: ownerRoleType === 'role_index' ? ownerRoleIndex : undefined,
        owner_custom_role: ownerRoleType === 'other' ? ownerCustomRole : undefined
      });

      toast.success('Project post created successfully! 🚀');
      setIsCreateModalOpen(false);
      
      // Reset forms
      setNewTitle('');
      setNewSummary('');
      setNewDescription('');
      setNewCategory(CATEGORIES[0]);
      setNewType(PROJECT_TYPES[0].id);
      setCustomCategory('');
      setCustomProjectType('');
      setNewRequiredSkills('');
      setNewPreferredDepartments([]);
      setNewPreferredYears([]);
      setNewTimeline('');
      setNewMeetingPreference('');
      setNewMaxTeamSize(4);
      setNewDeadline('');
      setNewBeginnerFriendly(false);
      setNewHackathon(false);
      setNewCoordLink('');
      setNewGithubUrl('');
      setNewSharedDocUrl('');
      setNewPrivateNotes('');
      setRolesBuilder([{ role_name: '', description: '', required_skills: '', slots_needed: 1, priority: 'medium' }]);
      setOwnerRoleType('project_lead_only');
      setOwnerRoleIndex(-1);
      setOwnerCustomRole('');

      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error creating project post.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Application dialog
  const openApplyModal = (projId: string, role: ProjectRole | null = null) => {
    setApplyProjectId(projId);
    setSelectedRoleForApply(role);
    setApplyMessage('');
    setApplySkills('');
    setApplyExperience('');
    setApplyPortfolioUrl('');
    setApplyAvailability('');
    setApplyExpectedContribution('');
    setIsApplyModalOpen(true);
  };

  // Submit Application
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !applyProjectId) return;
    setActionLoading(true);
    try {
      await applyToProject({
        project_id: applyProjectId,
        applicant_id: user.id,
        role_id: selectedRoleForApply ? selectedRoleForApply.id : null,
        role_interest: selectedRoleForApply ? selectedRoleForApply.role_name : undefined,
        message: applyMessage,
        skills_snapshot: applySkills ? applySkills.split(',').map(s => s.trim()) : [],
        experience_summary: applyExperience || undefined,
        portfolio_url: applyPortfolioUrl || undefined,
        availability: applyAvailability || undefined,
        expected_contribution: applyExpectedContribution || undefined
      });

      toast.success('Application submitted successfully! ⌛');
      setIsApplyModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error submitting project application.');
    } finally {
      setActionLoading(false);
    }
  };

  // Withdraw Application
  const handleWithdraw = async (appId: string) => {
    if (!window.confirm('Are you sure you want to withdraw this application?')) return;
    try {
      await withdrawApplication(appId);
      toast.info('Application withdrawn.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error withdrawing application.');
    }
  };

  // Open Application review action modal
  const openResponseDialog = (appId: string, action: 'accepted' | 'rejected') => {
    setRespondingAppId(appId);
    setRespondingAction(action);
    setResponseReason('');
  };

  // Submit Application review decision
  const handleResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingAppId || !respondingAction || !selectedProjectId) return;
    setActionLoading(true);
    try {
      await respondToProjectApplication(respondingAppId, respondingAction, responseReason);
      toast.success(`Application successfully ${respondingAction}!`);
      
      setRespondingAppId(null);
      setRespondingAction(null);
      
      // Reload workspace details
      loadWorkspace(selectedProjectId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error reviewing application.');
    } finally {
      setActionLoading(false);
    }
  };

  // Leave project
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !user) return;
    setActionLoading(true);
    try {
      await leaveProject(selectedProjectId, user.id, exitReason);
      toast.info('You successfully left the project team.');
      setIsLeaveModalOpen(false);
      setExitReason('');
      setSelectedProjectId(null);
      setSelectedProject(null);
      setActiveTab('discover');
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error leaving team.');
    } finally {
      setActionLoading(false);
    }
  };

  // Kick member
  const handleKickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !exitingMemberId || !user) return;
    setActionLoading(true);
    try {
      await removeProjectMember(selectedProjectId, exitingMemberId, user.id, exitReason);
      toast.info('Team member removed.');
      setIsKickModalOpen(false);
      setExitReason('');
      setExitingMemberId(null);
      
      // Reload workspace details
      loadWorkspace(selectedProjectId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error removing team member.');
    } finally {
      setActionLoading(false);
    }
  };

  // Save private coordinate edits
  const handleSaveCoordinates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedProject) return;

    if (editTitle.trim().length < 5) {
      toast.error('Title must be at least 5 characters long.');
      return;
    }
    if (editDescription.trim().length < 20) {
      toast.error('Description must be at least 20 characters long.');
      return;
    }

    // Helper validation for secure HTTPS links
    const validateHttps = (url?: string) => {
      if (!url || url.trim() === '') return true;
      return url.trim().toLowerCase().startsWith('https://');
    };

    if (!validateHttps(editCoordLink) || !validateHttps(editGithubUrl) || !validateHttps(editSharedDocUrl)) {
      toast.error('All external links must strictly use the https:// protocol.');
      return;
    }

    // Capacity limit check: max_team_size cannot be lower than active roster count
    if (editMaxTeamSize < teamMembers.length) {
      toast.error(`Maximum team size cannot be less than the active member count (${teamMembers.length}).`);
      return;
    }

    setActionLoading(true);
    try {
      await updateProjectPost(selectedProjectId, {
        title: editTitle,
        summary: editSummary || undefined,
        description: editDescription,
        category: editCategory,
        project_type: editProjectType,
        difficulty_level: editDifficultyLevel,
        work_mode: editWorkMode,
        required_skills: editRequiredSkills ? editRequiredSkills.split(',').map(s => s.trim()).filter(Boolean) : [],
        preferred_departments: editPreferredDepartments,
        preferred_years: editPreferredYears,
        expected_timeline: editExpectedTimeline || undefined,
        meeting_preference: editMeetingPreference || undefined,
        max_team_size: editMaxTeamSize,
        status: editStatus as any,
        is_beginner_friendly: editIsBeginnerFriendly,
        is_hackathon: editIsHackathon,
        deadline: editDeadline || null,
        coordination_link: editCoordLink || undefined,
        github_repo_url: editGithubUrl || undefined,
        shared_doc_url: editSharedDocUrl || undefined,
        private_notes: editPrivateNotes || undefined
      });

      toast.success('Workspace settings updated successfully.');
      setIsEditingLinks(false);
      loadWorkspace(selectedProjectId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error updating collaboration details.');
    } finally {
      setActionLoading(false);
    }
  };

  // Start coordinate edits
  const startEditingLinks = () => {
    if (!selectedProject) return;
    setEditCoordLink(selectedProject.coordination_link || '');
    setEditGithubUrl(selectedProject.github_repo_url || '');
    setEditSharedDocUrl(selectedProject.shared_doc_url || '');
    setEditPrivateNotes(selectedProject.private_notes || '');
    
    setEditStatus(selectedProject.status);
    setEditExpectedTimeline(selectedProject.expected_timeline || '');
    setEditMeetingPreference(selectedProject.meeting_preference || '');
    setEditMaxTeamSize(selectedProject.max_team_size);

    setEditTitle(selectedProject.title || '');
    setEditSummary(selectedProject.summary || '');
    setEditDescription(selectedProject.description || '');
    setEditCategory(selectedProject.category || '');
    setEditProjectType(selectedProject.project_type || '');
    setEditDifficultyLevel(selectedProject.difficulty_level || 'Beginner');
    setEditWorkMode(selectedProject.work_mode || 'Hybrid');
    setEditRequiredSkills(selectedProject.required_skills ? selectedProject.required_skills.join(', ') : '');
    setEditPreferredDepartments(selectedProject.preferred_departments || []);
    setEditPreferredYears(selectedProject.preferred_years || []);
    setEditDeadline(selectedProject.deadline || '');
    setEditIsBeginnerFriendly(selectedProject.is_beginner_friendly || false);
    setEditIsHackathon(selectedProject.is_hackathon || false);
    
    setIsEditingLinks(true);
  };

  // Update status (e.g. paused, complete, team full)
  const handleStatusUpdate = async (status: any) => {
    if (!selectedProjectId || !selectedProject) return;
    try {
      await updateProjectPost(selectedProjectId, {
        title: selectedProject.title,
        summary: selectedProject.summary || undefined,
        description: selectedProject.description,
        category: selectedProject.category,
        project_type: selectedProject.project_type,
        difficulty_level: selectedProject.difficulty_level,
        work_mode: selectedProject.work_mode,
        required_skills: selectedProject.required_skills,
        preferred_departments: selectedProject.preferred_departments,
        preferred_years: selectedProject.preferred_years,
        expected_timeline: selectedProject.expected_timeline || undefined,
        meeting_preference: selectedProject.meeting_preference || undefined,
        max_team_size: selectedProject.max_team_size,
        status: status,
        is_beginner_friendly: selectedProject.is_beginner_friendly,
        is_hackathon: selectedProject.is_hackathon,
        deadline: selectedProject.deadline || undefined,
        coordination_link: selectedProject.coordination_link || undefined,
        github_repo_url: selectedProject.github_repo_url || undefined,
        shared_doc_url: selectedProject.shared_doc_url || undefined,
        private_notes: selectedProject.private_notes || undefined
      });
      toast.success(`Project status updated to ${status}.`);
      loadWorkspace(selectedProjectId);
    } catch (err: any) {
      toast.error(err.message || 'Error updating project status.');
    }
  };

  // --- DISCUSSION BOARD ACTIONS ---
  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !user) return;
    setActionLoading(true);
    try {
      await createProjectDiscussionPost({
        project_id: selectedProjectId,
        created_by: user.id,
        title: newPostTitle,
        body: newPostBody,
        post_type: newPostType,
        tags: newPostTags ? newPostTags.split(',').map(t => t.trim()) : []
      });
      toast.success('Discussion post published!');
      setNewPostTitle('');
      setNewPostBody('');
      setNewPostType('update');
      setNewPostTags('');
      setIsCreatingPost(false);
      
      const posts = await getProjectDiscussionPosts(selectedProjectId);
      setDiscussionPosts(posts);
    } catch (err: any) {
      toast.error(err.message || 'Error creating discussion post.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePinPost = async (post: any) => {
    if (!selectedProjectId) return;
    try {
      await updateProjectDiscussionPost(post.id, {
        title: post.title,
        body: post.body,
        is_pinned: !post.is_pinned
      });
      toast.success(post.is_pinned ? 'Post unpinned' : 'Post pinned to top!');
      const posts = await getProjectDiscussionPosts(selectedProjectId);
      setDiscussionPosts(posts);
    } catch (err: any) {
      toast.error(err.message || 'Error updating pin status.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    if (!selectedProjectId) return;
    try {
      await softDeleteProjectDiscussionPost(postId);
      toast.info('Post deleted.');
      const posts = await getProjectDiscussionPosts(selectedProjectId);
      setDiscussionPosts(posts);
    } catch (err: any) {
      toast.error(err.message || 'Error deleting post.');
    }
  };

  const handleTogglePostHelpful = async (postId: string) => {
    if (!selectedProjectId) return;
    try {
      await toggleProjectDiscussionHelpful({ postId });
      const posts = await getProjectDiscussionPosts(selectedProjectId);
      setDiscussionPosts(posts);
    } catch (err: any) {
      toast.error(err.message || 'Error updating reaction.');
    }
  };

  const handleLoadReplies = async (post: any) => {
    if (selectedPostForReplies?.id === post.id) {
      setSelectedPostForReplies(null);
      return;
    }
    try {
      setSelectedPostForReplies(post);
      const data = await getProjectDiscussionReplies(post.id);
      setReplies(data);
      setNewReplyBody('');
    } catch (err: any) {
      toast.error('Error loading replies.');
    }
  };

  const handleCreateReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostForReplies || !selectedProjectId) return;
    setActionLoading(true);
    try {
      await addProjectDiscussionReply(selectedPostForReplies.id, selectedProjectId, newReplyBody);
      toast.success('Comment added.');
      setNewReplyBody('');
      
      const data = await getProjectDiscussionReplies(selectedPostForReplies.id);
      setReplies(data);

      const posts = await getProjectDiscussionPosts(selectedProjectId);
      setDiscussionPosts(posts);
    } catch (err: any) {
      toast.error(err.message || 'Error adding comment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    if (!selectedPostForReplies || !selectedProjectId) return;
    try {
      await softDeleteProjectDiscussionReply(replyId);
      toast.info('Comment deleted.');
      const data = await getProjectDiscussionReplies(selectedPostForReplies.id);
      setReplies(data);

      const posts = await getProjectDiscussionPosts(selectedProjectId);
      setDiscussionPosts(posts);
    } catch (err: any) {
      toast.error(err.message || 'Error deleting comment.');
    }
  };

  const handleToggleReplyHelpful = async (replyId: string) => {
    if (!selectedPostForReplies) return;
    try {
      await toggleProjectDiscussionHelpful({ replyId });
      const data = await getProjectDiscussionReplies(selectedPostForReplies.id);
      setReplies(data);
    } catch (err: any) {
      toast.error(err.message || 'Error updating reaction.');
    }
  };

  const ALLOWED_MIME_TYPES = [
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
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

  // --- RESOURCE BOARD ACTIONS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    // Reject dangerous file formats explicitly
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.scr', '.apk', '.jar'];
    const lowerName = file.name.toLowerCase();
    const isDangerous = dangerousExtensions.some(ext => lowerName.endsWith(ext));
    if (isDangerous) {
      setFileError('Security Warning: This file format (.exe, .bat, .cmd, etc.) is hazardous and is strictly blocked.');
      setSelectedFile(null);
      return;
    }

    const isVideoFile = lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || lowerName.endsWith('.mov') || file.type.startsWith('video/');

    if (isVideoFile) {
      const allowedExts = ['.mp4', '.webm', '.mov'];
      const hasValidExt = allowedExts.some(ext => lowerName.endsWith(ext));
      if (!hasValidExt) {
        setFileError('Unsupported video format. Please upload .mp4, .webm, or .mov under 20MB.');
        setSelectedFile(null);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setFileError('Unsupported video format. Please upload .mp4, .webm, or .mov under 20MB.');
        setSelectedFile(null);
        return;
      }
    } else {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setFileError('Unsupported file type. Only PDFs, text files, images, datasets, and standard office documents are allowed.');
        setSelectedFile(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFileError('File size exceeds the limit (10 MB for standard files).');
        setSelectedFile(null);
        return;
      }
    }

    setSelectedFile(file);

    // Auto-fill title and suggest resource type
    const extIndex = file.name.lastIndexOf('.');
    const autoTitle = extIndex !== -1 ? file.name.substring(0, extIndex) : file.name;
    let typeSug = 'document';
    if (file.type === 'application/pdf') {
      typeSug = 'pdf';
    } else if (file.type.startsWith('image/')) {
      typeSug = 'image';
    } else if (file.type === 'text/csv' || file.type === 'application/json') {
      typeSug = 'dataset';
    } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
      typeSug = 'notes';
    } else if (file.type.includes('presentation') || file.type.includes('powerpoint')) {
      typeSug = 'presentation';
    } else if (isVideoFile) {
      typeSug = 'video';
    }
    
    setResourceType(typeSug);
    if (!newResourceTitle.trim()) {
      setNewResourceTitle(autoTitle);
    }
  };

  const handleCreateResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    if (!newResourceTitle.trim()) {
      toast.error('Resource title is required.');
      return;
    }

    const isLinkMode = resourceMode === 'link' || resourceMode === 'folder' || resourceMode === 'code_repo';

    if (isLinkMode) {
      if (!newResourceUrl.trim()) {
        toast.error('URL is required.');
        return;
      }
      if (!newResourceUrl.startsWith('https://')) {
        toast.error('Resource link must strictly use the secure https:// protocol.');
        return;
      }
    }

    setActionLoading(true);
    try {
      if (resourceMode === 'file') {
        if (!selectedFile) {
          toast.error('Please select a file to upload.');
          return;
        }

        const resId = (typeof window !== 'undefined' && window.crypto?.randomUUID)
          ? window.crypto.randomUUID()
          : Math.random().toString(36).substring(2) + Date.now().toString(36);

        // 1. Upload file to Supabase Storage private bucket
        const fileData = await uploadProjectResourceFile({
          projectId: selectedProjectId,
          file: selectedFile,
          resourceId: resId,
        });

        // 2. Insert metadata row into project_resources table
        await addProjectResource({
          project_id: selectedProjectId,
          title: newResourceTitle,
          description: newResourceDesc || undefined,
          resource_type: (resourceType === 'video' ? 'other' : resourceType) as any,
          file_path: fileData.file_path,
          file_name: fileData.file_name,
          file_mime_type: fileData.file_mime_type,
          file_size_bytes: fileData.file_size_bytes,
          storage_bucket: fileData.storage_bucket
        });

        toast.success(selectedProject?.is_owner 
          ? 'File resource uploaded and verified successfully! 🚀' 
          : 'File uploaded and submitted to owner verification queue. ⏳'
        );

      } else {
        // Link, Folder, or Code Repo
        const typeMapping: Record<string, string> = {
          link: 'link',
          folder: 'folder',
          code_repo: 'code_repo'
        };

        await addProjectResource({
          project_id: selectedProjectId,
          title: newResourceTitle,
          description: newResourceDesc || undefined,
          resource_type: typeMapping[resourceMode] as any || 'link',
          url: newResourceUrl
        });

        toast.success(selectedProject?.is_owner 
          ? 'Resource link created successfully! 🚀' 
          : 'Resource link submitted to owner verification queue. ⏳'
        );
      }

      // Reset states
      setNewResourceTitle('');
      setNewResourceDesc('');
      setNewResourceUrl('');
      setSelectedFile(null);
      setFileError(null);
      setResourceMode('link');
      setResourceType('link');
      setIsCreatingResource(false);

      // Reload resources
      const resList = await getProjectResources(selectedProjectId);
      setResources(resList);

      if (selectedProject?.is_owner) {
        const queue = await getProjectResourceVerificationQueue(selectedProjectId);
        setVerificationQueue(queue);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving resource.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyResourceAction = async (resourceId: string) => {
    if (!selectedProjectId) return;
    try {
      await verifyProjectResource(resourceId);
      toast.success('Resource approved and added to workspace list.');
      
      const resList = await getProjectResources(selectedProjectId);
      setResources(resList);

      const queue = await getProjectResourceVerificationQueue(selectedProjectId);
      setVerificationQueue(queue);
    } catch (err: any) {
      toast.error(err.message || 'Error verifying resource.');
    }
  };

  const handleRejectResourceAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionResourceId || !selectedProjectId) return;
    setActionLoading(true);
    try {
      await rejectProjectResource(rejectionResourceId, rejectionReasonText);
      toast.info('Resource submission declined.');
      setIsRejectionModalOpen(false);
      setRejectionResourceId(null);
      setRejectionReasonText('');

      const resList = await getProjectResources(selectedProjectId);
      setResources(resList);

      const queue = await getProjectResourceVerificationQueue(selectedProjectId);
      setVerificationQueue(queue);
    } catch (err: any) {
      toast.error(err.message || 'Error rejecting resource.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePinResource = async (resourceId: string) => {
    if (!selectedProjectId) return;
    try {
      await pinProjectResource(resourceId);
      toast.success('Pin status toggled.');
      const resList = await getProjectResources(selectedProjectId);
      setResources(resList);
    } catch (err: any) {
      toast.error(err.message || 'Error toggling pin.');
    }
  };

  const handleDeleteResourceAction = async (resourceId: string) => {
    if (!window.confirm('Are you sure you want to remove this resource?')) return;
    if (!selectedProjectId) return;
    try {
      await deleteProjectResource(resourceId);
      toast.info('Resource removed.');
      
      const resList = await getProjectResources(selectedProjectId);
      setResources(resList);

      const queue = await getProjectResourceVerificationQueue(selectedProjectId);
      setVerificationQueue(queue);
    } catch (err: any) {
      toast.error(err.message || 'Error deleting resource.');
    }
  };

  const handleToggleResourceHelpful = async (resourceId: string) => {
    if (!selectedProjectId) return;
    try {
      const res = await toggleProjectResourceHelpful(resourceId);
      if (res.reacted_by_me) {
        toast.success('Thank you for upvoting this resource! 👍');
      } else {
        toast.info('Removed helpful reaction.');
      }
      const resList = await getProjectResources(selectedProjectId);
      setResources(resList);
    } catch (err: any) {
      toast.error(err.message || 'Error updating reaction.');
    }
  };

  const handlePreviewResource = async (res: any) => {
    if (!res.storage_bucket || !res.file_path) return;
    setPreviewResource(res);
    setLoadingPreview(true);
    setPreviewUrl('');
    try {
      const url = await getSignedProjectResourceUrl(res.storage_bucket, res.file_path);
      setPreviewUrl(url);
    } catch (err: any) {
      toast.error(err.message || 'Could not load resource preview.');
      setPreviewResource(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownloadResource = async (res: any) => {
    if (!res.storage_bucket || !res.file_path) return;
    try {
      const url = await getSignedProjectResourceUrl(res.storage_bucket, res.file_path);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = res.file_name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    } catch (err: any) {
      toast.error(err.message || 'Could not download file.');
    }
  };

  // ============================================================
  // PHASE 6.3C: Role Management Handlers
  // ============================================================
  
  const handleAddRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setActionLoading(true);
    try {
      await addProjectRole({
        project_id: selectedProjectId,
        role_name: newRoleName,
        description: newRoleDescription || undefined,
        required_skills: newRoleSkills ? newRoleSkills.split(',').map(s => s.trim()).filter(Boolean) : [],
        slots_needed: newRoleSlots,
        priority: newRolePriority
      });
      toast.success(`Role "${newRoleName}" added successfully!`);
      setIsAddingRole(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRoleSkills('');
      setNewRoleSlots(1);
      setNewRolePriority('medium');
      loadWorkspace(selectedProjectId);
    } catch (err: any) {
      toast.error(err.message || 'Error adding role.');
    } finally {
      setActionLoading(false);
    }
  };

  const startEditRole = (role: any) => {
    setEditingRoleId(role.id);
    setNewRoleName(role.role_name);
    setNewRoleDescription(role.description || '');
    setNewRoleSkills(role.required_skills ? role.required_skills.join(', ') : '');
    setNewRoleSlots(role.slots_needed);
    setNewRolePriority(role.priority || 'medium');
    setIsAddingRole(false);
  };

  const handleUpdateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoleId || !selectedProjectId) return;
    setActionLoading(true);
    try {
      await updateProjectRole(editingRoleId, {
        role_name: newRoleName,
        description: newRoleDescription || undefined,
        required_skills: newRoleSkills ? newRoleSkills.split(',').map(s => s.trim()).filter(Boolean) : [],
        slots_needed: newRoleSlots,
        priority: newRolePriority
      });
      toast.success(`Role updated successfully!`);
      setEditingRoleId(null);
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRoleSkills('');
      setNewRoleSlots(1);
      setNewRolePriority('medium');
      loadWorkspace(selectedProjectId);
    } catch (err: any) {
      toast.error(err.message || 'Error updating role.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!window.confirm(`Delete the role "${roleName}"? This action cannot be undone.`)) return;
    if (!selectedProjectId) return;
    try {
      await deleteProjectRole(roleId);
      toast.info(`Role "${roleName}" removed.`);
      loadWorkspace(selectedProjectId);
    } catch (err: any) {
      toast.error(err.message || 'Error deleting role.');
    }
  };

  // ============================================================
  // PHASE 6.3C: Lifecycle Control Handlers
  // ============================================================

  const handleMarkRunning = async (projId: string) => {
    try {
      await markProjectRunning(projId);
      toast.success('Project marked as Running! 🚀');
      fetchData();
      if (selectedProjectId === projId) loadWorkspace(projId);
    } catch (err: any) {
      toast.error(err.message || 'Error updating project status.');
    }
  };

  const handleMarkCompleted = (projId: string) => {
    setProjectToComplete(projId);
    setCompletionSummaryText('');
    setIsCompleteConfirmOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!projectToComplete) return;
    setActionLoading(true);
    try {
      await completeProject(projectToComplete, completionSummaryText || undefined);
      toast.success('Project marked as Completed! 🎉');
      setIsCompleteConfirmOpen(false);
      setProjectToComplete(null);
      setCompletionSummaryText('');
      fetchData();
      if (selectedProjectId === projectToComplete) loadWorkspace(projectToComplete);
    } catch (err: any) {
      toast.error(err.message || 'Error marking project completed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveProjectConfirm = (projId: string) => {
    setProjectToArchive(projId);
    setIsArchiveConfirmOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!projectToArchive) return;
    setActionLoading(true);
    try {
      await archiveProject(projectToArchive);
      toast.success('Project archived. Team history safely preserved. 📦');
      setIsArchiveConfirmOpen(false);
      setProjectToArchive(null);
      fetchData();
      if (selectedProjectId === projectToArchive) {
        setSelectedProject(null);
        setSelectedProjectId(null);
        setActiveTab('my_projects');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error archiving project.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseProject = async (projId: string) => {
    try {
      await pauseProject(projId);
      toast.info('Project paused.');
      fetchData();
      if (selectedProjectId === projId) loadWorkspace(projId);
    } catch (err: any) {
      toast.error(err.message || 'Error pausing project.');
    }
  };

  const handleRestoreProject = async (projId: string, toStatus: 'recruiting' | 'in_progress') => {
    try {
      const proj = projects.find(p => p.id === projId);
      if (proj && !['archived', 'completed', 'paused'].includes(proj.status)) {
        toast.error("This project is already active.");
        return;
      }
      await restoreProject(projId, toStatus);
      toast.success(`Project restored to ${toStatus === 'recruiting' ? 'Recruiting' : 'Running'}! ✅`);
      fetchData();
      if (selectedProjectId === projId) loadWorkspace(projId);
    } catch (err: any) {
      toast.error(err.message || 'Error restoring project.');
    }
  };

  // Discover Projects filter logic
  const filteredProjects = projects.filter(p => {
    // 1. Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchSummary = p.summary && p.summary.toLowerCase().includes(q);
      const matchSkills = p.required_skills && p.required_skills.some(s => s.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchSummary && !matchSkills) return false;
    }

    // 2. Category
    if (selectedCategory && p.category !== selectedCategory) return false;

    // 3. Project Type
    if (selectedType && formatProjectDisplayType(p.project_type) !== selectedType) return false;

    // 4. Difficulty
    if (selectedDifficulty && p.difficulty_level !== selectedDifficulty) return false;

    // 5. Work Mode
    if (selectedWorkMode && p.work_mode !== selectedWorkMode) return false;

    // 6. Has Open Slots
    if (hasOpenSlotsFilter && p.current_team_size >= p.max_team_size) return false;

    // 7. Beginner Friendly
    if (isBeginnerFriendlyFilter && !p.is_beginner_friendly) return false;

    // 8. Hackathon Project
    if (isHackathonFilter && !p.is_hackathon) return false;

    return true;
  });

  return (
    <div className="w-full max-w-7xl min-w-0 mx-auto space-y-6 overflow-x-hidden">
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Find Project Mates</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-150 animate-pulse">
              Phase 6.1
            </span>
          </h2>
          <p className="text-sm text-slate-500 max-w-xl">
            Sleek student team creation dashboard. Build groups, recruit specialists with targeted roles, review profiles safely, and sync coordinates securely.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 self-start md:self-auto text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Post Project Board
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discover Teams</p>
            <p className="text-2xl font-black text-slate-800">{projects.length}</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recruiting Teams</p>
            <p className="text-2xl font-black text-slate-800">{projects.filter(p => p.status === 'recruiting').length}</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11V9a5 5 0 00-10 0v1c0 .59.112 1.155.314 1.678L4 10.308M12 11c0-3.517 1.009-6.799 2.753-9.571m3.44 2.04l-.054.09A13.916 13.916 0 0015 9v2a5 5 0 0010 0V9a5 5 0 00-4.072-4.908" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Applications</p>
            <p className="text-2xl font-black text-slate-800">{myApplications.length}</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Projects</p>
            <p className="text-2xl font-black text-slate-800">{ownedProjects.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-full min-w-0 max-w-full overflow-x-auto whitespace-nowrap thin-scrollbar border-b border-slate-200">
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'discover'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Discover Projects
        </button>
        <button
          onClick={() => setActiveTab('my_projects')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'my_projects'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          My Projects ({ownedProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('my_applications')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'my_applications'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          My Applications ({myApplications.length})
        </button>
        {selectedProject && (
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'workspace'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Workspace: {selectedProject.title}
          </button>
        )}
      </div>

      {/* Content Tabs */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
          <p className="text-sm text-slate-500 font-semibold">Syncing project board...</p>
        </div>
      ) : (
        <div className="w-full min-w-0 max-w-full overflow-x-hidden">
          {/* TAB 1: DISCOVER PROJECTS */}
          {activeTab === 'discover' && (
            <div className="w-full max-w-full min-w-0 space-y-6 overflow-hidden">
              
              {/* Premium Filter Drawer/Box */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search projects by title, description, skills..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All Categories</option>
                    {discoveredCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All Types</option>
                    {discoveredTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <select
                    value={selectedDifficulty}
                    onChange={e => setSelectedDifficulty(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All Difficulties</option>
                    {DIFFICULTIES.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <select
                    value={selectedWorkMode}
                    onChange={e => setSelectedWorkMode(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All Work Modes</option>
                    {WORK_MODES.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-semibold text-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasOpenSlotsFilter}
                      onChange={e => setHasOpenSlotsFilter(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Has Open Slots</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBeginnerFriendlyFilter}
                      onChange={e => setIsBeginnerFriendlyFilter(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Beginner Friendly</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHackathonFilter}
                      onChange={e => setIsHackathonFilter(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Hackathon Projects</span>
                  </label>

                  {(searchQuery || selectedCategory || selectedType || selectedDifficulty || selectedWorkMode || hasOpenSlotsFilter || isBeginnerFriendlyFilter || isHackathonFilter) && (
                    <button
                      onClick={handleResetFilters}
                      className="ml-auto text-red-600 hover:text-red-700 flex items-center gap-1 font-bold"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of Projects */}
              {filteredProjects.length === 0 ? (
                <div className="p-16 border border-slate-200 border-dashed rounded-2xl text-center bg-white">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-slate-500 font-bold">No projects matching the filters were found.</p>
                  <button onClick={handleResetFilters} className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-semibold underline">
                    Clear filters and show all projects
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredProjects.map(proj => {
                    const isFull = proj.current_team_size >= proj.max_team_size;
                    const statusBadgeColors = 
                      proj.status === 'recruiting' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                      proj.status === 'team_full' ? 'bg-red-50 text-red-700 border-red-150' :
                      proj.status === 'in_progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-150' :
                      'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <div key={proj.id} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          {/* Upper Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border ${statusBadgeColors}`}>
                              {proj.status}
                            </span>
                            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                              {proj.category}
                            </span>
                            <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              {proj.difficulty_level}
                            </span>
                            <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-150">
                              {proj.work_mode}
                            </span>
                            {proj.is_hackathon && (
                              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-rose-500 text-white shadow-sm">
                                HACKATHON
                              </span>
                            )}
                            {proj.is_beginner_friendly && (
                              <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500 text-white shadow-sm">
                                Beginner Friendly
                              </span>
                            )}
                          </div>

                          {/* Title & Owner Info */}
                          <div>
                            <h3 className="text-xl font-black text-slate-800 leading-tight">{proj.title}</h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Leader: <span className="font-bold text-slate-600">{proj.owner_profile?.full_name}</span> · {proj.owner_profile?.department} ({proj.owner_profile?.year_of_study})
                            </p>
                          </div>

                          {/* Summary */}
                          {proj.summary && (
                            <p className="text-sm font-semibold text-slate-600 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                              "{proj.summary}"
                            </p>
                          )}

                          {/* Description */}
                          <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                            {proj.description}
                          </p>

                          {/* Required skills */}
                          {proj.required_skills && proj.required_skills.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Required:</span>
                              {proj.required_skills.map(s => (
                                <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Matching Score Section */}
                          {user && (
                            <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/50 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Compatibility Match Score</span>
                                <span className={`px-2 py-0.5 text-xs font-black rounded-lg ${
                                  (proj.match_score || 0) >= 75 ? 'bg-emerald-500 text-white' :
                                  (proj.match_score || 0) >= 40 ? 'bg-amber-500 text-white' :
                                  'bg-slate-400 text-white'
                                }`}>
                                  {proj.match_score}%
                                </span>
                              </div>
                              {proj.match_reasons && proj.match_reasons.length > 0 && (
                                <p className="text-[10px] text-indigo-700 leading-snug line-clamp-2 italic">
                                  {proj.match_reasons[0]} {proj.match_reasons[1] ? `· ${proj.match_reasons[1]}` : ''}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Roles available */}
                          {proj.roles && proj.roles.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Open Positions</h4>
                              <div className="space-y-1">
                                {proj.roles.map(role => {
                                  const isRoleFilled = role.slots_filled >= role.slots_needed;
                                  return (
                                    <div key={role.id} className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                                      isRoleFilled ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-65' : 'bg-slate-50 text-slate-700 border-slate-150'
                                    }`}>
                                      <div>
                                        <span className="font-bold">{role.role_name}</span>
                                        <span className="text-[10px] ml-1">
                                          ({role.slots_filled}/{role.slots_needed} {isRoleFilled ? 'Full' : 'Open'})
                                        </span>
                                      </div>
                                                                            {!isRoleFilled && !proj.is_owner && !proj.is_member && proj.status !== 'completed' && proj.status !== 'paused' && proj.status !== 'archived' && (
                                        <button
                                          onClick={() => openApplyModal(proj.id, role)}
                                          className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded border border-indigo-150 transition-colors"
                                        >
                                          Apply
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            <span>Team Size: {proj.current_team_size}/{proj.max_team_size}</span>
                          </div>

                          <div className="flex gap-2">
                            {(() => {
                              const myProjMemberships = userMemberships.filter(m => m.project_id === proj.id);
                              const isActiveMember = proj.is_owner || myProjMemberships.some(m => m.left_at === null);
                              
                              const projApps = myApplications.filter(a => a.project_id === proj.id);
                              const pendingApp = projApps.find(a => a.status === 'pending');
                              const rejectedApp = projApps.find(a => a.status === 'rejected');
                              const withdrawnApp = projApps.find(a => a.status === 'withdrawn');
                              const hasLeftMembership = !isActiveMember && myProjMemberships.some(m => m.left_at !== null);
                              
                              const stateType = 
                                isActiveMember ? 'active' :
                                pendingApp ? 'pending' :
                                hasLeftMembership ? 'left' :
                                rejectedApp ? 'rejected' :
                                withdrawnApp ? 'withdrawn' : 'none';

                                                            if (proj.status === 'completed' && stateType !== 'active') {
                                return (
                                  <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-black rounded-lg border border-emerald-250 uppercase tracking-wide">
                                    ✓ Project Completed
                                  </span>
                                );
                              }

                              if (proj.status === 'paused' && stateType !== 'active') {
                                return (
                                  <span className="px-3.5 py-1.5 bg-amber-50 text-amber-700 text-xs font-black rounded-lg border border-amber-250 uppercase tracking-wide">
                                    ⏸️ Project Paused
                                  </span>
                                );
                              }

                              if (proj.status === 'archived' && stateType !== 'active') {
                                return (
                                  <span className="px-3.5 py-1.5 bg-slate-100 text-slate-500 text-xs font-black rounded-lg border border-slate-200 uppercase tracking-wide">
                                    📁 Project Archived
                                  </span>
                                );
                              }

                              if (stateType === 'active') {
                                return (
                                  <button
                                    onClick={() => loadWorkspace(proj.id)}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-all"
                                  >
                                    {proj.is_owner ? 'Manage Workspace' : 'Open Workspace'}
                                  </button>
                                );
                              }

                              if (stateType === 'pending') {
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-250 uppercase">
                                      Pending Review
                                    </span>
                                    {pendingApp && (
                                      <button
                                        onClick={() => handleWithdraw(pendingApp.id)}
                                        className="px-2.5 py-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-150 animate-fade-in"
                                      >
                                        Withdraw
                                      </button>
                                    )}
                                  </div>
                                );
                              }

                                                            if (stateType === 'left' || stateType === 'rejected' || stateType === 'withdrawn') {
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider ${
                                      stateType === 'left' ? 'bg-slate-100 text-slate-505 border-slate-200' :
                                      stateType === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                      'bg-slate-50 text-slate-550 border-slate-200'
                                    }`}>
                                      {stateType === 'left' ? 'LEFT TEAM' : stateType}
                                    </span>
                                    {isFull ? (
                                      <span className="px-3.5 py-1.5 bg-red-50 text-red-655 text-xs font-bold rounded-lg border border-red-100">
                                        Team Full
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => openApplyModal(proj.id)}
                                        className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-black rounded-lg border border-indigo-150 transition-all shadow-sm"
                                      >
                                        {proj.status === 'in_progress' ? 'Apply to Running Project' : 'Apply Again'}
                                      </button>
                                    )}
                                  </div>
                                );
                              }

                              return isFull ? (
                                <span className="px-3.5 py-1.5 bg-red-50 text-red-655 text-xs font-bold rounded-lg border border-red-100">
                                  Team Full
                                </span>
                              ) : (
                                <div className="flex flex-col items-end gap-1">
                                  <button
                                    onClick={() => openApplyModal(proj.id)}
                                    className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-black rounded-lg border border-indigo-150 transition-all shadow-sm"
                                  >
                                    {proj.status === 'in_progress' ? 'Apply to Running Project' : 'Apply'}
                                  </button>
                                  {proj.status === 'in_progress' && (
                                    <span className="text-[10px] text-slate-400 italic">Project is already in progress</span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY PROJECTS — Lifecycle Sections */}
          {activeTab === 'my_projects' && (() => {
            const recruitingProjects = ownedProjects.filter(p => p.status === 'recruiting');
            const runningProjects = ownedProjects.filter(p => p.status === 'in_progress' || p.status === 'team_full');
            const completedProjects = ownedProjects.filter(p => p.status === 'completed').sort((a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            const archivedProjects = ownedProjects.filter(p => p.status === 'archived' || p.status === 'paused').sort((a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );

            if (ownedProjects.length === 0) {
              return (
                <div className="p-16 border border-slate-200 border-dashed rounded-2xl text-center bg-white">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  <p className="text-slate-500 font-bold">You haven't posted any team formation searches yet.</p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                  >
                    Post First Project
                  </button>
                </div>
              );
            }

            const renderLifecycleSection = (
              title: string,
              description: string,
              sectionProjects: typeof ownedProjects,
              emptyMsg: string,
              accentClass: string,
              actions: (proj: typeof ownedProjects[0]) => React.ReactNode,
              isCollapsible?: boolean,
              isCollapsed?: boolean,
              onToggleCollapse?: () => void,
              showMore?: boolean,
              onShowMore?: () => void
            ) => {
              const VISIBLE_COUNT = 3;
              const displayProjects = showMore ? sectionProjects : sectionProjects.slice(0, VISIBLE_COUNT);
              const hasMore = sectionProjects.length > VISIBLE_COUNT;

              return (
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${accentClass}`}>
                    <div className="flex items-center gap-3">
                      {isCollapsible && (
                        <button
                          onClick={onToggleCollapse}
                          className="text-slate-500 hover:text-slate-700 transition-colors"
                          title={isCollapsed ? 'Expand section' : 'Collapse section'}
                          aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                        >
                          <svg className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                      <div>
                        <h4 className="font-black text-sm text-slate-800 flex items-center gap-2">
                          {title}
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/80 border border-slate-200 text-slate-600">
                            {sectionProjects.length}
                          </span>
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
                      </div>
                    </div>
                  </div>
                  
                  {(!isCollapsible || !isCollapsed) && (
                    <>
                      {sectionProjects.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                          {emptyMsg}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {displayProjects.map(proj => (
                            <div key={proj.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:shadow-md transition-shadow">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-sm font-black text-slate-800 truncate">{proj.title}</h3>
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200 capitalize shrink-0">
                                    {proj.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {proj.category} · <span className="font-bold text-slate-600">{proj.current_team_size}/{proj.max_team_size} members</span>
                                  {proj.roles && proj.roles.filter(r => r.slots_filled < r.slots_needed).length > 0 && (
                                    <span className="ml-1 text-emerald-600 font-semibold">· {proj.roles.filter(r => r.slots_filled < r.slots_needed).length} open slots</span>
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1.5 shrink-0">
                                {actions(proj)}
                              </div>
                            </div>
                          ))}
                          {hasMore && (
                            <button
                              onClick={onShowMore}
                              className="w-full text-center text-xs font-bold text-indigo-600 hover:text-indigo-700 py-2 border border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
                            >
                              {showMore ? `Show Fewer ▲` : `Show ${sectionProjects.length - VISIBLE_COUNT} More ▼`}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            };

            const actionBtn = (label: string, onClick: () => void, cls: string) => (
              <button onClick={onClick} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${cls}`}>
                {label}
              </button>
            );

            return (
              <div className="w-full max-w-full min-w-0 space-y-6 overflow-hidden">
                {/* SECTION 1: RECRUITING */}
                {renderLifecycleSection(
                  '🔍 Recruiting Projects',
                  'Looking for teammates. Applications open.',
                  recruitingProjects,
                  'No recruiting projects yet. Post a project to start recruiting.',
                  'bg-emerald-50 border-emerald-200',
                  (proj) => (
                    <>
                      {actionBtn('Manage Workspace', () => loadWorkspace(proj.id), 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600')}
                      {actionBtn('Mark Running', () => handleMarkRunning(proj.id), 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200')}
                      {actionBtn('Archive', () => handleArchiveProjectConfirm(proj.id), 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200')}
                    </>
                  )
                )}

                {/* SECTION 2: RUNNING */}
                {renderLifecycleSection(
                  '🚀 Running Projects',
                  'Team formed. Work is in progress.',
                  runningProjects,
                  'No running projects yet.',
                  'bg-blue-50 border-blue-200',
                  (proj) => (
                    <>
                      {actionBtn('Manage Workspace', () => loadWorkspace(proj.id), 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600')}
                      {actionBtn('Mark Completed', () => handleMarkCompleted(proj.id), 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200')}
                      {actionBtn('Pause', () => handlePauseProject(proj.id), 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200')}
                    </>
                  )
                )}

                {/* SECTION 3: COMPLETED */}
                {renderLifecycleSection(
                  '✅ Completed Projects',
                  'Projects successfully wrapped up.',
                  completedProjects,
                  'No completed projects yet.',
                  'bg-indigo-50 border-indigo-200',
                  (proj) => (
                    <>
                      {actionBtn('View Summary', () => loadWorkspace(proj.id), 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200')}
                      {actionBtn('Restore to Running', () => handleRestoreProject(proj.id, 'in_progress'), 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200')}
                      {actionBtn('Archive', () => handleArchiveProjectConfirm(proj.id), 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200')}
                    </>
                  ),
                                    true,
                  isCompletedSectionCollapsed,
                  () => setIsCompletedSectionCollapsed(v => !v),
                  showMoreCompletedProjects,
                  () => setShowMoreCompletedProjects(v => !v)
                )}

                {/* SECTION 4: ARCHIVED / PAUSED */}
                {renderLifecycleSection(
                  '📦 Archived & Paused Projects',
                  'Hidden from active sections. Can be restored.',
                  archivedProjects,
                  'No archived projects.',
                  'bg-slate-50 border-slate-200',
                  (proj) => (
                    <>
                      {actionBtn('Restore to Recruiting', () => handleRestoreProject(proj.id, 'recruiting'), 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200')}
                      {actionBtn('View Summary', () => loadWorkspace(proj.id), 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200')}
                    </>
                  ),
                  true,
                  isArchivedSectionCollapsed,
                  () => setIsArchivedSectionCollapsed(v => !v)
                )}
              </div>
            );
          })()}



          {/* TAB 3: MY APPLICATIONS */}
          {activeTab === 'my_applications' && (() => {
            const activeApps = myApplications.filter(app => app.status === 'accepted' && !userMemberships.some((m: any) => m.project_id === app.project_id && m.left_at));
            const pendingApps = myApplications.filter(app => app.status === 'pending');
            const rejectedApps = myApplications.filter(app => app.status === 'rejected');
            const withdrawnApps = myApplications.filter(app => app.status === 'withdrawn');
            const leftApps = myApplications.filter(app => app.status === 'accepted' && userMemberships.some((m: any) => m.project_id === app.project_id && m.left_at));

            // Sorting helper: newest created first
            const sortByDate = (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

            activeApps.sort(sortByDate);
            pendingApps.sort(sortByDate);
            rejectedApps.sort(sortByDate);
            withdrawnApps.sort(sortByDate);
            leftApps.sort(sortByDate);

            const hasAny = myApplications.length > 0;

            const renderAppGroup = (title: string, appsList: any[], type: 'active' | 'pending' | 'rejected' | 'withdrawn' | 'left', emptyText: string) => {
              if (appsList.length === 0) {
                return (
                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">{title} (0)</h4>
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">{emptyText}</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span>{title}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 text-[10px] font-bold rounded-full">
                      {appsList.length}
                    </span>
                  </h4>
                  <div className="space-y-4">
                    {appsList.map(app => {
                      const proj = projects.find(p => p.id === app.project_id);
                      const isFull = proj ? (proj.current_team_size >= proj.max_team_size) : false;
                      const statusColor =
                        app.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        app.status === 'accepted' ? (type === 'left' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200') :
                        app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-50 text-slate-500 border-slate-200';

                      return (
                        <div key={app.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <h3 className="text-md font-black text-slate-800">{app.project?.title || 'Unknown Project'}</h3>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Role Interest: <span className="font-semibold text-slate-600">{app.role_interest || 'General Member'}</span> · Applied on {new Date(app.created_at).toLocaleDateString()}
                                {app.reviewed_at && ` · Reviewed on ${new Date(app.reviewed_at).toLocaleDateString()}`}
                                {type === 'left' && userMemberships.find(m => m.project_id === app.project_id)?.left_at && ` · Left on ${new Date(userMemberships.find(m => m.project_id === app.project_id).left_at).toLocaleDateString()}`}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border uppercase ${statusColor}`}>
                                {type === 'left' ? 'LEFT TEAM' : app.status}
                              </span>
                              {app.status === 'pending' && (
                                <button
                                  onClick={() => handleWithdraw(app.id)}
                                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg border border-red-150 transition-colors text-xs"
                                >
                                  Withdraw
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Owner message if reviewed */}
                          {app.owner_response && (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                              <span className="font-black text-slate-600 block mb-1">Leader Response:</span>
                              <p className="text-slate-500 italic">"{app.owner_response}"</p>
                            </div>
                          )}
                          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            {(() => {
                              const hasPendingAppForThisProj = myApplications.some(a => a.project_id === app.project_id && a.status === 'pending');
                              const isActiveMemberOfThisProj = projects.find(p => p.id === app.project_id)?.is_member || userMemberships.some(m => m.project_id === app.project_id && m.left_at === null);

                              if (type === 'active') {
                                return (
                                  <>
                                    <p className="text-xs font-semibold text-emerald-600">
                                      🎉 You're on this team. Open the workspace to coordinate securely.
                                    </p>
                                    <button
                                      onClick={() => loadWorkspace(app.project_id)}
                                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors whitespace-nowrap self-start sm:self-auto"
                                    >
                                      Open Team Workspace
                                    </button>
                                  </>
                                );
                              }

                              if (type === 'left') {
                                return (
                                  <>
                                    <p className="text-xs font-semibold text-slate-500">
                                      🚪 You left this project team.
                                    </p>
                                    {!hasPendingAppForThisProj && !isActiveMemberOfThisProj && (
                                      isFull ? (
                                        <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100">
                                          Team Full
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => openApplyModal(app.project_id)}
                                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg border border-indigo-150 transition-colors text-xs self-start sm:self-auto"
                                        >
                                          Apply Again
                                        </button>
                                      )
                                    )}
                                  </>
                                );
                              }

                              if (type === 'rejected' || type === 'withdrawn') {
                                return (
                                  <>
                                    <p className="text-xs font-semibold text-slate-400">
                                      {type === 'rejected' ? 'Application was not selected.' : 'You withdrew this application.'}
                                    </p>
                                    {!hasPendingAppForThisProj && !isActiveMemberOfThisProj && (
                                      isFull ? (
                                        <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100">
                                          Team Full
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => openApplyModal(app.project_id)}
                                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg border border-indigo-150 transition-colors text-xs self-start sm:self-auto"
                                        >
                                          Apply Again
                                        </button>
                                      )
                                    )}
                                  </>
                                );
                              }

                              return (
                                <p className="text-xs text-slate-400 font-medium">
                                  ⌛ Waiting for project owner review.
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            };

            const applicationsContent = !hasAny ? (
              <div className="p-16 border border-slate-200 border-dashed rounded-3xl text-center bg-white shadow-sm">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                <p className="text-slate-550 font-bold text-sm">You have not submitted any teammate applications yet.</p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Discover Open Teams
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {renderAppGroup('Active Teams', activeApps, 'active', 'No active teams yet.')}
                {renderAppGroup('Pending Applications', pendingApps, 'pending', 'No pending applications.')}
                {renderAppGroup('Rejected Applications', rejectedApps, 'rejected', 'No rejected applications.')}
                {renderAppGroup('Withdrawn Applications', withdrawnApps, 'withdrawn', 'No withdrawn applications.')}
                {renderAppGroup('Past Teams', leftApps, 'left', 'No past teams yet.')}
              </div>
            );

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left 2 columns: Teammate Applications */}
                <div className="lg:col-span-2 space-y-8">
                  {applicationsContent}
                </div>

                {/* Right Column: My Project Work & Tasks Summary */}
                <div className="space-y-6 lg:sticky lg:top-6">
                  {/* Task Stats Block */}
                  <div className="p-6 bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-white border border-indigo-100 rounded-3xl shadow-sm space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span>My Project Work</span>
                      </h3>
                      <p className="text-[11px] text-slate-450 font-semibold mt-1">Real-time status of your assigned project milestones.</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider">Assigned</span>
                        <span className="text-lg font-black text-slate-800 mt-1 block">{myTasks.length}</span>
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <span className="text-[9px] font-black text-emerald-500 uppercase block tracking-wider">Verified</span>
                        <span className="text-lg font-black text-emerald-600 mt-1 block">{myTasks.filter(t => t.status === 'verified').length}</span>
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <span className="text-[9px] font-black text-indigo-500 uppercase block tracking-wider">In Progress</span>
                        <span className="text-lg font-black text-indigo-600 mt-1 block">{myTasks.filter(t => ['assigned', 'in_progress', 'extended', 'extension_requested'].includes(t.status) && new Date(t.due_at) >= new Date()).length}</span>
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <span className="text-[9px] font-black text-rose-500 uppercase block tracking-wider">Overdue</span>
                        <span className="text-lg font-black text-rose-600 mt-1 block">{myTasks.filter(t => t.status === 'overdue' || (['assigned', 'in_progress', 'extended', 'extension_requested'].includes(t.status) && new Date(t.due_at) < new Date())).length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Task Timeline</span>
                      <span className="px-2 py-0.5 bg-slate-150 text-slate-600 text-[10px] font-extrabold rounded-full">{myTasks.length}</span>
                    </h4>

                    {myTasks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-8">No tasks have been assigned to you yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-[450px] overflow-y-auto thin-scrollbar pr-1">
                        {myTasks.map(task => {
                          const isOverdue = task.status !== 'verified' && (task.status === 'overdue' || new Date(task.due_at) < new Date());
                          const statusColor =
                            task.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            task.status === 'submitted' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            task.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-indigo-50 text-indigo-700 border-indigo-200';
                          
                          return (
                            <div key={task.id} className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-150 rounded-2xl transition-all space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h5 className="text-xs font-black text-slate-800 truncate" title={task.title}>{task.title}</h5>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                                    Project: <span className="text-slate-500 font-bold">{task.project?.title || 'Unknown'}</span>
                                  </p>
                                </div>
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md border uppercase tracking-wider whitespace-nowrap self-start ${statusColor}`}>
                                  {isOverdue ? 'OVERDUE' : task.status}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
                                <span className="text-slate-400 font-medium">
                                  Due: <span className="font-semibold text-slate-600">{new Date(task.due_at).toLocaleDateString()}</span>
                                </span>
                                <button
                                  onClick={() => loadWorkspace(task.project_id)}
                                  className="text-indigo-600 hover:text-indigo-800 font-extrabold transition-colors flex items-center gap-0.5"
                                >
                                  <span>Workspace</span>
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>

                              {task.status === 'rejected' && task.rejection_reason && (
                                <div className="p-2 bg-red-50/50 rounded-lg border border-red-100 text-[10px] text-red-700 italic">
                                  <span className="font-bold not-italic">Rejection Feedback:</span> "{task.rejection_reason}"
                                </div>
                              )}
                              {task.status === 'verified' && task.completed_at && (
                                <div className="text-[9px] text-emerald-600 font-bold">
                                  ✓ Verified on {new Date(task.completed_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
          {/* TAB 4: TEAM WORKSPACE */}
          {activeTab === 'workspace' && selectedProject && (selectedProject.is_owner || selectedProject.is_member) && (
            <div className="space-y-6">
              
              {/* Workspace Main Details */}
              <div className="space-y-6">
                {(() => {
                  const openRolesCount = selectedProject.roles
                    ? selectedProject.roles.reduce((sum, r) => sum + Math.max(0, r.slots_needed - (r.slots_filled || 0)), 0)
                    : 0;

                  return (
                    <div className="w-full max-w-full min-w-0 overflow-hidden p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150">
                            Workspace
                          </span>
                          <h3 className="text-2xl font-black text-slate-800 leading-tight mt-1.5 break-words break-all">{selectedProject.title}</h3>
                        </div>

                        {selectedProject.is_owner ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">Update Status:</span>
                            <select
                              value={selectedProject.status}
                              onChange={e => handleStatusUpdate(e.target.value)}
                              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-black bg-slate-50 text-slate-700 focus:outline-none focus:border-indigo-500 shadow-sm transition-all"
                            >
                              <option value="recruiting">Recruiting</option>
                              <option value="in_progress">In Progress</option>
                              <option value="team_full">Team Full</option>
                              <option value="completed">Completed</option>
                              <option value="paused">Paused</option>
                              <option value="archived">Archived</option>
                            </select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">Status:</span>
                            {(() => {
                              const statusColors = {
                                recruiting: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                                in_progress: 'bg-emerald-50 text-emerald-700 border-emerald-250',
                                team_full: 'bg-amber-50 text-amber-700 border-amber-250',
                                completed: 'bg-teal-50 text-teal-700 border-teal-250',
                                paused: 'bg-slate-100 text-slate-650 border-slate-250',
                                archived: 'bg-rose-50 text-rose-700 border-rose-250'
                              };
                              const statusLabels = {
                                recruiting: 'Recruiting',
                                in_progress: 'In Progress',
                                team_full: 'Team Full',
                                completed: 'Completed',
                                paused: 'Paused',
                                archived: 'Archived'
                              };
                              const cls = statusColors[selectedProject.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-650 border-slate-200';
                              const label = statusLabels[selectedProject.status as keyof typeof statusLabels] || selectedProject.status;
                              return (
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase border tracking-wider ${cls}`}>
                                  {label}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed font-medium break-words">{selectedProject.description}</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-2xl text-xs font-bold border border-slate-150">
                        <div className="min-w-0 p-3 bg-white border border-slate-200/50 rounded-xl shadow-xs">
                          <p className="text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">Difficulty</p>
                          <p className="text-slate-800 text-sm font-black">{selectedProject.difficulty_level}</p>
                        </div>
                        <div className="min-w-0 p-3 bg-white border border-slate-200/50 rounded-xl shadow-xs">
                          <p className="text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">Work Mode</p>
                          <p className="text-slate-800 text-sm font-black">{selectedProject.work_mode}</p>
                        </div>
                        <div className="min-w-0 p-3 bg-white border border-slate-200/50 rounded-xl shadow-xs">
                          <p className="text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">Type</p>
                          <p className="text-slate-800 text-sm font-black truncate" title={formatProjectDisplayType(selectedProject.project_type)}>
                            {formatProjectDisplayType(selectedProject.project_type)}
                          </p>
                        </div>
                        <div className="min-w-0 p-3 bg-white border border-slate-200/50 rounded-xl shadow-xs">
                          <p className="text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">Capacity</p>
                          <p className="text-slate-800 text-sm font-black">{teamMembers.length} / {selectedProject.max_team_size}</p>
                        </div>
                        <div className="min-w-0 p-3 bg-white border border-slate-200/50 rounded-xl shadow-xs">
                          <p className="text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">Open Roles</p>
                          <p className={`text-slate-800 text-sm font-black ${openRolesCount > 0 ? 'text-indigo-600' : 'text-slate-500'}`}>
                            {openRolesCount} {openRolesCount === 1 ? 'slot' : 'slots'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Subtab Navigation Bar */}
                <div className="flex w-full min-w-0 max-w-full overflow-x-auto whitespace-nowrap thin-scrollbar border-b border-slate-200 bg-white p-2 rounded-2xl shadow-sm gap-2">
                  <button
                    onClick={() => setWorkspaceSubTab('coordination')}
                    className={`shrink-0 px-4 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 ${
                      workspaceSubTab === 'coordination'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Coordination &amp; Settings</span>
                  </button>
                  <button
                    onClick={() => setWorkspaceSubTab('discussion')}
                    className={`shrink-0 px-4 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 ${
                      workspaceSubTab === 'discussion'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Team Discussion</span>
                  </button>
                  <button
                    onClick={() => setWorkspaceSubTab('resources')}
                    className={`shrink-0 px-4 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 ${
                      workspaceSubTab === 'resources'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Shared Resources</span>
                  </button>
                  <button
                    onClick={() => setWorkspaceSubTab('tasks')}
                    className={`shrink-0 px-4 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 ${
                      workspaceSubTab === 'tasks'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span>Project Tasks</span>
                  </button>
                </div>

                {/* Subtab Content */}
                                {workspaceSubTab === 'coordination' && (
                  <div className="grid w-full max-w-full min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] gap-6">
                    <div className="min-w-0 max-w-full space-y-6">

                    {/* PHASE 6.3C: Completed Project Summary Banner */}
                    {(selectedProject.status === 'completed' || selectedProject.status === 'archived' || selectedProject.status === 'paused') && (
                      <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-black px-3 py-1 rounded-full border uppercase tracking-wider ${
                            selectedProject.status === 'completed' 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            {selectedProject.status === 'completed' ? '✅ Project Completed' : selectedProject.status === 'paused' ? '⏸️ Paused Project' : '📦 Archived Project'}
                          </span>
                          {selectedProject.completed_at && (
                            <span className="text-xs text-slate-500 font-semibold">
                              Completed on {new Date(selectedProject.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          )}
                          {selectedProject.archived_at && (
                            <span className="text-xs text-slate-500 font-semibold">
                              Archived on {new Date(selectedProject.archived_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {selectedProject.completion_summary && (
                          <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
                            <p className="text-xs font-black text-slate-600 mb-1">Team Lead Note:</p>
                            <p className="text-sm text-slate-700 italic leading-relaxed">"{selectedProject.completion_summary}"</p>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-2 bg-white/70 rounded-xl border border-emerald-100">
                            <p className="text-lg font-black text-slate-800">{teamMembers.length}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Members</p>
                          </div>
                          <div className="text-center p-2 bg-white/70 rounded-xl border border-emerald-100">
                            <p className="text-lg font-black text-slate-800">{resources.length}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Resources</p>
                          </div>
                          <div className="text-center p-2 bg-white/70 rounded-xl border border-emerald-100">
                            <p className="text-lg font-black text-slate-800">{discussionPosts.length}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Posts</p>
                          </div>
                        </div>
                        {selectedProject.is_owner && (
                          <div className="flex gap-2 pt-1">
                            {selectedProject.status === 'completed' && (
                              <>
                                <button
                                  onClick={() => handleRestoreProject(selectedProject.id, 'in_progress')}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-colors"
                                >
                                  Restore to Running
                                </button>
                                <button
                                  onClick={() => handleArchiveProjectConfirm(selectedProject.id)}
                                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-lg border border-slate-200 transition-colors"
                                >
                                  Archive
                                </button>
                              </>
                            )}
                            {(selectedProject.status === 'archived' || selectedProject.status === 'paused') && (
                              <button
                                onClick={() => handleRestoreProject(selectedProject.id, 'recruiting')}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 transition-colors"
                              >
                                Restore to Recruiting
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Secure Coordination Details (Owner and Active Members only) */}
                    <div className="p-6 bg-slate-900 text-slate-100 rounded-3xl shadow-xl space-y-4 relative overflow-hidden border border-slate-800">

                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                          <span className="text-indigo-400 shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          </span>
                          Secure Team Coordination
                        </h4>
                        
                        {selectedProject.is_owner && !isEditingLinks && (
                          <button
                            onClick={startEditingLinks}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-lg transition-colors"
                          >
                            Edit Credentials
                          </button>
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-400">
                        🔒 These fields are highly classified and visible strictly to accepted teammates.
                      </p>

                      {isEditingLinks ? (
                        <form onSubmit={handleSaveCoordinates} className="space-y-6 pt-2 text-xs">
                          {/* Segment 1: Basic Project Details */}
                          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-4">
                            <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-1">
                              1. Basic Project Details
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                <label className="block font-bold text-slate-300 mb-1">Project Title *</label>
                                <input
                                  type="text"
                                  required
                                  value={editTitle}
                                  onChange={e => setEditTitle(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Minimum 5 characters.</span>
                              </div>

                              <div className="md:col-span-2">
                                <label className="block font-bold text-slate-300 mb-1">One-Line Summary / Slogan</label>
                                <input
                                  type="text"
                                  value={editSummary}
                                  onChange={e => setEditSummary(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block font-bold text-slate-300 mb-1">Detailed Description *</label>
                                <textarea
                                  required
                                  rows={4}
                                  value={editDescription}
                                  onChange={e => setEditDescription(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Minimum 20 characters.</span>
                              </div>

                              <div>
                                <label className="block font-bold text-slate-300 mb-1">Category *</label>
                                <input
                                  type="text"
                                  required
                                  value={editCategory}
                                  onChange={e => setEditCategory(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-slate-300 mb-1">Project Type *</label>
                                <input
                                  type="text"
                                  required
                                  value={editProjectType}
                                  onChange={e => setEditProjectType(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-slate-300 mb-1">Difficulty level *</label>
                                <select
                                  value={editDifficultyLevel}
                                  onChange={e => setEditDifficultyLevel(e.target.value as ProjectDifficulty)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none"
                                >
                                  {DIFFICULTIES.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block font-bold text-slate-300 mb-1">Work Mode *</label>
                                <select
                                  value={editWorkMode}
                                  onChange={e => setEditWorkMode(e.target.value as ProjectWorkMode)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none"
                                >
                                  {WORK_MODES.map(w => (
                                    <option key={w} value={w}>{w}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Segment 2: Skills & Preferences */}
                          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-4">
                            <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-1">
                              2. Skills &amp; Preferences
                            </h5>
                            <div className="space-y-4">
                              <div>
                                <label className="block font-bold text-slate-300 mb-1">Required Skills (Comma separated)</label>
                                <input
                                  type="text"
                                  value={editRequiredSkills}
                                  onChange={e => setEditRequiredSkills(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <span className="block font-bold text-slate-300 mb-2">Preferred Departments</span>
                                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-slate-800 rounded-xl p-3 bg-slate-900">
                                    {DEPARTMENTS.filter(d => d !== 'Other').map(dept => (
                                      <label key={dept} className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={editPreferredDepartments.includes(dept)}
                                          onChange={() => togglePreferenceArr(dept, editPreferredDepartments, setEditPreferredDepartments)}
                                          className="rounded text-indigo-650 bg-slate-950 border-slate-800"
                                        />
                                        <span>{dept}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <span className="block font-bold text-slate-300 mb-2">Preferred Academic Year</span>
                                  <div className="grid grid-cols-1 gap-2 border border-slate-800 rounded-xl p-3 bg-slate-900">
                                    {ACADEMIC_YEARS.map(year => (
                                      <label key={year} className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={editPreferredYears.includes(year)}
                                          onChange={() => togglePreferenceArr(year, editPreferredYears, setEditPreferredYears)}
                                          className="rounded text-indigo-650 bg-slate-950 border-slate-800"
                                        />
                                        <span>{year}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-4 pt-1 font-semibold text-slate-300">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editIsBeginnerFriendly}
                                    onChange={e => setEditIsBeginnerFriendly(e.target.checked)}
                                    className="rounded text-indigo-600"
                                  />
                                  <span>Beginner Friendly Project</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editIsHackathon}
                                    onChange={e => setEditIsHackathon(e.target.checked)}
                                    className="rounded text-indigo-600"
                                  />
                                  <span>Hackathon Team (Urgent recruitment)</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Segment 3: Timeline & Capacity */}
                          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-4">
                            <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-1">
                              3. Timeline &amp; Capacity
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block font-bold text-slate-300 mb-1">Project Status</label>
                                <select
                                  value={editStatus}
                                  onChange={e => setEditStatus(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none"
                                >
                                  <option value="recruiting">Recruiting</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="team_full">Team Full</option>
                                  <option value="completed">Completed</option>
                                  <option value="paused">Paused</option>
                                  <option value="archived">Archived</option>
                                </select>
                              </div>

                              <div>
                                <label className="block font-bold text-slate-300 mb-1">Expected Timeline</label>
                                <input
                                  type="text"
                                  value={editExpectedTimeline}
                                  onChange={e => setEditExpectedTimeline(e.target.value)}
                                  placeholder="e.g. 4-6 weeks, Hackathon weekend"
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-slate-300 mb-1">Meeting Preference</label>
                                <input
                                  type="text"
                                  value={editMeetingPreference}
                                  onChange={e => setEditMeetingPreference(e.target.value)}
                                  placeholder="e.g. Tuesdays at 7 PM"
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-slate-300 mb-1">Maximum Team Size (Capacity limit)</label>
                                <input
                                  type="number"
                                  min={Math.max(2, teamMembers.length)}
                                  max={20}
                                  value={editMaxTeamSize}
                                  onChange={e => setEditMaxTeamSize(Number(e.target.value))}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Cannot be lower than active roster count ({teamMembers.length}).</span>
                              </div>

                              <div>
                                <label className="block font-bold text-slate-300 mb-1">Application Deadline</label>
                                <input
                                  type="date"
                                  value={editDeadline}
                                  onChange={e => setEditDeadline(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Segment 4: Role Slots (Read-only Summary) */}
                          {selectedProject.roles && selectedProject.roles.length > 0 && (
                            <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-3">
                              <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-1">
                                4. Role Slots (Read-only Summary)
                              </h5>
                              <div className="space-y-2">
                                {selectedProject.roles.map(r => (
                                  <div key={r.id} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs flex justify-between items-center text-slate-300">
                                    <div>
                                      <span className="font-bold">{r.role_name}</span>
                                      <span className="text-[10px] block text-slate-400">Filled: {r.slots_filled} / {r.slots_needed} slots</span>
                                    </div>
                                    <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded text-[9px] font-black uppercase border border-indigo-900">
                                      {r.priority} priority
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Segment 5: Secure Coordination */}
                          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-4">
                            <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-1">
                              5. Secure Coordination &amp; Links
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block font-bold text-slate-300 mb-1">Coordination Link (Meet, WhatsApp, etc.)</label>
                                <input
                                  type="text"
                                  value={editCoordLink}
                                  onChange={e => setEditCoordLink(e.target.value)}
                                  placeholder="https://..."
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Must be an https:// URL.</span>
                              </div>

                              <div>
                                <label className="block font-bold text-slate-300 mb-1">GitHub Repository Link</label>
                                <input
                                  type="text"
                                  value={editGithubUrl}
                                  onChange={e => setEditGithubUrl(e.target.value)}
                                  placeholder="https://github.com/..."
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Must be an https:// URL.</span>
                              </div>

                              <div className="md:col-span-2">
                                <label className="block font-bold text-slate-300 mb-1">Shared Workspace Document</label>
                                <input
                                  type="text"
                                  value={editSharedDocUrl}
                                  onChange={e => setEditSharedDocUrl(e.target.value)}
                                  placeholder="https://docs.google.com/..."
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Must be an https:// URL.</span>
                              </div>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-300 mb-1">Private Tasks &amp; Notes</label>
                              <textarea
                                rows={4}
                                value={editPrivateNotes}
                                onChange={e => setEditPrivateNotes(e.target.value)}
                                placeholder="Add task lists, milestones, API credentials safely..."
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => setIsEditingLinks(false)}
                              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl transition-colors border border-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={actionLoading}
                              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors"
                            >
                              {actionLoading ? 'Saving...' : 'Save All Settings'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-4 pt-2 text-sm">
                          <div>
                            <span className="block font-bold text-slate-400 text-xs">Meeting Coordination Coordinate:</span>
                            {selectedProject.coordination_link ? (
                              <a
                                href={selectedProject.coordination_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <span>{selectedProject.coordination_link}</span>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            ) : (
                              <span className="text-slate-500 italic text-xs block mt-0.5">No meeting coordination link registered yet.</span>
                            )}
                          </div>

                          <div>
                            <span className="block font-bold text-slate-400 text-xs">GitHub Repository:</span>
                            {selectedProject.github_repo_url ? (
                              <a
                                href={selectedProject.github_repo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <span>{selectedProject.github_repo_url}</span>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            ) : (
                              <span className="text-slate-500 italic text-xs block mt-0.5">No private repository shared.</span>
                            )}
                          </div>

                          <div>
                            <span className="block font-bold text-slate-400 text-xs">Shared Workspace Document:</span>
                            {selectedProject.shared_doc_url ? (
                              <a
                                href={selectedProject.shared_doc_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <span>{selectedProject.shared_doc_url}</span>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            ) : (
                              <span className="text-slate-500 italic text-xs block mt-0.5">No shared collaborative documents shared.</span>
                            )}
                          </div>

                          <div className="border-t border-slate-800 pt-3">
                            <span className="block font-bold text-slate-400 text-xs mb-1">Private Tasks &amp; Notes:</span>
                            {selectedProject.private_notes ? (
                              <p className="bg-slate-850 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                                {selectedProject.private_notes}
                              </p>
                            ) : (
                              <span className="text-slate-500 italic text-xs block">No private team notes added.</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Owner Applicant Management Queue */}
                    {selectedProject.is_owner && (
                      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                        <h4 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <span>Applications Queue</span>
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
                            {pendingApplicants.length} pending
                          </span>
                        </h4>

                        {pendingApplicants.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-4">
                            No pending team applications yet.
                          </p>
                        ) : (
                          <div className={`space-y-4 pr-1 ${pendingApplicants.length > 3 ? 'max-h-[280px] overflow-y-auto thin-scrollbar' : ''}`}>
                            {[...pendingApplicants]
                              .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
                              .map(app => (
                              <div key={app.id} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3 shadow-xs">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200/60 pb-2.5 gap-2">
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedUserIdForProfile(app.applicant_id)}
                                      className="text-md font-black text-indigo-600 hover:underline text-left block"
                                    >
                                      {app.applicant_profile?.full_name}
                                    </button>
                                    <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">
                                      {app.applicant_profile?.department} ({app.applicant_profile?.year_of_study})
                                    </span>
                                  </div>

                                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 text-[10px] font-bold uppercase rounded-full self-start md:self-auto">
                                    Apply: {app.role_interest || 'General Member'}
                                  </span>
                                </div>

                                <div className="text-xs space-y-2 leading-relaxed text-slate-650">
                                  <p>
                                    <strong className="text-slate-700 font-bold block mb-1">Intro Message:</strong>
                                    <span className="bg-white/80 p-3 rounded-xl border border-slate-100 block italic whitespace-pre-wrap leading-relaxed shadow-inner">
                                      "{app.message}"
                                    </span>
                                  </p>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    {app.skills_snapshot && app.skills_snapshot.length > 0 && (
                                      <div className="p-2.5 bg-indigo-50/30 border border-indigo-100 rounded-xl">
                                        <strong className="text-[10px] uppercase text-indigo-750 tracking-wider block mb-1">Key Skills Snapshot</strong>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {app.skills_snapshot.map((skill: string) => (
                                            <span key={skill} className="px-1.5 py-0.5 bg-white border border-indigo-200 text-indigo-700 text-[9px] font-bold rounded">
                                              {skill.trim()}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {app.experience_summary && (
                                      <div className="p-2.5 bg-emerald-50/30 border border-emerald-100 rounded-xl">
                                        <strong className="text-[10px] uppercase text-emerald-700 tracking-wider block mb-0.5">Experience Summary</strong>
                                        <p className="italic text-slate-650 leading-relaxed text-[11px]">{app.experience_summary}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {app.expected_contribution && (
                                    <p className="text-[11px] pt-1">
                                      <strong className="text-slate-700 block">Expected Contribution:</strong>
                                      <span>{app.expected_contribution}</span>
                                    </p>
                                  )}
                                  
                                  {app.availability && (
                                    <p className="text-[11px]">
                                      <strong className="text-slate-700 block">Weekly Availability:</strong>
                                      <span>{app.availability}</span>
                                    </p>
                                  )}
                                  
                                  {app.portfolio_url && (
                                    <p className="text-[11px]">
                                      <span className="font-bold text-slate-700 block">Portfolio Coordinates:</span>
                                      <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold flex items-center gap-1">
                                        <span>{app.portfolio_url}</span>
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      </a>
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-2 justify-end pt-3 border-t border-slate-200/50">
                                  <button
                                    onClick={() => openResponseDialog(app.id, 'rejected')}
                                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-655 border border-red-150 font-bold text-xs rounded-xl transition-colors shadow-sm"
                                    type="button"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => openResponseDialog(app.id, 'accepted')}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow"
                                    type="button"
                                  >
                                    Accept
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                                      {/* Collapsible Project Team Guide Section */}
                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl shadow-xl border border-indigo-850 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setIsGuideOpen(!isGuideOpen)}
                        className="w-full p-5 text-left flex items-center justify-between hover:bg-indigo-950/30 transition-colors focus:outline-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-400 shrink-0 text-xl">📖</span>
                          <span className="text-base font-black tracking-tight">Project Team Guide &amp; Code of Conduct</span>
                        </div>
                        <span className="text-xs text-indigo-300 font-bold bg-indigo-950/60 border border-indigo-800 px-3 py-1 rounded-xl shadow-inner">
                          {isGuideOpen ? 'Hide Guidelines ▲' : 'Show Guidelines ▼'}
                        </span>
                      </button>

                      {isGuideOpen && (
                        <div className="p-6 border-t border-indigo-800/50 space-y-5 text-xs animate-fade-in">
                          <p className="text-indigo-205 leading-relaxed font-medium">
                            To maintain a professional, high-impact collaboration workspace, all teammates must adhere to our standard role capability bounds and data safety protocols.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Lead & Member Roles */}
                            <div className="p-4 bg-indigo-950/40 rounded-2xl border border-indigo-800/40 space-y-2.5">
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                                <span>👑</span> Project Owner / Lead
                              </h5>
                              <ul className="text-[10px] text-indigo-200 space-y-1.5 list-disc pl-4 leading-relaxed font-medium">
                                <li>Controls overall team capacity bounds and project recruiting status settings.</li>
                                <li>Vets, approves, or declines all submitted shared coordinates or resources.</li>
                                <li>Maintains team coordinates (Google Meet rooms, private repos, shared docs).</li>
                                <li>Ensures all external workspace coordinates utilize secure protocol boundaries.</li>
                              </ul>
                            </div>

                            <div className="p-4 bg-indigo-950/40 rounded-2xl border border-indigo-800/40 space-y-2.5">
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                                <span>🛡️</span> Teammates &amp; Specialists
                              </h5>
                              <ul className="text-[10px] text-indigo-200 space-y-1.5 list-disc pl-4 leading-relaxed font-medium">
                                <li>Engage in team discussions, ask questions, and publish task progress updates.</li>
                                <li>Upload study resources or materials to the leader verification queue.</li>
                                <li>Voluntarily depart from the project at any time with an explicit exit reason.</li>
                                <li>Never distribute credentials, notes, or internal coordinates externally.</li>
                              </ul>
                            </div>

                            {/* Boundaries & Rules */}
                            <div className="p-4 bg-indigo-950/40 rounded-2xl border border-indigo-800/40 space-y-2.5">
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                                <span>🔒</span> Applicant &amp; Roster Boundaries
                              </h5>
                              <ul className="text-[10px] text-indigo-200 space-y-1.5 list-disc pl-4 leading-relaxed font-medium">
                                <li>Non-members and pending applicants have strictly zero access to team workspaces.</li>
                                <li>Departed, kicked, or rejected former members lose workspace permissions instantly.</li>
                                <li>Active team capacity must strictly adhere to the capacity limit settings.</li>
                                <li>No private contact parameters (emails, phone numbers, WhatsApp, UUIDs) are exposed in workspaces.</li>
                              </ul>
                            </div>

                            <div className="p-4 bg-indigo-950/40 rounded-2xl border border-indigo-800/40 space-y-2.5">
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                                <span>📈</span> Resource Sharing &amp; discussion rules
                              </h5>
                              <ul className="text-[10px] text-indigo-200 space-y-1.5 list-disc pl-4 leading-relaxed font-medium">
                                <li>All links must strictly be HTTPS-only. Uploaded files must not exceed 10 MB.</li>
                                <li>Hazardous executables are blocked. Member uploads go to the Leader queue for approval.</li>
                                <li>Use appropriate category tags in discussion boards to structure posts.</li>
                                <li>Announcements are restricted to leads. Upvote posts with Helpful badges to indicate utility.</li>
                              </ul>
                            </div>
                          </div>

                          {/* Red Warning Alert block */}
                          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] text-red-200 leading-relaxed flex items-start gap-2.5">
                            <span className="shrink-0 text-base">⚠️</span>
                            <div>
                              <strong className="font-extrabold block text-red-300 mb-0.5">Secure Credentials Security Protocol</strong>
                              Always inspect and ensure that coordination links, repos, and documents utilize the strict `https://` protocol. Never upload executable binary formats (`.exe, .bat, .sh, .scr, .apk, .jar`) as they trigger active warnings. Protect UUID strings, emails, and phone numbers from public leakage to safeguard campus privacy.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                                      </div>
                    <div className="w-full max-w-full min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto thin-scrollbar xl:pr-1">

                {/* === PHASE 6.3C: ROLE MANAGEMENT PANEL === */}
                {selectedProject.is_owner && (
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Role Slots
                        <span className="ml-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 text-[10px] font-bold rounded-full">
                          {selectedProject.roles?.length || 0}
                        </span>
                      </h4>
                      {!isAddingRole && !editingRoleId && (
                        <button
                          onClick={() => { setIsAddingRole(true); setEditingRoleId(null); setNewRoleName(''); setNewRoleDescription(''); setNewRoleSkills(''); setNewRoleSlots(1); setNewRolePriority('medium'); }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors"
                        >
                          + Add Role
                        </button>
                      )}
                    </div>

                    {/* Roles List */}
                    <div className={`min-w-0 space-y-3 ${selectedProject.roles && selectedProject.roles.length > 4 ? 'max-h-[320px] overflow-y-auto thin-scrollbar pr-1' : ''}`}>
                      {(!selectedProject.roles || selectedProject.roles.length === 0) && !isAddingRole && (
                        <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          No roles defined yet. Add roles to structure your team.
                        </p>
                      )}
                      {selectedProject.roles && selectedProject.roles.map((role: any) => {
                        const isFilled = role.slots_filled >= role.slots_needed;
                        const fillPercentage = Math.min(100, Math.round(((role.slots_filled || 0) / role.slots_needed) * 100));
                        const isEditing = editingRoleId === role.id;
                        
                        if (isEditing) {
                          return (
                            <form key={role.id} onSubmit={handleUpdateRoleSubmit} className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3 text-xs shadow-sm">
                              <p className="font-black text-indigo-800 text-[10px] uppercase tracking-wider mb-1">Edit Role</p>
                              <div className="space-y-2">
                                <input required value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Role name (e.g. Backend Dev)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                                <input value={newRoleDescription} onChange={e => setNewRoleDescription(e.target.value)} placeholder="Short description (optional)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                                <input value={newRoleSkills} onChange={e => setNewRoleSkills(e.target.value)} placeholder="Required skills (comma-separated)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Slots Needed</label>
                                  <input type="number" min={role.slots_filled || 1} max={10} value={newRoleSlots} onChange={e => setNewRoleSlots(Number(e.target.value))} className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                                  {role.slots_filled > 0 && <p className="text-[9px] text-slate-400 mt-1">Cannot go below {role.slots_filled} (filled)</p>}
                                </div>
                                <div className="flex-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                                  <select value={newRolePriority} onChange={e => setNewRolePriority(e.target.value as any)} className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400">
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex gap-2 pt-2 border-t border-indigo-150">
                                <button type="submit" disabled={actionLoading} className="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50">Save Changes</button>
                                <button type="button" onClick={() => setEditingRoleId(null)} className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold rounded-lg text-xs transition-colors">Cancel</button>
                              </div>
                            </form>
                          );
                        }
                        
                        return (
                          <div key={role.id} className={`flex items-start justify-between p-3.5 rounded-xl border text-xs gap-3 transition-colors ${isFilled ? 'bg-slate-50 border-slate-200/60' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`font-black truncate ${isFilled ? 'text-slate-500' : 'text-slate-800 text-sm'}`}>{role.role_name}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                                  role.priority === 'high' ? 'bg-red-50 text-red-650 border border-red-150' :
                                  role.priority === 'medium' ? 'bg-amber-50 text-amber-650 border border-amber-150' :
                                  'bg-slate-100 text-slate-550 border border-slate-250'
                                }`}>{role.priority} priority</span>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="text-slate-500 uppercase tracking-wider">Fill Status</span>
                                  <span className={isFilled ? 'text-emerald-600' : 'text-indigo-600'}>
                                    {role.slots_filled || 0} / {role.slots_needed} slots
                                  </span>
                                </div>
                                <div className="w-full bg-slate-150 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${isFilled ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                    style={{ width: `${fillPercentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-1.5 shrink-0 pt-0.5">
                              <button
                                onClick={() => startEditRole(role)}
                                className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-650 rounded border border-slate-200 transition-colors shadow-sm"
                                title="Edit role"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role.id, role.role_name)}
                                disabled={(role.slots_filled || 0) > 0}
                                className="px-2 py-1 bg-white hover:bg-red-50 text-red-650 rounded border border-slate-200 hover:border-red-200 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200"
                                title={(role.slots_filled || 0) > 0 ? 'Cannot delete — role has active members' : 'Delete role'}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Role Form */}
                    {isAddingRole && (
                      <form onSubmit={handleAddRoleSubmit} className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3 text-xs shadow-sm mt-3">
                        <p className="font-black text-indigo-800 text-[10px] uppercase tracking-wider mb-1">Add New Role</p>
                        <div className="space-y-2">
                          <input required value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Role name (e.g. UI Designer)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                          <input value={newRoleDescription} onChange={e => setNewRoleDescription(e.target.value)} placeholder="Short description (optional)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                          <input value={newRoleSkills} onChange={e => setNewRoleSkills(e.target.value)} placeholder="Required skills (comma-separated)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Slots Needed</label>
                            <input type="number" min={1} max={10} value={newRoleSlots} onChange={e => setNewRoleSlots(Number(e.target.value))} className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                            <select value={newRolePriority} onChange={e => setNewRolePriority(e.target.value as any)} className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400">
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-indigo-150">
                          <button type="submit" disabled={actionLoading} className="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50">Add Role</button>
                          <button type="button" onClick={() => setIsAddingRole(false)} className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 font-bold rounded-lg text-xs transition-colors">Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                 {/* Active Roster List (Teammates Console) */}
                <div className="w-full max-w-full min-w-0 overflow-hidden p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                    <h4 className="text-md font-black text-slate-800 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      Teammates
                      <span className="ml-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 text-[10px] font-bold rounded-full">
                        {teamMembers.length} / {selectedProject.max_team_size}
                      </span>
                    </h4>
                    
                    {teamMembers.length > 3 && (
                      <div className="flex flex-col sm:flex-row gap-2 w-full min-w-0 sm:w-auto">
                        <input
                          type="text"
                          placeholder="Search members..."
                          value={teammateSearch}
                          onChange={(e) => setTeammateSearch(e.target.value)}
                          className="w-full min-w-0 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-slate-50 flex-1 sm:w-32"
                        />
                        <select
                          value={teammateRoleFilter}
                          onChange={(e) => setTeammateRoleFilter(e.target.value)}
                          className="w-full min-w-0 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-slate-50 flex-1 sm:w-32"
                        >
                          <option value="">All Roles</option>
                          <option value="owner">Project Lead</option>
                          {Array.from(new Set(teamMembers.map(m => m.role_name).filter(Boolean))).map(role => (
                            role !== 'Project Lead' && <option key={role as string} value={role as string}>{role}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="w-full min-w-0 max-w-full max-h-[360px] space-y-3.5 divide-y divide-slate-100 overflow-y-auto thin-scrollbar pr-1">
                    {(() => {
                      let filteredMembers = [...teamMembers];
                      
                      if (teammateSearch) {
                        const s = teammateSearch.toLowerCase();
                        filteredMembers = filteredMembers.filter(m => m.profile?.full_name?.toLowerCase().includes(s));
                      }
                      
                      if (teammateRoleFilter) {
                        if (teammateRoleFilter === 'owner') {
                          filteredMembers = filteredMembers.filter(m => m.user_id === selectedProject.created_by);
                        } else {
                          filteredMembers = filteredMembers.filter(m => m.role_name === teammateRoleFilter);
                        }
                      }

                      const activeMembersSorted = filteredMembers.sort((a, b) => {
                        const isOwnerA = a.user_id === selectedProject.created_by;
                        const isOwnerB = b.user_id === selectedProject.created_by;
                        if (isOwnerA) return -1;
                        if (isOwnerB) return 1;
                        const nameA = a.profile?.full_name || '';
                        const nameB = b.profile?.full_name || '';
                        return nameA.localeCompare(nameB);
                      });

                      if (activeMembersSorted.length === 0) {
                        return (
                          <div className="py-6 text-center text-xs text-slate-400 italic">
                            No teammates found matching your filters.
                          </div>
                        );
                      }

                      return activeMembersSorted.map((member, idx) => {
                        const isOwner = member.user_id === selectedProject.created_by;
                        const initials = member.profile?.full_name 
                          ? member.profile.full_name.split(' ').filter(n => n.length > 0).map(n => n[0]).slice(0, 2).join('').toUpperCase()
                          : 'SS';
                        
                        // Calculate teammate task counts dynamically from projectTasks
                        const memberTasks = projectTasks.filter(t => t.assigned_to === member.user_id);
                        const assignedTasksCount = memberTasks.filter(t => t.status === 'assigned').length;
                        const verifiedTasksCount = memberTasks.filter(t => t.status === 'verified').length;
                        const pendingTasksCount = memberTasks.filter(t => ['in_progress', 'submitted', 'extension_requested', 'extended'].includes(t.status)).length;
                        const overdueTasksCount = memberTasks.filter(t => {
                          return t.status !== 'verified' && t.status !== 'cancelled' && new Date(t.due_at) < new Date();
                        }).length;

                        return (
                          <div key={member.id} className={`flex w-full min-w-0 max-w-full flex-col gap-3 overflow-hidden text-xs ${idx > 0 ? 'pt-3.5' : ''}`}>
                            <div className="flex min-w-0 gap-3 overflow-hidden">
                              {/* circular initials avatar */}
                              <div className="w-10 h-10 rounded-full bg-indigo-50/80 border border-indigo-150 text-indigo-700 font-black flex items-center justify-center text-sm shrink-0 shadow-sm">
                                {initials}
                              </div>
                              <div className="min-w-0 space-y-0.5 overflow-hidden">
                                <h5 className="font-extrabold text-slate-800 text-sm leading-tight break-words">
                                  {member.profile?.full_name}
                                </h5>
                                <span className="text-[10px] text-slate-500 block font-medium break-words">
                                  {member.profile?.department} ({member.profile?.year_of_study})
                                </span>

                                <div className="flex flex-wrap gap-2 text-[9px] text-slate-400 font-bold mt-1 shrink-0">
                                  <span>Assigned: <strong className="text-slate-600">{assignedTasksCount}</strong></span>
                                  <span className="text-slate-300">·</span>
                                  <span>Verified: <strong className="text-emerald-600">{verifiedTasksCount}</strong></span>
                                  <span className="text-slate-300">·</span>
                                  <span>Pending: <strong className="text-indigo-650">{pendingTasksCount}</strong></span>
                                  {overdueTasksCount > 0 && (
                                    <>
                                      <span className="text-slate-300">·</span>
                                      <span className="text-rose-600 font-extrabold">⚠️ Overdue: {overdueTasksCount}</span>
                                    </>
                                  )}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  {isOwner && (
                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-250 text-[9px] font-black uppercase rounded shadow-xs">
                                      👑 Lead
                                    </span>
                                  )}
                                  {member.role_name && member.role_name !== 'Project Lead' && (
                                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 text-[9px] font-bold rounded shadow-xs">
                                      {member.role_name}
                                    </span>
                                  )}
                                  {/* Public-safe profile links */}
                                  {member.profile?.github_url && (
                                    <a
                                      href={member.profile.github_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={`GitHub: ${member.profile.github_url}`}
                                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[9px] font-bold rounded shadow-xs transition-colors flex items-center gap-0.5"
                                    >
                                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                      GitHub
                                    </a>
                                  )}
                                  {member.profile?.linkedin_url && (
                                    <a
                                      href={member.profile.linkedin_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={`LinkedIn: ${member.profile.linkedin_url}`}
                                      className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-150 text-[9px] font-bold rounded shadow-xs transition-colors flex items-center gap-0.5"
                                    >
                                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                      LinkedIn
                                    </a>
                                  )}
                                  {member.profile?.portfolio_url && (
                                    <a
                                      href={member.profile.portfolio_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={`Portfolio: ${member.profile.portfolio_url}`}
                                      className="px-1.5 py-0.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-150 text-[9px] font-bold rounded shadow-xs transition-colors flex items-center gap-0.5"
                                    >
                                      🌐 Portfolio
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                              <span className="text-[9px] text-slate-400 font-medium">
                                Joined {new Date(member.joined_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserIdForProfile(member.user_id)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-650 rounded border border-slate-200 transition-colors shadow-sm font-bold"
                                >
                                  Profile
                                </button>
                                
                                {selectedProject.is_owner && member.user_id !== user?.id && (
                                  <button
                                    onClick={() => {
                                      setExitingMemberId(member.user_id);
                                      setIsKickModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 font-bold rounded border border-slate-200 hover:border-red-200 transition-colors shadow-sm"
                                  >
                                    Kick
                                  </button>
                                )}
                                
                                {!selectedProject.is_owner && member.user_id === user?.id && (
                                  <button
                                    onClick={() => setIsLeaveModalOpen(true)}
                                    className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 font-bold rounded border border-slate-200 hover:border-red-200 transition-colors shadow-sm"
                                  >
                                    Leave Team
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Past Members Section (Owner Only) */}
                {selectedProject.is_owner && pastTeamMembers.length > 0 && (
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm space-y-3">
                    <button
                      onClick={() => setIsPastRosterOpen(!isPastRosterOpen)}
                      className="w-full flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider focus:outline-none hover:text-slate-700 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>⌛ Past Members / Team History</span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                          {pastTeamMembers.length}
                        </span>
                      </span>
                      <span>{isPastRosterOpen ? '▼' : '▶'}</span>
                    </button>

                    {isPastRosterOpen && (
                      <div className="pt-2">
                        {pastTeamMembers.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic text-center py-4 bg-white rounded-xl border border-slate-150">
                            No team history recorded.
                          </p>
                        ) : (
                          <div className="max-h-[280px] divide-y divide-slate-200/60 overflow-y-auto thin-scrollbar pr-1">
                            {[...pastTeamMembers]
                              .sort((a, b) => new Date(b.left_at || '').getTime() - new Date(a.left_at || '').getTime())
                              .map((member, idx) => {
                                const isRemoved = !!member.removed_by;
                                return (
                                  <div key={member.id} className={`min-w-0 overflow-hidden text-xs text-slate-500 space-y-1.5 pb-3 ${idx > 0 ? 'pt-3' : ''}`}>
                                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5">
                                      <span className="min-w-0 break-words font-extrabold text-slate-800">{member.profile?.full_name}</span>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                        isRemoved ? 'bg-red-50 text-red-650 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                      }`}>
                                        {isRemoved ? 'Removed' : 'Left'}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      Role: {member.role_name || 'Team Member'} · Exit: {new Date(member.left_at!).toLocaleDateString()}
                                    </p>
                                    {member.leave_reason && (
                                      <div className="bg-white p-2 rounded-lg border border-slate-150 shadow-xs mt-1 relative">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 rounded-l-lg"></div>
                                        <p className="text-[10px] italic text-slate-550 leading-relaxed break-words pl-1.5">
                                          "{member.leave_reason}"
                                        </p>
                                      </div>
                                    )}
                                    <div className="pt-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedUserIdForProfile(member.user_id)}
                                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-650 border border-slate-200 shadow-sm rounded text-[9px] font-bold transition-all"
                                      >
                                        View Profile
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Sharing Panel — public-safe links always shown; private contact gated by share_* flags */}
                {(selectedProject.is_owner || selectedProject.is_member) && (
                  <div className="w-full max-w-full min-w-0 overflow-hidden p-5 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-150 rounded-2xl shadow-sm space-y-3">
                    <h4 className="text-xs font-black text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📬</span>
                      <span>Team Contact Sharing</span>
                    </h4>
                    <p className="text-[10px] text-indigo-600 font-semibold leading-relaxed">
                      🔒 Private contacts (email/phone/WhatsApp) are only visible when a teammate explicitly enables sharing. Public links (GitHub, LinkedIn, Portfolio) are always shown.
                    </p>
                    <div className="w-full min-w-0 max-w-full max-h-[260px] space-y-2 overflow-y-auto thin-scrollbar pr-1">
                      {teamMembers.map(member => {
                        const p = member.profile;
                        const isOwner = member.user_id === selectedProject.created_by;

                        // Public-safe links — always visible to active teammates
                        const publicLinks: { icon: string; label: string; url: string }[] = [];
                        if (p?.github_url) publicLinks.push({ icon: '💻', label: 'GitHub', url: p.github_url });
                        if (p?.linkedin_url) publicLinks.push({ icon: '🔗', label: 'LinkedIn', url: p.linkedin_url });
                        if (p?.portfolio_url) publicLinks.push({ icon: '🌐', label: 'Portfolio', url: p.portfolio_url });

                        // Private contacts — gated by share_* flags
                        const privateContacts: { icon: string; label: string; value: string }[] = [];
                        if ((p?.share_email_after_accept || p?.share_contact_after_accept) && p?.contact_email) {
                          privateContacts.push({ icon: '✉️', label: 'Email', value: p.contact_email });
                        }
                        if ((p?.share_whatsapp_after_accept || p?.share_contact_after_accept) && p?.contact_whatsapp) {
                          privateContacts.push({ icon: '💬', label: 'WhatsApp', value: p.contact_whatsapp });
                        }
                        if ((p?.share_phone_after_accept || p?.share_contact_after_accept) && p?.contact_phone) {
                          privateContacts.push({ icon: '📱', label: 'Phone', value: p.contact_phone });
                        }
                        if ((p?.share_other_contact_after_accept || p?.share_contact_after_accept) && p?.contact_other) {
                          privateContacts.push({ icon: '🔗', label: 'Other', value: p.contact_other });
                        }

                        const hasAnything = publicLinks.length > 0 || privateContacts.length > 0;

                        return (
                          <div key={member.id} className="min-w-0 overflow-hidden p-3 bg-white border border-indigo-100 rounded-xl shadow-xs space-y-1.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-b border-indigo-50 pb-1.5">
                              <span className="min-w-0 font-extrabold text-slate-800 text-xs break-words">{p?.full_name}</span>
                              {isOwner && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase rounded">Lead</span>}
                            </div>

                            {/* Public profile links */}
                            {publicLinks.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {publicLinks.map((lnk, li) => (
                                  <a
                                    key={li}
                                    href={lnk.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 text-[9px] font-bold rounded-lg transition-colors"
                                    title={lnk.url}
                                  >
                                    <span>{lnk.icon}</span>
                                    <span>{lnk.label}</span>
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Private contacts */}
                            {privateContacts.length > 0 && (
                              <div className="flex flex-col gap-1">
                                {privateContacts.map((c, ci) => (
                                  <div key={ci} className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px]">
                                    <span>{c.icon}</span>
                                    <span className="font-bold text-slate-500">{c.label}:</span>
                                    <span className="min-w-0 font-semibold text-slate-700 break-all">{c.value}</span>
                                    {c.label === 'WhatsApp' && c.value.startsWith('https') && (
                                      <button
                                        type="button"
                                        onClick={() => window.open(c.value, '_blank', 'noopener,noreferrer')}
                                        className="text-[8px] font-black text-indigo-600 hover:underline"
                                      >Open</button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Fallback when no contact info at all */}
                            {!hasAnything && (
                              <p className="text-[9px] text-slate-400 italic font-medium">
                                This teammate has not shared contact details. Use project discussion or shared workspace coordination.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Member Work History */}
                {projectTasks.length > 0 && (
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏆</span>
                      <span>Member Task History</span>
                    </h4>
                    <div className="min-w-0 max-h-[260px] space-y-2 overflow-y-auto thin-scrollbar pr-1">
                      {teamMembers.map(member => {
                        const memberTasks = projectTasks.filter(t => t.assigned_to === member.user_id);
                        const verified = memberTasks.filter(t => t.status === 'verified').length;
                        const inProgress = memberTasks.filter(t => ['assigned', 'in_progress', 'submitted', 'extension_requested', 'extended'].includes(t.status)).length;
                        const total = memberTasks.length;
                        if (total === 0) return null;
                        const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
                        const isOwner = member.user_id === selectedProject.created_by;
                        return (
                          <div key={member.id} className="min-w-0 overflow-hidden p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                            <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5">
                              <span className="min-w-0 font-extrabold text-slate-800 text-xs break-words">{member.profile?.full_name || 'Member'}</span>
                              {isOwner && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase rounded">Lead</span>}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="p-1 bg-white rounded-lg border border-slate-100">
                                <p className="text-sm font-black text-slate-800">{total}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Total</p>
                              </div>
                              <div className="p-1 bg-emerald-50 rounded-lg border border-emerald-100">
                                <p className="text-sm font-black text-emerald-700">{verified}</p>
                                <p className="text-[8px] font-bold text-emerald-500 uppercase">Done</p>
                              </div>
                              <div className="p-1 bg-indigo-50 rounded-lg border border-indigo-100">
                                <p className="text-sm font-black text-indigo-700">{inProgress}</p>
                                <p className="text-[8px] font-bold text-indigo-400 uppercase">Active</p>
                              </div>
                            </div>
                            {total > 0 && (
                              <div>
                                <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-0.5">
                                  <span>Progress</span>
                                  <span>{pct}% complete</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }).filter(Boolean)}
                      {teamMembers.every(m => projectTasks.filter(t => t.assigned_to === m.user_id).length === 0) && (
                        <p className="text-[10px] text-slate-400 italic text-center py-4">No tasks have been assigned yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Open positions info */}
                {/* Open positions info */}
                {selectedProject.roles && selectedProject.roles.length > 0 && (
                  <div className="w-full max-w-full min-w-0 overflow-hidden p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Required Slots</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px]">
                        {selectedProject.roles.reduce((acc, r) => acc + (r.slots_needed - r.slots_filled), 0)} open
                      </span>
                    </h4>
                    {(!selectedProject.roles || selectedProject.roles.length === 0) ? (
                      <p className="text-xs text-slate-450 italic text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                        All team positions have been filled! 🎉
                      </p>
                    ) : (
                      <div className="min-w-0 max-h-[240px] space-y-2 overflow-y-auto thin-scrollbar pr-1">
                        {[...selectedProject.roles]
                          .sort((a, b) => {
                            const aOpen = a.slots_needed - a.slots_filled > 0;
                            const bOpen = b.slots_needed - b.slots_filled > 0;
                            if (aOpen && !bOpen) return -1;
                            if (!aOpen && bOpen) return 1;
                            const pA = a.priority === 'high' ? 3 : a.priority === 'medium' ? 2 : 1;
                            const pB = b.priority === 'high' ? 3 : b.priority === 'medium' ? 2 : 1;
                            return pB - pA;
                          })
                          .map(r => {
                            const isFull = r.slots_filled >= r.slots_needed;
                            return (
                              <div key={r.id} className={`min-w-0 overflow-hidden p-3 rounded-xl border text-xs transition-colors ${
                                isFull 
                                  ? 'bg-slate-50 border-slate-150 opacity-70' 
                                  : 'bg-white border-indigo-100 shadow-sm'
                              }`}>
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5">
                                  <span className={`min-w-0 break-words font-bold ${isFull ? 'text-slate-500' : 'text-slate-800'}`}>
                                    {r.role_name}
                                  </span>
                                  {isFull ? (
                                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded text-[9px] font-black uppercase shadow-xs">
                                      Filled
                                    </span>
                                  ) : (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shadow-xs ${
                                      r.priority === 'high' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                      r.priority === 'medium' ? 'bg-indigo-50 text-indigo-600 border border-indigo-150' :
                                      'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}>
                                      {r.priority} Priority
                                    </span>
                                  )}
                                </div>
                                
                                <div className="mt-2">
                                  <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                                    <span>{r.slots_filled} FILLED</span>
                                    <span>{r.slots_needed} TOTAL</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-slate-150 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-slate-400' : 'bg-indigo-500'}`}
                                      style={{ width: `${Math.min(100, Math.max(0, (r.slots_filled / r.slots_needed) * 100))}%` }}
                                    ></div>
                                  </div>
                                </div>

                                {r.required_skills && r.required_skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-2">
                                    {r.required_skills.map((skill, sIdx) => (
                                      <span key={sIdx} className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                        isFull ? 'bg-slate-200/50 text-slate-400' : 'bg-indigo-50/50 text-indigo-500 border border-indigo-100'
                                      }`}>
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
                  </div>
                )}
                {/* Team Discussion Subtab View */}
                {workspaceSubTab === 'discussion' && (
                  <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-650 shrink-0 font-bold text-sm">💬</div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Threads</p>
                          <p className="text-lg font-black text-slate-800">{discussionPosts.length}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-650 shrink-0 font-bold text-sm">📌</div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pinned Posts</p>
                          <p className="text-lg font-black text-slate-800">{discussionPosts.filter(p => p.is_pinned).length}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-650 shrink-0 font-bold text-sm">📢</div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Announcements</p>
                          <p className="text-lg font-black text-slate-800">{discussionPosts.filter(p => p.post_type === 'announcement').length}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-650 shrink-0 font-bold text-sm">👍</div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Helpful Reacts</p>
                          <p className="text-lg font-black text-slate-800">
                            {discussionPosts.reduce((sum, p) => sum + (p.helpful_count || 0), 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Header action bar */}
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="flex flex-1 gap-2 w-full">
                          <input
                            type="text"
                            placeholder="Search discussions..."
                            value={discussionSearchQuery}
                            onChange={e => setDiscussionSearchQuery(e.target.value)}
                            className="w-full pl-3.5 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                          />
                          <select
                            value={discussionTypeFilter}
                            onChange={e => setDiscussionTypeFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">All Types</option>
                            <option value="update">Updates</option>
                            <option value="question">Questions</option>
                            <option value="announcement">Announcements</option>
                            <option value="task">Tasks</option>
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            setIsCreatingPost(!isCreatingPost);
                            setNewPostTitle('');
                            setNewPostBody('');
                            setNewPostType('update');
                            setNewPostTags('');
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          <span>{isCreatingPost ? 'Close Composer' : 'New Post'}</span>
                        </button>
                      </div>

                      {/* Active Filter Chips */}
                      {(discussionSearchQuery || discussionTypeFilter) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100/50">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active filters:</span>
                          {discussionSearchQuery && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-750 border border-indigo-150 rounded-full text-[10px] font-bold">
                              Search: "{discussionSearchQuery}"
                              <button type="button" onClick={() => setDiscussionSearchQuery('')} className="hover:text-red-500 font-extrabold ml-1">✕</button>
                            </span>
                          )}
                          {discussionTypeFilter && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-750 border border-indigo-150 rounded-full text-[10px] font-bold">
                              Type: {discussionTypeFilter.toUpperCase()}
                              <button type="button" onClick={() => setDiscussionTypeFilter('')} className="hover:text-red-500 font-extrabold ml-1">✕</button>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => { setDiscussionSearchQuery(''); setDiscussionTypeFilter(''); }}
                            className="text-[10px] font-bold text-slate-500 hover:text-red-550 underline cursor-pointer ml-1"
                          >
                            Reset filters
                          </button>
                        </div>
                      )}
                    </div>

                    {/* New Post Form */}
                    {isCreatingPost && (
                      <form onSubmit={handleCreatePostSubmit} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 animate-fade-in">
                        <h4 className="text-sm font-black text-slate-800">Publish to Discussion Board</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="md:col-span-2">
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">Post Title *</label>
                              <span className={`text-[10px] font-bold ${newPostTitle.length < 5 ? 'text-slate-400' : 'text-emerald-500'}`}>
                                {newPostTitle.length}/100 chars (Min 5)
                              </span>
                            </div>
                            <input
                              type="text"
                              required
                              maxLength={100}
                              value={newPostTitle}
                              onChange={e => setNewPostTitle(e.target.value)}
                              placeholder="e.g. Setting up the database scheme"
                              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Post Type *</label>
                            <select
                              value={newPostType}
                              onChange={e => setNewPostType(e.target.value as any)}
                              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none"
                            >
                              <option value="update">Update</option>
                              <option value="question">Question</option>
                              {selectedProject?.is_owner && (
                                <option value="announcement">📢 Announcement (Lead-only)</option>
                              )}
                              <option value="task">Task</option>
                            </select>
                            {!selectedProject?.is_owner && (
                              <span className="text-[9px] text-slate-400 block mt-1">📢 Announcements are restricted strictly to Project Leads.</span>
                            )}
                          </div>

                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tags (Comma separated)</label>
                            <input
                              type="text"
                              value={newPostTags}
                              onChange={e => setNewPostTags(e.target.value)}
                              placeholder="e.g. backend, database, setup"
                              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none"
                            />
                          </div>

                          <div className="md:col-span-3">
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">Content *</label>
                              <span className={`text-[10px] font-bold ${newPostBody.length < 10 ? 'text-slate-400' : 'text-emerald-500'}`}>
                                {newPostBody.length}/1000 chars (Min 10)
                              </span>
                            </div>
                            <textarea
                              required
                              rows={4}
                              maxLength={1000}
                              value={newPostBody}
                              onChange={e => setNewPostBody(e.target.value)}
                              placeholder="Type your discussion post, question, task breakdown or lead announcement coordinates here..."
                              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setIsCreatingPost(false)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors border"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={actionLoading}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                          >
                            {actionLoading ? 'Publishing...' : 'Publish Post'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Posts List */}
                    <div className="space-y-4">
                      {(() => {
                        const filtered = discussionPosts.filter(post => {
                          if (discussionSearchQuery.trim() !== '') {
                            const q = discussionSearchQuery.toLowerCase();
                            const matchTitle = post.title.toLowerCase().includes(q);
                            const matchBody = post.body.toLowerCase().includes(q);
                            if (!matchTitle && !matchBody) return false;
                          }
                          if (discussionTypeFilter && post.post_type !== discussionTypeFilter) return false;
                          return true;
                        });

                        // Sort Pinned first, then by date descending
                        const sorted = [...filtered].sort((a, b) => {
                          if (a.is_pinned && !b.is_pinned) return -1;
                          if (!a.is_pinned && b.is_pinned) return 1;
                          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        });

                        const sliced = sorted.slice(0, discussionLimit);

                        if (sorted.length === 0) {
                          return (
                            <p className="text-xs text-slate-400 italic text-center py-10 bg-white border border-slate-200 rounded-2xl shadow-sm">
                              No discussion posts found. Click "New Post" to publish the first one!
                            </p>
                          );
                        }

                        return (
                          <>
                            {sliced.map(post => {
                              const isAnnouncement = post.post_type === 'announcement';
                              const isLeadUpload = post.created_by === selectedProject.created_by;
                              const isYou = post.created_by === user?.id;

                              const typeColors =
                                post.post_type === 'announcement' ? 'bg-rose-50 text-rose-700 border-rose-250' :
                                post.post_type === 'question' ? 'bg-violet-50 text-violet-700 border-violet-250' :
                                post.post_type === 'task' ? 'bg-amber-50 text-amber-700 border-amber-250' :
                                'bg-indigo-50 text-indigo-700 border-indigo-250';

                              return (
                                <div
                                  key={post.id}
                                  className={`p-5 border rounded-2xl shadow-sm space-y-3.5 relative hover:shadow-md transition-shadow animate-fade-in ${
                                    isAnnouncement 
                                      ? 'bg-rose-50/20 border-rose-250 border-l-4 border-l-rose-500' 
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  {isAnnouncement && (
                                    <div className="absolute right-4 top-4 flex items-center gap-1 text-[9px] text-rose-700 bg-rose-50 border border-rose-150 px-2 py-0.5 rounded-full font-bold">
                                      <span>📢 TEAM ANNOUNCEMENT</span>
                                    </div>
                                  )}
                                  
                                  {post.is_pinned && !isAnnouncement && (
                                    <div className="absolute right-4 top-4 flex items-center gap-1 text-[10px] text-amber-650 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                      <span>📌 Pinned</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700">
                                      {post.author_profile?.full_name ? post.author_profile.full_name[0].toUpperCase() : 'SS'}
                                    </div>
                                    <div>
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs font-black text-slate-800">{post.author_profile?.full_name || 'Teammate'}</span>
                                        {isLeadUpload && (
                                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded text-[8px] font-black border border-emerald-200 uppercase">
                                            👑 Lead
                                          </span>
                                        )}
                                        {isYou && (
                                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded text-[8px] font-black border border-slate-200 uppercase">
                                            👤 You
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[9px] text-slate-405 block mt-0.5">{new Date(post.created_at).toLocaleString()}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ml-2 ${typeColors}`}>
                                      {post.post_type}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5 pt-1">
                                    <h4 className="text-base font-black text-slate-850">{post.title}</h4>
                                    <p className="text-xs text-slate-655 leading-relaxed whitespace-pre-wrap font-medium">{post.body}</p>
                                  </div>

                                  {post.tags && post.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                      {post.tags.map((t: string) => (
                                        <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-semibold border border-slate-200/50">
                                          #{t}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => handleTogglePostHelpful(post.id)}
                                        className={`flex items-center gap-1 py-1.5 px-3 rounded-xl border transition-all font-bold ${
                                          post.reacted_by_me
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-50/50'
                                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        <span>👍</span>
                                        <span>Helpful ({post.helpful_count})</span>
                                      </button>
                                      <button
                                        onClick={() => handleLoadReplies(post)}
                                        className="flex items-center gap-1 py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors font-bold"
                                      >
                                        <span>💬</span>
                                        <span>Comments ({post.replies_count})</span>
                                      </button>
                                    </div>

                                    <div className="flex gap-2">
                                      {selectedProject.is_owner && (
                                        <button
                                          onClick={() => handleTogglePinPost(post)}
                                          className={`p-1.5 border rounded-lg transition-colors ${
                                            post.is_pinned
                                              ? 'bg-amber-50 border-amber-200 text-amber-600'
                                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                          }`}
                                          title={post.is_pinned ? 'Unpin Post' : 'Pin Post'}
                                        >
                                          📌
                                        </button>
                                      )}
                                      {(post.created_by === user?.id || selectedProject.is_owner) && (
                                        <button
                                          onClick={() => handleDeletePost(post.id)}
                                          className="p-1.5 border border-red-150 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg transition-colors"
                                          title="Delete Post"
                                          type="button"
                                        >
                                          🗑️
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Inline replies accordion drawer */}
                                  {selectedPostForReplies?.id === post.id && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-fade-in text-xs font-semibold">
                                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                        <span>💬 Comments ({replies.length})</span>
                                      </h5>

                                      {/* Comments list */}
                                      {replies.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic py-3 text-center bg-slate-50 rounded-xl border border-slate-100">
                                          No comments published yet. Be the first to reply!
                                        </p>
                                      ) : (
                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                          {replies.map(reply => (
                                            <div key={reply.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2 font-normal text-slate-700">
                                              <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-700">
                                                  {reply.author_profile?.full_name ? reply.author_profile.full_name[0].toUpperCase() : 'SS'}
                                                </div>
                                                <span className="text-xs font-bold text-slate-800">{reply.author_profile?.full_name}</span>
                                                <span className="text-[9px] text-slate-400 ml-auto">{new Date(reply.created_at).toLocaleString()}</span>
                                              </div>
                                              <p className="text-[11px] text-slate-655 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/50">{reply.body}</p>
                                              
                                              <div className="flex justify-between items-center pt-1 text-[9px] font-bold text-slate-500">
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleReplyHelpful(reply.id)}
                                                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                                                    reply.reacted_by_me
                                                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                                      : 'bg-white border-slate-200 hover:bg-slate-100'
                                                  }`}
                                                >
                                                  <span>👍</span>
                                                  <span>Helpful ({reply.helpful_count})</span>
                                                </button>

                                                {(reply.created_by === user?.id || selectedProject?.is_owner) && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteReply(reply.id)}
                                                    className="text-red-500 hover:text-red-700 bg-white hover:bg-red-50 px-2 py-0.5 rounded border border-slate-200"
                                                  >
                                                    Delete
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Comment Form */}
                                      <form onSubmit={handleCreateReplySubmit} className="space-y-2 pt-2 border-t border-slate-100">
                                        <textarea
                                          required
                                          rows={2}
                                          value={newReplyBody}
                                          onChange={e => setNewReplyBody(e.target.value)}
                                          placeholder="Type a helpful comment or reply..."
                                          className="w-full px-3 py-2 border border-slate-250 rounded-xl text-[11px] focus:outline-none focus:border-indigo-500 font-medium"
                                        />
                                        <div className="flex gap-2 justify-end">
                                          <button
                                            type="submit"
                                            disabled={actionLoading}
                                            className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg shadow-sm"
                                          >
                                            {actionLoading ? 'Publishing...' : 'Add Comment'}
                                          </button>
                                        </div>
                                      </form>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Paging Footer */}
                            <div className="flex justify-center gap-2 pt-2">
                              {sorted.length > discussionLimit && (
                                <button
                                  onClick={() => setDiscussionLimit(prev => prev + 5)}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                                >
                                  Show More Posts ({sorted.length - sliced.length} more)
                                </button>
                              )}
                              {discussionLimit > 5 && (
                                <button
                                  onClick={() => setDiscussionLimit(5)}
                                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all"
                                >
                                  Show Fewer
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Shared Resources Subtab View */}
                {workspaceSubTab === 'resources' && (
                  <div className="space-y-6">
                    {/* Header action bar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Team Shared Library</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Explore shared materials, study documents, repositories, or external coordinates shared safely.</p>
                      </div>
                      <button
                        onClick={() => {
                          setIsCreatingResource(!isCreatingResource);
                          setResourceMode('link');
                          setResourceType('link');
                          setSelectedFile(null);
                          setFileError(null);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>{isCreatingResource ? 'Close Form' : 'Share Material'}</span>
                      </button>
                    </div>

                    {/* Share Resource Form */}
                    {isCreatingResource && (
                      <form onSubmit={handleCreateResourceSubmit} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                        <h4 className="text-sm font-black text-slate-800">Share Workspace Material</h4>
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-indigo-700 leading-relaxed">
                          🔒 **Note:** Materials uploaded by normal members are sent to the leader queue for verification. Owner uploads are verified instantly.
                        </div>

                        {/* Segmented controls for resource mode */}
                        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold border border-slate-200">
                          <button
                            type="button"
                            onClick={() => { setResourceMode('link'); setResourceType('link'); setSelectedFile(null); setFileError(null); }}
                            className={`flex-1 py-2 text-center rounded-lg transition-all ${resourceMode === 'link' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            🔗 Web Link
                          </button>
                          <button
                            type="button"
                            onClick={() => { setResourceMode('file'); setResourceType('pdf'); setSelectedFile(null); setFileError(null); }}
                            className={`flex-1 py-2 text-center rounded-lg transition-all ${resourceMode === 'file' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            📁 Upload File
                          </button>
                          <button
                            type="button"
                            onClick={() => { setResourceMode('folder'); setResourceType('folder'); setSelectedFile(null); setFileError(null); }}
                            className={`flex-1 py-2 text-center rounded-lg transition-all ${resourceMode === 'folder' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            📁 Folder Link
                          </button>
                          <button
                            type="button"
                            onClick={() => { setResourceMode('code_repo'); setResourceType('code_repo'); setSelectedFile(null); setFileError(null); }}
                            className={`flex-1 py-2 text-center rounded-lg transition-all ${resourceMode === 'code_repo' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            💻 Code Repo
                          </button>
                        </div>

                        {/* Form Body based on mode */}
                        <div className="grid grid-cols-1 gap-4 text-xs">
                          {resourceMode === 'file' ? (
                            <div className="space-y-4">
                              {/* Resource File Type Selector */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-extrabold tracking-wider">Resource File Type *</label>
                                <select
                                  value={resourceType}
                                  onChange={e => {
                                    setResourceType(e.target.value);
                                    setSelectedFile(null);
                                    setFileError(null);
                                  }}
                                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                                >
                                  <option value="pdf">🔴 PDF Document</option>
                                  <option value="document">📄 Word Document (DOC/DOCX)</option>
                                  <option value="presentation">🖥️ Presentation Slide (PPT/PPTX)</option>
                                  <option value="notes">📝 Notes / Markdown</option>
                                  <option value="image">🖼️ Image Asset (PNG/JPG/WEBP)</option>
                                  <option value="dataset">📊 Dataset (CSV/JSON)</option>
                                  <option value="video">🎥 Video Demo</option>
                                  <option value="other">📦 Other</option>
                                </select>
                              </div>

                              {/* Guidelines Box */}
                              {resourceType === 'video' ? (
                                <div className="p-3.5 bg-indigo-50/60 border border-indigo-150 rounded-xl space-y-1.5 text-[10px] text-indigo-700 leading-relaxed font-semibold">
                                  <span className="font-extrabold block text-indigo-900 uppercase tracking-wide">🎥 Video Resource Details:</span>
                                  <p>Upload a short project demo, explanation, walkthrough, or reference clip.</p>
                                  <p className="font-black text-indigo-850">Accepted: .mp4, .webm, .mov up to 20MB.</p>
                                  <p className="text-red-500 text-[9px] font-bold">⚠️ Hazardous execution scripts (.exe, .bat, .cmd, .sh, .msi, .scr, .apk) are strictly blocked for team security.</p>
                                </div>
                              ) : (
                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[10px] text-slate-500 leading-relaxed font-semibold">
                                  <span className="font-extrabold block text-slate-700 uppercase tracking-wide">Supported formats:</span>
                                  <div>PDF, TXT, MD, PNG, JPG, JPEG, WEBP, CSV, JSON, Word (DOC/DOCX), PowerPoint (PPT/PPTX), Excel (XLS/XLSX). Size up to 10MB.</div>
                                  <div className="text-red-500 font-bold mt-1 text-[9px]">⚠️ Hazardous execution scripts (.exe, .bat, .cmd, .sh, .msi, .scr, .apk) are strictly blocked for team security.</div>
                                </div>
                              )}

                              <input
                                type="file"
                                id="resource-file-input"
                                onChange={handleFileChange}
                                className="hidden"
                                accept={resourceType === 'video' ? "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" : ".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.csv,.json,.doc,.docx,.ppt,.pptx,.xls,.xlsx"}
                              />

                              {!selectedFile ? (
                                <label
                                  htmlFor="resource-file-input"
                                  className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 bg-slate-50 hover:bg-slate-50/50 cursor-pointer transition-all"
                                >
                                  <span className="text-3xl mb-2">📥</span>
                                  <span className="font-extrabold text-xs text-slate-700">Click to Select or Drop File</span>
                                  <span className="text-[10px] text-slate-400 mt-1 font-bold">
                                    {resourceType === 'video' ? 'Video formats only (.mp4, .webm, .mov). Size up to 20MB.' : 'Acceptable formats only. Size up to 10MB.'}
                                  </span>
                                </label>
                              ) : (
                                <div className="p-4 bg-indigo-50/30 border border-indigo-150 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
                                  <div className="space-y-1">
                                    <span className="text-xs font-bold text-slate-800 block line-clamp-1">{selectedFile.name}</span>
                                    <span className="text-[10px] text-slate-450 block font-semibold">
                                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Type: {selectedFile.type || 'unknown'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedFile(null); setFileError(null); }}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-black border border-red-150 transition-colors"
                                  >
                                    Remove File
                                  </button>
                                </div>
                              )}

                              {fileError && (
                                <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-[10px] text-red-700 font-semibold leading-relaxed">
                                  ❌ {fileError}
                                </div>
                              )}

                              {selectedFile && (
                                <div className="grid grid-cols-1 gap-4 font-semibold">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-black">Resource Display Title *</label>
                                    <input
                                      type="text"
                                      required
                                      value={newResourceTitle}
                                      onChange={e => setNewResourceTitle(e.target.value)}
                                      placeholder="e.g. Smart-Parking Architecture Diagram"
                                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Resource Title *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newResourceTitle}
                                    onChange={e => setNewResourceTitle(e.target.value)}
                                    placeholder={
                                      resourceMode === 'folder' ? 'e.g. Shared Google Drive Folder' :
                                      resourceMode === 'code_repo' ? 'e.g. Smart-Parking GitHub Repository' :
                                      'e.g. Figma UI Layout Design File'
                                    }
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                  />
                                  <span className="text-[9px] text-slate-400 mt-0.5 block">Minimum 3 characters.</span>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Secure HTTPS URL Link *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newResourceUrl}
                                    onChange={e => setNewResourceUrl(e.target.value)}
                                    placeholder={
                                      resourceMode === 'folder' ? 'https://drive.google.com/drive/folders/...' :
                                      resourceMode === 'code_repo' ? 'https://github.com/username/project-repo' :
                                      'https://figma.com/file/...'
                                    }
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                  />
                                  <span className="text-[9px] text-slate-400 mt-0.5 block">Must strictly begin with the secure https:// protocol.</span>
                                  {resourceMode === 'folder' && (
                                    <span className="text-[9px] text-amber-650 block mt-1 font-semibold">
                                      ⚠️ Note: Browser directory uploads are disabled for security. Paste a secure Google Drive, OneDrive, or Dropbox folder link here.
                                    </span>
                                  )}
                                  {resourceMode === 'code_repo' && (
                                    <span className="text-[9px] text-indigo-600 block mt-1 font-semibold">
                                      💻 Note: Paste a secure GitHub, GitLab, or Bitbucket link. Code repositories are link-based coordinates.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description / Coordinates Usage Details</label>
                            <textarea
                              rows={3}
                              value={newResourceDesc}
                              onChange={e => setNewResourceDesc(e.target.value)}
                              placeholder="Explain what this material contains, passwords or credentials if any, and relevant project milestones..."
                              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingResource(false);
                              setSelectedFile(null);
                              setFileError(null);
                            }}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors border"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={actionLoading}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                          >
                            {actionLoading ? 'Saving...' : resourceMode === 'file' ? 'Upload and Submit' : 'Share Resource'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Verification Queue (Project Owner only) */}
                    {selectedProject.is_owner && (
                      <div className="p-5 bg-amber-50/40 border border-amber-250 rounded-2xl shadow-sm space-y-4">
                        <h4 className="text-sm font-black text-amber-800 border-b border-amber-250 pb-2 flex items-center gap-1.5">
                          <span>Material Verification Queue</span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-850 rounded-full text-[10px] font-black border border-amber-300">
                            {verificationQueue.length} pending
                          </span>
                        </h4>

                        {verificationQueue.length === 0 ? (
                          <p className="text-xs text-amber-700 italic text-center py-4 font-medium">No materials currently pending review.</p>
                        ) : (
                          <div className={`space-y-3 pr-1 ${verificationQueue.length > 3 ? 'max-h-[300px] overflow-y-auto thin-scrollbar' : ''}`}>
                            {verificationQueue.map(res => {
                              const isExe = res.url?.toLowerCase().endsWith('.exe') || res.file_name?.toLowerCase().endsWith('.exe');
                              return (
                                <div key={res.id} className="p-4 bg-white border border-amber-200/80 rounded-xl space-y-3 shadow-sm text-xs">
                                  {isExe && (
                                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700 font-semibold leading-relaxed flex items-start gap-1.5">
                                      <span>⚠️ Warning: This resource matches a hazardous file signature (.exe). Decline immediately.</span>
                                    </div>
                                  )}
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2 gap-2">
                                    <div>
                                      <h5 className="font-extrabold text-slate-850 text-sm flex items-center gap-1.5">
                                        <span>{res.title}</span>
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase">
                                          {isResourceVideo(res) ? 'video' : res.resource_type}
                                        </span>
                                      </h5>
                                      <span className="text-[10px] text-slate-400">
                                        Uploaded by <span className="font-bold text-slate-600">{res.uploader_profile?.full_name}</span> on {new Date(res.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                    
                                    {res.file_path ? (
                                      <div className="flex gap-2">
                                        {(res.resource_type === 'pdf' || res.resource_type === 'image' || isResourceVideo(res)) && (
                                          <button
                                            onClick={() => handlePreviewResource(res)}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                                          >
                                            {isResourceVideo(res) ? '▶ Play Video' : '👁️ Preview Securely'}
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDownloadResource(res)}
                                          className="text-xs font-bold text-slate-600 hover:text-slate-700 hover:underline flex items-center gap-1"
                                        >
                                          📥 Download File
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => { if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer'); }}
                                        disabled={!res.url}
                                        className="flex items-center gap-1 font-bold text-indigo-650 hover:underline disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
                                      >
                                        <span>Open Link</span>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      </button>
                                    )}
                                  </div>
                                  {res.description && <p className="text-slate-550 italic text-[11px]">"{res.description}"</p>}
                                  <div className="flex gap-2 justify-end pt-1">
                                    <button
                                      onClick={() => {
                                        setRejectionResourceId(res.id);
                                        setRejectionReasonText('');
                                        setIsRejectionModalOpen(true);
                                      }}
                                      className="px-3.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-150 rounded-lg transition-colors"
                                    >
                                      Decline Material
                                    </button>
                                    <button
                                      onClick={() => handleVerifyResourceAction(res.id)}
                                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-sm"
                                    >
                                      Approve Material
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Library Verified Resources List */}
                    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-800">Verified Material Library</h4>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded-full font-bold">
                          {resources.filter(r => r.verification_status === 'verified').length} total verified
                        </span>
                      </div>

                      {(() => {
                        const verifiedList = resources.filter(r => r.verification_status === 'verified');

                        // Sort pinned first, then owner verified/recommended, helpful count, newest.
                        const sorted = [...verifiedList].sort((a, b) => {
                          if (a.is_pinned && !b.is_pinned) return -1;
                          if (!a.is_pinned && b.is_pinned) return 1;

                          const isOwnerA = a.uploaded_by === selectedProject.created_by || a.owner_recommended;
                          const isOwnerB = b.uploaded_by === selectedProject.created_by || b.owner_recommended;
                          if (isOwnerA && !isOwnerB) return -1;
                          if (!isOwnerA && isOwnerB) return 1;

                          const helpA = a.helpful_count || 0;
                          const helpB = b.helpful_count || 0;
                          if (helpA !== helpB) return helpB - helpA;

                          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        });

                        const sliced = sorted.slice(0, resourcesLimit);

                        if (verifiedList.length === 0) {
                          return (
                            <p className="text-xs text-slate-400 italic text-center py-8">
                              No verified materials found in the library yet. Click "Share Material" to get started.
                            </p>
                          );
                        }

                        const getTypeIcon = (type: string, res?: any) => {
                          if (res && isResourceVideo(res)) return '🎥 Video';
                          switch (type) {
                            case 'pdf': return '💾 PDF';
                            case 'notes': return '📝 Notes';
                            case 'dataset': return '📊 Dataset';
                            case 'document': return '📄 Doc';
                            case 'presentation': return '🖥️ Slide';
                            case 'image': return '🖼️ Image';
                            case 'code_repo': return '💻 Code Repo';
                            case 'folder': return '📁 Folder Link';
                            default: return '🔗 Web Link';
                          }
                        };

                        return (
                          <>
                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 pr-1 ${verifiedList.length > 4 ? 'max-h-[420px] overflow-y-auto thin-scrollbar' : ''}`}>
                              {sliced.map(res => {
                                const isExe = res.url?.toLowerCase().endsWith('.exe') || res.file_name?.toLowerCase().endsWith('.exe');
                                const isLeadUpload = res.uploaded_by === selectedProject.created_by || res.owner_recommended;
                                
                                return (
                                  <div key={res.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3.5 relative hover:shadow-md transition-shadow text-xs">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="space-y-1.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-black uppercase border border-indigo-150">
                                            {getTypeIcon(res.resource_type, res)}
                                          </span>
                                          {res.is_pinned && (
                                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-250 text-[9px] font-black uppercase rounded">
                                              📌 Pinned
                                            </span>
                                          )}
                                          {isLeadUpload && (
                                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-250 text-[9px] font-black uppercase rounded">
                                              👑 Lead Recommended
                                            </span>
                                          )}
                                        </div>

                                        <h5 className="font-extrabold text-slate-850 text-sm line-clamp-1 mt-1 pr-8 break-words break-all">{res.title}</h5>
                                        
                                        <p className="text-[10px] text-slate-400 font-medium">
                                          Shared by <span className="font-bold text-slate-600">{res.uploader_profile?.full_name || 'Teammate'}</span> · {new Date(res.created_at).toLocaleDateString()}
                                        </p>
                                        
                                        {res.description && <p className="text-slate-505 italic pr-2 line-clamp-2 leading-relaxed">"{res.description}"</p>}
                                        
                                        {res.file_path && (
                                          <p className="text-[9px] text-indigo-500 font-bold bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100/50 inline-block max-w-full" title={res.file_name}>
                                            💾 File Resource: <span className="inline-block max-w-[180px] truncate align-bottom">{res.file_name}</span> ({(res.file_size_bytes ? (res.file_size_bytes / 1024).toFixed(1) : 0)} KB)
                                          </p>
                                        )}

                                        {isExe && (
                                          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[9px] text-red-700 font-semibold leading-relaxed flex items-start gap-1">
                                            <span>⚠️ Safety warning: hazardous script extension detected.</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="pt-3 border-t border-slate-250 flex flex-wrap items-center justify-between gap-3 mt-auto shrink-0">
                                      <div className="flex flex-wrap gap-2 items-center">
                                        {res.file_path ? (
                                          <>
                                            {(res.resource_type === 'pdf' || res.resource_type === 'image' || isResourceVideo(res)) && (
                                              <button
                                                onClick={() => handlePreviewResource(res)}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all"
                                              >
                                                <span>{isResourceVideo(res) ? '▶ Play Video' : '👁️ Preview Securely'}</span>
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDownloadResource(res)}
                                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg flex items-center gap-1 transition-all"
                                            >
                                              <span>📥 Download</span>
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => { if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer'); }}
                                            disabled={!res.url}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            <span>Open Link</span>
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                          </button>
                                        )}

                                        <button
                                          onClick={() => handleToggleResourceHelpful(res.id)}
                                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all font-bold ${
                                            res.reacted_by_me
                                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-50/50'
                                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                          }`}
                                        >
                                          <span>👍</span>
                                          <span>Helpful ({res.helpful_count || 0})</span>
                                        </button>
                                      </div>

                                      <div className="flex gap-1.5">
                                        {selectedProject.is_owner && (
                                          <button
                                            onClick={() => handleTogglePinResource(res.id)}
                                            className={`p-1.5 border rounded-lg transition-colors ${
                                              res.is_pinned
                                                ? 'bg-amber-50 border-amber-200 text-amber-600'
                                                : 'bg-white border-slate-200 hover:bg-slate-100'
                                            }`}
                                            title={res.is_pinned ? 'Unpin Material' : 'Pin Material'}
                                          >
                                            📌
                                          </button>
                                        )}
                                        {(selectedProject.is_owner || (res.uploaded_by === user?.id && res.verification_status !== 'verified')) && (
                                          <button
                                            onClick={() => handleDeleteResourceAction(res.id)}
                                            className="p-1.5 border border-red-150 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                            title="Remove Material"
                                          >
                                            🗑️
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Paging Footer */}
                            <div className="flex justify-center gap-2 pt-2">
                              {sorted.length > resourcesLimit && (
                                <button
                                  onClick={() => setResourcesLimit(prev => prev + 6)}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                                >
                                  Show More Materials ({sorted.length - sliced.length} more)
                                </button>
                              )}
                              {resourcesLimit > 3 && (
                                <button
                                  onClick={() => setResourcesLimit(3)}
                                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all"
                                >
                                  Show Fewer
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* My Submitted Resources Panel */}
                    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                      <h4 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">My Submitted Materials</h4>

                      {(() => {
                        const mySubmitted = resources.filter(r => r.uploaded_by === user?.id);

                        if (mySubmitted.length === 0) {
                          return (
                            <p className="text-xs text-slate-400 italic text-center py-6 font-medium">
                              You have not submitted any resource materials yet.
                            </p>
                          );
                        }

                        return (
                          <div className={`space-y-3 pr-1 ${mySubmitted.length > 4 ? 'max-h-[300px] overflow-y-auto thin-scrollbar' : ''}`}>
                            {mySubmitted.map(res => {
                              const statusBadge =
                                res.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                res.verification_status === 'pending_verification' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-red-50 text-red-700 border-red-200';
                              const isExe = res.url?.toLowerCase().endsWith('.exe') || res.file_name?.toLowerCase().endsWith('.exe');

                              return (
                                <div key={res.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col justify-between space-y-2 text-xs font-semibold text-slate-600 animate-fade-in">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/50 pb-1.5">
                                    <div>
                                      <h5 className="font-extrabold text-slate-850 flex items-center gap-1.5">
                                        <span className="truncate max-w-[160px]" title={res.title}>{res.title}</span>
                                        <span className="px-1.5 py-0.2 bg-slate-250 text-slate-505 rounded text-[8px] font-black uppercase shrink-0">
                                          {isResourceVideo(res) ? 'video' : res.resource_type}
                                        </span>
                                      </h5>
                                      {res.file_path ? (
                                        <span className="text-[9px] text-slate-400 font-medium" title={res.file_name}>
                                          💾 <span className="inline-block max-w-[180px] truncate align-bottom">{res.file_name}</span>
                                          {res.file_size_bytes ? <span className="ml-1 text-slate-400">({(res.file_size_bytes / 1024).toFixed(1)} KB)</span> : null}
                                        </span>
                                      ) : res.url ? (
                                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-650 hover:underline break-all line-clamp-1" title={res.url}>{res.url}</a>
                                      ) : (
                                        <span className="text-[9px] text-slate-400 italic">No file or link attached.</span>
                                      )}                                    
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded border text-[9px] font-black uppercase self-start sm:self-auto ${statusBadge}`}>
                                      {res.verification_status === 'pending_verification' ? 'Pending Review' : res.verification_status}
                                    </span>
                                  </div>

                                  {res.description && <p className="text-slate-500 italic font-normal">"{res.description}"</p>}

                                  {isExe && (
                                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[9px] text-red-700 font-semibold leading-relaxed flex items-start gap-1">
                                      <span>⚠️ Warning: hazardous script signature detected.</span>
                                    </div>
                                  )}

                                  {res.verification_status === 'rejected' && res.rejection_reason && (
                                    <div className="p-2.5 bg-red-50 border border-red-150 rounded-lg text-[10px] text-red-800 font-semibold">
                                      <span className="font-black block mb-0.5">Leader Rejection Comments:</span>
                                      <p className="italic font-normal">"{res.rejection_reason}"</p>
                                    </div>
                                  )}

                                  {res.verification_status !== 'verified' && (
                                    <div className="flex justify-end pt-2 border-t border-slate-200/50">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteResourceAction(res.id)}
                                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded-lg text-[10px] border border-red-150 transition-colors"
                                      >
                                        Cancel Submission &amp; Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                {workspaceSubTab === 'tasks' && (
                  <ProjectTasksTab
                    tasks={projectTasks}
                    project={selectedProject}
                    currentUser={user}
                    teamMembers={teamMembers}
                    refreshTasks={() => {
                      // Reload tasks helper
                      getProjectTasks(selectedProject.id).then(setProjectTasks);
                    }}
                  />
                )}
              </div>
              {/* Roster & Left Bar settings */}
                          </div>
        )}          {activeTab === 'workspace' && selectedProject && !(selectedProject.is_owner || selectedProject.is_member) && (
            <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm max-w-xl mx-auto text-center space-y-4 my-8">
              <div className="w-16 h-16 bg-red-50 text-red-650 rounded-2xl flex items-center justify-center text-2xl mx-auto border border-red-100">
                🔒
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Workspace Access Denied</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                This private workspace is reserved strictly for active team members and the project lead. Former members or pending applicants do not have permission to view discussions, shared resources, or secure credentials.
              </p>
              <button
                onClick={() => setActiveTab('discover')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all hover:shadow-indigo-100"
              >
                Return to Discover Page
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 1: CREATE PROJECT MODAL */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-black text-slate-800">Post Teammate Search</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <form id="create-project-form" onSubmit={handleCreateProject} className="space-y-5">
                
                {/* Basic Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">1. Basic details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Project Title *</label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="e.g. Smart-Parking Mobile App (React Native)"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Minimum 5 characters.</span>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">One-Line Summary / Slogan</label>
                      <input
                        type="text"
                        value={newSummary}
                        onChange={e => setNewSummary(e.target.value)}
                        placeholder="e.g. Building NestJS + IoT parking reservations for graduation design."
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Detailed Description *</label>
                      <textarea
                        required
                        rows={4}
                        value={newDescription}
                        onChange={e => setNewDescription(e.target.value)}
                        placeholder="Explain the project scope, technologies used, work completed so far, what you expect from applicants, and timeline details..."
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Minimum 20 characters.</span>
                    </div>
                  </div>
                </div>

                {/* Categorization Section */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">2. Categorization &amp; Scope</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category *</label>
                      <select
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      {newCategory === 'Other' && (
                        <div className="mt-2 animate-fade-in">
                          <label className="block text-[11px] font-bold text-indigo-600 mb-0.5">Custom Category Name *</label>
                          <input
                            type="text"
                            required
                            value={customCategory}
                            onChange={e => setCustomCategory(e.target.value)}
                            placeholder="e.g. Bio-Informatics"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Project Type *</label>
                      <select
                        value={newType}
                        onChange={e => setNewType(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                      >
                        {PROJECT_TYPES.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                      {(newType === 'Other' || newType === 'other') && (
                        <div className="mt-2 animate-fade-in">
                          <label className="block text-[11px] font-bold text-indigo-600 mb-0.5">Custom Project Type *</label>
                          <input
                            type="text"
                            required
                            value={customProjectType}
                            onChange={e => setCustomProjectType(e.target.value)}
                            placeholder="e.g. Graduation Capstone"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Difficulty level *</label>
                      <select
                        value={newDifficulty}
                        onChange={e => setNewDifficulty(e.target.value as ProjectDifficulty)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                      >
                        {DIFFICULTIES.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Work Mode *</label>
                      <select
                        value={newWorkMode}
                        onChange={e => setNewWorkMode(e.target.value as ProjectWorkMode)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                      >
                        {WORK_MODES.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Max Team Size *</label>
                      <input
                        type="number"
                        min={2}
                        max={20}
                        required
                        value={newMaxTeamSize}
                        onChange={e => setNewMaxTeamSize(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Between 2 and 20.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Application Deadline</label>
                      <input
                        type="date"
                        value={newDeadline}
                        onChange={e => setNewDeadline(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-1 font-semibold text-xs text-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newBeginnerFriendly}
                        onChange={e => setNewBeginnerFriendly(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Beginner Friendly Project</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newHackathon}
                        onChange={e => setNewHackathon(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Hackathon Team (Urgent recruitment)</span>
                    </label>
                  </div>
                </div>

                {/* Compatibility Preferences Section */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">3. Team Preferences &amp; Matchmaking</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Required Skills (Comma separated)</label>
                      <input
                        type="text"
                        value={newRequiredSkills}
                        onChange={e => setNewRequiredSkills(e.target.value)}
                        placeholder="e.g. React Native, TypeScript, CSS, Git"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preferred Departments</span>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                          {DEPARTMENTS.filter(d => d !== 'Other').map(dept => (
                            <label key={dept} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newPreferredDepartments.includes(dept)}
                                onChange={() => togglePreferenceArr(dept, newPreferredDepartments, setNewPreferredDepartments)}
                                className="rounded text-indigo-600"
                              />
                              <span>{dept}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preferred Academic Year</span>
                        <div className="grid grid-cols-1 gap-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                          {ACADEMIC_YEARS.map(year => (
                            <label key={year} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newPreferredYears.includes(year)}
                                onChange={() => togglePreferenceArr(year, newPreferredYears, setNewPreferredYears)}
                                className="rounded text-indigo-600"
                              />
                              <span>{year}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Expected Timeline</label>
                        <input
                          type="text"
                          value={newTimeline}
                          onChange={e => setNewTimeline(e.target.value)}
                          placeholder="e.g. 3 weeks, 2 months"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Meeting preference</label>
                        <input
                          type="text"
                          value={newMeetingPreference}
                          onChange={e => setNewMeetingPreference(e.target.value)}
                          placeholder="e.g. Saturday evenings online, Wednesday library"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Roles Builder Section */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1 flex items-center justify-between">
                    <span>4. Role-Specific Open Slots</span>
                    <button
                      type="button"
                      onClick={handleAddRoleBuilderRow}
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-150 transition-colors"
                    >
                      + Add Role Slot
                    </button>
                  </h4>

                  <div className="space-y-3">
                    {rolesBuilder.map((role, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-3">
                        {rolesBuilder.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRoleBuilderRow(idx)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold absolute right-3 top-3 border border-red-200 rounded-lg px-2 py-0.5 bg-red-50"
                          >
                            Remove
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Role Title *</label>
                            <input
                              type="text"
                              required
                              value={role.role_name}
                              onChange={e => {
                                const copy = [...rolesBuilder];
                                copy[idx].role_name = e.target.value;
                                setRolesBuilder(copy);
                              }}
                              placeholder="e.g. Frontend Wizard (React), UI Designer"
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Slots needed *</label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              required
                              value={role.slots_needed}
                              onChange={e => {
                                const copy = [...rolesBuilder];
                                copy[idx].slots_needed = Number(e.target.value);
                                setRolesBuilder(copy);
                              }}
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Priority *</label>
                            <select
                              value={role.priority}
                              onChange={e => {
                                const copy = [...rolesBuilder];
                                copy[idx].priority = e.target.value as ProjectRolePriority;
                                setRolesBuilder(copy);
                              }}
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>

                          <div className="md:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prerequisite skills (comma separated)</label>
                            <input
                              type="text"
                              value={role.required_skills}
                              onChange={e => {
                                const copy = [...rolesBuilder];
                                copy[idx].required_skills = e.target.value;
                                setRolesBuilder(copy);
                              }}
                              placeholder="e.g. Figma, TailwindCSS"
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>

                          <div className="md:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Brief Description of tasks</label>
                            <input
                              type="text"
                              value={role.description}
                              onChange={e => {
                                const copy = [...rolesBuilder];
                                copy[idx].description = e.target.value;
                                setRolesBuilder(copy);
                              }}
                              placeholder="Help build UI dashboards, map user flows in figma..."
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Owner Role Selection Section */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">
                    4.5. My Role in This Project *
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">My Role Option *</label>
                      <select
                        value={ownerRoleType}
                        onChange={e => {
                          const type = e.target.value as 'project_lead_only' | 'role_index' | 'other';
                          setOwnerRoleType(type);
                          if (type !== 'role_index') setOwnerRoleIndex(-1);
                        }}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                      >
                        <option value="project_lead_only">👑 Project Lead Only (Do not consume dynamic slot)</option>
                        <option value="role_index">👥 Reserve Dynamic Open Position Below</option>
                        <option value="other">✍️ Custom Role Title</option>
                      </select>
                    </div>

                    {ownerRoleType === 'role_index' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Choose Position to Reserve *</label>
                        <select
                          value={ownerRoleIndex}
                          onChange={e => setOwnerRoleIndex(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                        >
                          <option value={-1}>-- Select Dynamic Role --</option>
                          {rolesBuilder.map((r, i) => (
                            <option key={i} value={i} disabled={!r.role_name.trim()}>
                              {r.role_name.trim() || `Position #${i + 1} (Empty)`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {ownerRoleType === 'other' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specify Custom Role Title *</label>
                        <input
                          type="text"
                          required
                          value={ownerCustomRole}
                          onChange={e => setOwnerCustomRole(e.target.value)}
                          placeholder="e.g. Lead Researcher / Core UI Designer"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Secure Coordination Settings Section */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">
                    5. Secure Collaboration Settings (Confidential)
                  </h4>
                  <p className="text-xs text-slate-400">
                    🔒 These credentials are only shared with accepted teammates.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Coordination Link (Google Meet, WhatsApp Group, etc.)</label>
                      <input
                        type="text"
                        value={newCoordLink}
                        onChange={e => setNewCoordLink(e.target.value)}
                        placeholder="e.g. https://meet.google.com/xyz-abc"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Must strictly be an https:// URL.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">GitHub Repository Link</label>
                      <input
                        type="text"
                        value={newGithubUrl}
                        onChange={e => setNewGithubUrl(e.target.value)}
                        placeholder="https://github.com/user/repo"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Must strictly be an https:// URL.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Shared Workspace Document</label>
                      <input
                        type="text"
                        value={newSharedDocUrl}
                        onChange={e => setNewSharedDocUrl(e.target.value)}
                        placeholder="https://docs.google.com/document/..."
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Must strictly be an https:// URL.</span>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Private Tasks &amp; Notes</label>
                      <textarea
                        rows={3}
                        value={newPrivateNotes}
                        onChange={e => setNewPrivateNotes(e.target.value)}
                        placeholder="Add tasks, database settings, specific passwords, or milestones..."
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Footer buttons */}
            <div className="p-6 border-t border-slate-100 flex gap-2 justify-end shrink-0 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-250 hover:bg-slate-350 text-slate-700 font-bold rounded-xl text-sm transition-colors border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-project-form"
                disabled={actionLoading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow transition-colors"
              >
                {actionLoading ? 'Posting...' : 'Create Project Post'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 2: APPLY MODAL */}
      {/* ========================================================================= */}
      {isApplyModalOpen && applyProjectId && (() => {
        const currentProjectForApply = projects.find(p => p.id === applyProjectId);
        const isTeamFull = currentProjectForApply ? (currentProjectForApply.current_team_size >= currentProjectForApply.max_team_size) : false;
        const hasRoles = currentProjectForApply?.roles && currentProjectForApply.roles.length > 0;
        const allRolesFull = (currentProjectForApply?.roles && currentProjectForApply.roles.length > 0)
          ? currentProjectForApply.roles.every(r => r.slots_filled >= r.slots_needed)
          : false;

        const myProjMemberships = userMemberships.filter(m => m.project_id === applyProjectId);
        const isActiveMember = currentProjectForApply?.is_owner || myProjMemberships.some(m => m.left_at === null);
        const hasPendingApp = myApplications.some(app => app.project_id === applyProjectId && app.status === 'pending');

        const cannotApply = isTeamFull || (hasRoles && allRolesFull && !selectedRoleForApply) || isActiveMember || hasPendingApp;

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Submit Join Request</h3>
                  {selectedRoleForApply && (
                    <p className="text-xs text-indigo-600 font-bold mt-0.5">Role Selected: {selectedRoleForApply.role_name}</p>
                  )}
                </div>
                <button
                  onClick={() => setIsApplyModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-sm">
                {isTeamFull && (
                  <div className="p-4 bg-red-50 border border-red-150 rounded-2xl text-xs text-red-700 font-semibold leading-relaxed flex items-start gap-2">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>This team is full. You can apply when the owner increases capacity or a role opens.</span>
                  </div>
                )}

                {isActiveMember && (
                  <div className="p-4 bg-amber-50 border border-amber-150 rounded-2xl text-xs text-amber-700 font-semibold leading-relaxed flex items-start gap-2">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>You are already an active member of this project team. You cannot submit another application.</span>
                  </div>
                )}

                {hasPendingApp && (
                  <div className="p-4 bg-amber-50 border border-amber-150 rounded-2xl text-xs text-amber-700 font-semibold leading-relaxed flex items-start gap-2">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>You already have an active pending application for this project team. Please wait for the owner review.</span>
                  </div>
                )}

                <form id="apply-project-form" onSubmit={handleApplySubmit} className="space-y-4">
                  
                  {hasRoles && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Role *</label>
                      <select
                        value={selectedRoleForApply ? selectedRoleForApply.id : ''}
                        onChange={e => {
                          const rId = e.target.value;
                          const foundRole = currentProjectForApply?.roles?.find(r => r.id === rId) || null;
                          setSelectedRoleForApply(foundRole);
                        }}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                      >
                        <option value="">General Team Member</option>
                        {currentProjectForApply?.roles?.map(r => {
                          const isRoleFull = r.slots_filled >= r.slots_needed;
                          return (
                            <option key={r.id} value={r.id} disabled={isRoleFull}>
                              {r.role_name} ({r.slots_filled}/{r.slots_needed} filled {isRoleFull ? '- FULL' : ''})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Intro Message / Application *</label>
                    <textarea
                      required
                      rows={4}
                      value={applyMessage}
                      onChange={e => setApplyMessage(e.target.value)}
                      placeholder="Introduce yourself, explain why you want to join this project team, and outline how you can help..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Minimum 10 characters.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Skills Snapshot (Comma separated)</label>
                    <input
                      type="text"
                      value={applySkills}
                      onChange={e => setApplySkills(e.target.value)}
                      placeholder="e.g. React Native, CSS, UI Design, Git"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Experience Summary</label>
                    <textarea
                      rows={2}
                      value={applyExperience}
                      onChange={e => setApplyExperience(e.target.value)}
                      placeholder="List past graduation assignments, circles, or internship tasks..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Portfolio Link (GitHub, Behance, Figma)</label>
                    <input
                      type="text"
                      value={applyPortfolioUrl}
                      onChange={e => setApplyPortfolioUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Must strictly be an https:// URL.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Weekly Availability</label>
                      <input
                        type="text"
                        value={applyAvailability}
                        onChange={e => setApplyAvailability(e.target.value)}
                        placeholder="e.g. 5-8 hours/week"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Expected Contribution</label>
                      <input
                        type="text"
                        value={applyExpectedContribution}
                        onChange={e => setApplyExpectedContribution(e.target.value)}
                        placeholder="e.g. UI development, writing NestJS models"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                </form>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-2 justify-end shrink-0 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 bg-slate-250 hover:bg-slate-350 text-slate-700 font-bold rounded-xl text-sm transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="apply-project-form"
                  disabled={actionLoading || cannotApply}
                  className={`px-5 py-2 font-bold rounded-xl text-sm shadow transition-colors ${
                    cannotApply ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {actionLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* DIALOG 3: RESPOND TO APPLICATION DIALOG */}
      {/* ========================================================================= */}
      {respondingAppId && respondingAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-800">
              {respondingAction === 'accepted' ? 'Approve Teammate Request' : 'Decline Teammate Request'}
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              {respondingAction === 'accepted'
                ? 'Approve this applicant. They will be added to the active roster instantly and get coordination settings access.'
                : 'Decline this applicant. You can provide an optional feedback comment explaining your decision.'
              }
            </p>

            <form onSubmit={handleResponseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Reason / Response Comment
                </label>
                <textarea
                  rows={3}
                  value={responseReason}
                  onChange={e => setResponseReason(e.target.value)}
                  placeholder="e.g. Welcome aboard! / Thank you, but we reached max slots limits."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRespondingAppId(null);
                    setRespondingAction(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-3.5 py-1.5 text-white font-bold text-xs rounded-xl shadow ${
                    respondingAction === 'accepted' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : respondingAction === 'accepted' ? 'Approve Applicant' : 'Decline Applicant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 4: LEAVE / EXIT TEAM MODAL */}
      {/* ========================================================================= */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-800">Leave Project Team</h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to depart from this project? This will decrement the team size and lock coordination access coordinates.
            </p>

            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Reason for Leaving *
                </label>
                <textarea
                  required
                  rows={3}
                  value={exitReason}
                  onChange={e => setExitReason(e.target.value)}
                  placeholder="Explain why you are leaving..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow"
                >
                  {actionLoading ? 'Leaving...' : 'Confirm Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 5: REMOVE / KICK MEMBER MODAL */}
      {/* ========================================================================= */}
      {isKickModalOpen && exitingMemberId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-800">Remove Team Member</h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Explain why you are removing this teammate from the active roster. They will lose credentials coordination access immediately.
            </p>

            <form onSubmit={handleKickSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Reason for Removal *
                </label>
                <textarea
                  required
                  rows={3}
                  value={exitReason}
                  onChange={e => setExitReason(e.target.value)}
                  placeholder="e.g. Inactive member, completed assignment work..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsKickModalOpen(false);
                    setExitingMemberId(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow"
                >
                  {actionLoading ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 6: DISCUSSION POST REPLIES / COMMENTS MODAL */}
      {/* ========================================================================= */}
      {selectedPostForReplies && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div>
                <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-150">
                  Post Discussion Thread
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1 line-clamp-1">{selectedPostForReplies.title}</h3>
              </div>
              <button
                onClick={() => setSelectedPostForReplies(null)}
                className="w-8 h-8 rounded-full bg-slate-250 hover:bg-slate-350 text-slate-650 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Content Thread Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Parent Post display */}
              <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-700 border border-indigo-200">
                    {selectedPostForReplies.author_profile?.full_name ? selectedPostForReplies.author_profile.full_name[0].toUpperCase() : 'SS'}
                  </div>
                  <span className="text-xs font-bold text-slate-800">{selectedPostForReplies.author_profile?.full_name}</span>
                  <span className="text-[9px] text-slate-400 ml-auto">{new Date(selectedPostForReplies.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-white/70 p-3 rounded-xl border border-slate-100/50">{selectedPostForReplies.body}</p>
              </div>

              {/* Replies Header */}
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <span>Comments ({replies.length})</span>
              </h4>

              {/* Comments list */}
              {replies.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                  No comments published yet. Be the first to reply!
                </p>
              ) : (
                <div className="space-y-3.5">
                  {replies.map(reply => (
                    <div key={reply.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-700">
                          {reply.author_profile?.full_name ? reply.author_profile.full_name[0].toUpperCase() : 'SS'}
                        </div>
                        <span className="text-xs font-bold text-slate-800">{reply.author_profile?.full_name}</span>
                        <span className="text-[9px] text-slate-400 ml-auto">{new Date(reply.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-655 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/50">{reply.body}</p>
                      
                      <div className="flex justify-between items-center pt-1 text-[10px] font-bold text-slate-500">
                        <button
                          onClick={() => handleToggleReplyHelpful(reply.id)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                            reply.reacted_by_me
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                              : 'bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>👍</span>
                          <span>Helpful ({reply.helpful_count})</span>
                        </button>

                        {(reply.created_by === user?.id || selectedProject?.is_owner) && (
                          <button
                            onClick={() => handleDeleteReply(reply.id)}
                            className="text-red-500 hover:text-red-700 bg-white hover:bg-red-50 px-2 py-0.5 rounded border border-slate-200"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Form Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
              <form onSubmit={handleCreateReplySubmit} className="space-y-3">
                <textarea
                  required
                  rows={2}
                  value={newReplyBody}
                  onChange={e => setNewReplyBody(e.target.value)}
                  placeholder="Type a helpful comment or reply..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedPostForReplies(null)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow"
                  >
                    {actionLoading ? 'Publishing...' : 'Add Comment'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 7: RESOURCE REJECTION FEEDBACK MODAL */}
      {/* ========================================================================= */}
      {isRejectionModalOpen && rejectionResourceId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-800">Decline Shared Material</h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Please provide a specific rejection feedback reason explaining why this material is declined. Rejection reason must be at least 5 characters.
            </p>

            <form onSubmit={handleRejectResourceAction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReasonText}
                  onChange={e => setRejectionReasonText(e.target.value)}
                  placeholder="e.g. Executable link formats are blocked for security. Please share a verified google docs link."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Minimum 5 characters.</span>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRejectionModalOpen(false);
                    setRejectionResourceId(null);
                    setRejectionReasonText('');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow"
                >
                  {actionLoading ? 'Declining...' : 'Decline Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DYNAMIC PUBLIC PROFILE VIEW MODAL */}
      {/* ========================================================================= */}
      {selectedUserIdForProfile && (
        <PublicProfileModal
          userId={selectedUserIdForProfile}
          onClose={() => setSelectedUserIdForProfile(null)}
          layer="top"
        />
      )}

      {/* ========================================================================= */}
      {/* DYNAMIC SECURE RESOURCE PREVIEW LIGHTBOX */}
      {/* ========================================================================= */}
      {previewResource && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Lightbox Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div>
                <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-150">
                  🔐 Secure Signed Preview (Expiring Link)
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1 line-clamp-1">{previewResource.title}</h3>
              </div>
              <button
                onClick={() => { setPreviewResource(null); setPreviewUrl(''); }}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-350 text-slate-655 flex items-center justify-center transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Lightbox Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col justify-center items-center text-xs">
              {loadingPreview ? (
                <div className="py-20 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-extrabold text-slate-500">Generating secure temporary preview link...</span>
                </div>
              ) : previewUrl ? (
                (() => {
                  const type = previewResource.resource_type;
                  if (type === 'pdf') {
                    return (
                      <iframe
                        src={previewUrl}
                        className="w-full h-[60vh] rounded-2xl border border-slate-200 shadow-sm"
                        title="Secure PDF Preview"
                      />
                    );
                  } else if (type === 'image') {
                    return (
                      <div className="max-h-[60vh] overflow-auto flex items-center justify-center">
                        <img
                          src={previewUrl}
                          className="max-w-full max-h-[55vh] object-contain rounded-2xl shadow border bg-slate-50"
                          alt="Secure Preview"
                        />
                      </div>
                    );
                  } else if (type === 'video' || isResourceVideo(previewResource)) {
                    return (
                      <div className="max-h-[60vh] overflow-auto flex flex-col items-center justify-center bg-black/5 rounded-2xl p-4 w-full">
                        <video
                          controls
                          autoPlay={false}
                          src={previewUrl}
                          className="max-w-full max-h-[48vh] rounded-xl shadow-md border border-slate-700 bg-black"
                          onError={() => {
                            toast.error('Preview link expired. Reopen preview to refresh.');
                          }}
                        >
                          Your browser does not support the video tag.
                        </video>
                        <div className="text-center mt-2.5 space-y-0.5 shrink-0">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">🎥 Project Mate Video Demo</p>
                          <p className="text-[9px] text-slate-400">Signed URL expires in 5 mins. If playback fails, please reopen the preview lightbox to refresh.</p>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl max-w-xl text-center space-y-4 shadow-sm">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-amber-250">
                          ⚠️
                        </div>
                        <h4 className="text-base font-black text-amber-800 font-black">Office Document / Download Caution</h4>
                        <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                          You are attempting to access a rich metadata resource ({previewResource.file_name || 'Document'}). 
                          To protect the sandbox environment, direct in-browser rendering for Office files (Word, PowerPoint, Excel) is gated. 
                          Running or downloading files to local machines can carry mild security risks. Please ensure your device uses scanner software.
                        </p>
                        <div className="flex gap-2 justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => { setPreviewResource(null); setPreviewUrl(''); }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              handleDownloadResource(previewResource);
                              setPreviewResource(null);
                              setPreviewUrl('');
                            }}
                            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                          >
                            📥 Download File Securely
                          </button>
                        </div>
                      </div>
                    );
                  }
                })()
              ) : (
                <div className="py-12 text-center text-red-500 font-bold">
                  Could not load secure resource preview coordinates.
                </div>
              )}
            </div>

            {/* Lightbox Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
              <span>Expiry: 5 Minutes (Signed URL protocol)</span>
              <button
                onClick={() => { setPreviewResource(null); setPreviewUrl(''); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 6.3C: ARCHIVE CONFIRM MODAL */}
      {/* ========================================================================= */}
      {isArchiveConfirmOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v6M14 12v6" /></svg>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Archive Project?</h3>
                <p className="text-xs text-slate-500 mt-0.5">All team history, resources, and discussions will be preserved.</p>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
              📦 Archiving hides the project from active sections. You can restore it at any time from My Projects → Archived & Paused.
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmArchive}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Archiving...' : '📦 Archive Project'}
              </button>
              <button
                onClick={() => { setIsArchiveConfirmOpen(false); setProjectToArchive(null); }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 6.3C: COMPLETE PROJECT CONFIRM MODAL */}
      {/* ========================================================================= */}
      {isCompleteConfirmOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Mark Project Completed?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Team will move to completed state. Applications will close.</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-600 block mb-2">Completion Note <span className="font-normal text-slate-400">(optional — visible to all team members)</span></label>
              <textarea
                value={completionSummaryText}
                onChange={e => setCompletionSummaryText(e.target.value)}
                rows={3}
                placeholder="What did the team achieve? What was shipped? Leave a note for the record..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmComplete}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Completing...' : '✅ Mark as Completed'}
              </button>
              <button
                onClick={() => { setIsCompleteConfirmOpen(false); setProjectToComplete(null); setCompletionSummaryText(''); }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default ProjectMatePage;
