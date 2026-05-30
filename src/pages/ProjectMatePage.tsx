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
  ProjectRolePriority
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
  markProjectRunning
} from '../lib/projectMates';


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

  // Tab State
  const [activeTab, setActiveTab] = useState<'discover' | 'my_projects' | 'my_applications' | 'workspace'>('discover');

  // Core Data State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
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
  const [discussionLimit, setDiscussionLimit] = useState(5);
  const [resourcesLimit, setResourcesLimit] = useState(3);

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
  const [workspaceSubTab, setWorkspaceSubTab] = useState<'coordination' | 'discussion' | 'resources'>('coordination');
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

  // Resources state
  const [resources, setResources] = useState<any[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<any[]>([]);
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
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError('Unsupported file type. Only PDFs, text files, images, datasets, and standard office documents are allowed.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds the 10 MB limit.');
      setSelectedFile(null);
      return;
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
          resource_type: resourceType as any,
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
    <div className="max-w-7xl mx-auto space-y-6">
      
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
      <div className="flex border-b border-slate-200">
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
        <div>
          {/* TAB 1: DISCOVER PROJECTS */}
          {activeTab === 'discover' && (
            <div className="space-y-6">
              
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
                                      {!isRoleFilled && !proj.is_owner && !proj.is_member && (
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
                                      stateType === 'left' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                      stateType === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                      'bg-slate-50 text-slate-500 border-slate-200'
                                    }`}>
                                      {stateType === 'left' ? 'LEFT TEAM' : stateType}
                                    </span>
                                    {isFull ? (
                                      <span className="px-3.5 py-1.5 bg-red-50 text-red-650 text-xs font-bold rounded-lg border border-red-100">
                                        Team Full
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => openApplyModal(proj.id)}
                                        className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-black rounded-lg border border-indigo-150 transition-all shadow-sm"
                                      >
                                        Apply Again
                                      </button>
                                    )}
                                  </div>
                                );
                              }

                              return isFull ? (
                                <span className="px-3.5 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
                                  Team Full
                                </span>
                              ) : (
                                <button
                                  onClick={() => openApplyModal(proj.id)}
                                  className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-black rounded-lg border border-indigo-150 transition-all shadow-sm"
                                >
                                  Apply
                                </button>
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
              <div className="space-y-6">
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
                  undefined,
                  undefined,
                  undefined,
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
                      {actionBtn('View Summary', () => loadWorkspace(proj.id), 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200')}
                      {actionBtn('Restore to Recruiting', () => handleRestoreProject(proj.id, 'recruiting'), 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200')}
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

            if (!hasAny) {
              return (
                <div className="p-16 border border-slate-200 border-dashed rounded-2xl text-center bg-white">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                  <p className="text-slate-500 font-bold">You have not submitted any teammate applications yet.</p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                  >
                    Discover Open Teams
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-8">
                {renderAppGroup('Active Teams', activeApps, 'active', 'No active teams yet.')}
                {renderAppGroup('Pending Applications', pendingApps, 'pending', 'No pending applications.')}
                {renderAppGroup('Rejected Applications', rejectedApps, 'rejected', 'No rejected applications.')}
                {renderAppGroup('Withdrawn Applications', withdrawnApps, 'withdrawn', 'No withdrawn applications.')}
                {renderAppGroup('Past Teams', leftApps, 'left', 'No past teams yet.')}
              </div>
            );
          })()}
          {/* TAB 4: TEAM WORKSPACE */}
          {activeTab === 'workspace' && selectedProject && (selectedProject.is_owner || selectedProject.is_member) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Workspace Main Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150">
                        Workspace
                      </span>
                      <h3 className="text-2xl font-black text-slate-800 leading-tight mt-1">{selectedProject.title}</h3>
                    </div>

                    {selectedProject.is_owner && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">Update Status:</span>
                        <select
                          value={selectedProject.status}
                          onChange={e => handleStatusUpdate(e.target.value)}
                          className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-bold bg-slate-50 focus:outline-none"
                        >
                          <option value="recruiting">Recruiting</option>
                          <option value="in_progress">In Progress</option>
                          <option value="team_full">Team Full</option>
                          <option value="completed">Completed</option>
                          <option value="paused">Paused</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">{selectedProject.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs font-semibold">
                    <div>
                      <p className="text-slate-400 uppercase tracking-wider text-[10px]">Difficulty</p>
                      <p className="text-slate-700 font-bold">{selectedProject.difficulty_level}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase tracking-wider text-[10px]">Work Mode</p>
                      <p className="text-slate-700 font-bold">{selectedProject.work_mode}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase tracking-wider text-[10px]">Type</p>
                      <p className="text-slate-700 font-bold">{formatProjectDisplayType(selectedProject.project_type)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase tracking-wider text-[10px]">Capacity</p>
                      <p className="text-slate-700 font-bold">{selectedProject.current_team_size} / {selectedProject.max_team_size}</p>
                    </div>
                  </div>
                </div>

                {/* Subtab Navigation Bar */}
                <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl shadow-sm gap-2">
                  <button
                    onClick={() => setWorkspaceSubTab('coordination')}
                    className={`px-4 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 ${
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
                    className={`px-4 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 ${
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
                    className={`px-4 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 ${
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
                </div>

                {/* Subtab Content */}
                {workspaceSubTab === 'coordination' && (
                  <>
                    {/* PHASE 6.3C: Completed Project Summary Banner */}
                    {(selectedProject.status === 'completed' || selectedProject.status === 'archived') && (
                      <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-black px-3 py-1 rounded-full border uppercase tracking-wider ${
                            selectedProject.status === 'completed' 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            {selectedProject.status === 'completed' ? '✅ Project Completed' : '📦 Archived Project'}
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
                            {selectedProject.status === 'archived' && (
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
                      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                        <h4 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <span>Applications Queue</span>
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
                            {pendingApplicants.length} pending
                          </span>
                        </h4>

                        {pendingApplicants.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-6">
                            No pending team applications yet.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {pendingApplicants.map(app => (
                              <div key={app.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
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

                                <div className="text-xs space-y-2 leading-relaxed text-slate-600">
                                  <p>
                                    <span className="font-bold text-slate-700 block">Intro Message:</span>
                                    <span className="italic">"{app.message}"</span>
                                  </p>

                                  {app.skills_snapshot && app.skills_snapshot.length > 0 && (
                                    <p>
                                      <span className="font-bold text-slate-700 block mb-1">Skills Snapshot:</span>
                                      <span className="flex flex-wrap gap-1">
                                        {app.skills_snapshot.map(s => (
                                          <span key={s} className="px-1.5 py-0.5 bg-slate-200/70 text-slate-700 font-semibold rounded text-[10px]">
                                            {s}
                                          </span>
                                        ))}
                                      </span>
                                    </p>
                                  )}

                                  {app.experience_summary && (
                                    <p>
                                      <span className="font-bold text-slate-700 block">Experience Summary:</span>
                                      <span>{app.experience_summary}</span>
                                    </p>
                                  )}

                                  {app.portfolio_url && (
                                    <p>
                                      <span className="font-bold text-slate-700 block">Portfolio Coordinates:</span>
                                      <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold flex items-center gap-1">
                                        <span>{app.portfolio_url}</span>
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      </a>
                                    </p>
                                  )}

                                  {app.availability && (
                                    <p>
                                      <span className="font-bold text-slate-700 block">Weekly Availability:</span>
                                      <span>{app.availability}</span>
                                    </p>
                                  )}

                                  {app.expected_contribution && (
                                    <p>
                                      <span className="font-bold text-slate-700 block">Expected Contribution:</span>
                                      <span>{app.expected_contribution}</span>
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-2 justify-end pt-3 border-t border-slate-200/50">
                                  <button
                                    onClick={() => openResponseDialog(app.id, 'rejected')}
                                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 font-bold text-xs rounded-xl transition-colors shadow-sm"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => openResponseDialog(app.id, 'accepted')}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow"
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
                  </>
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
                                          className="p-1.5 border border-red-150 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                          title="Delete Post"
                                        >
                                          🗑️
                                        </button>
                                      )}
                                    </div>
                                  </div>
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
                              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[10px] text-slate-500 leading-relaxed">
                                <span className="font-extrabold block text-slate-700">Supported formats:</span>
                                <div>PDF, TXT, MD, PNG, JPG, JPEG, WEBP, CSV, JSON, Word (DOC/DOCX), PowerPoint (PPT/PPTX), Excel (XLS/XLSX).</div>
                                <div className="text-red-500 font-bold mt-1">⚠️ Hazardous execution scripts (.exe, .bat, .cmd, .sh, .msi, .scr, .apk) are strictly blocked for team security.</div>
                              </div>

                              <input
                                type="file"
                                id="resource-file-input"
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.csv,.json,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                              />

                              {!selectedFile ? (
                                <label
                                  htmlFor="resource-file-input"
                                  className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 bg-slate-50 hover:bg-slate-50/50 cursor-pointer transition-all"
                                >
                                  <span className="text-3xl mb-2">📥</span>
                                  <span className="font-extrabold text-xs text-slate-700">Click to Select or Drop File</span>
                                  <span className="text-[10px] text-slate-400 mt-1">Acceptable formats only. Size up to 10MB.</span>
                                </label>
                              ) : (
                                <div className="p-4 bg-indigo-50/30 border border-indigo-150 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
                                  <div className="space-y-1">
                                    <span className="text-xs font-bold text-slate-800 block line-clamp-1">{selectedFile.name}</span>
                                    <span className="text-[10px] text-slate-450 block">
                                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Type: {selectedFile.type || 'unknown'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedFile(null); setFileError(null); }}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold border border-red-150 transition-colors"
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Resource Display Title *</label>
                                    <input
                                      type="text"
                                      required
                                      value={newResourceTitle}
                                      onChange={e => setNewResourceTitle(e.target.value)}
                                      placeholder="e.g. Smart-Parking Architecture Diagram"
                                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Classification Type *</label>
                                    <select
                                      value={resourceType}
                                      onChange={e => setResourceType(e.target.value)}
                                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                                    >
                                      <option value="pdf">🔴 PDF Document</option>
                                      <option value="notes">📝 Notes / Markdown</option>
                                      <option value="dataset">📊 Dataset (CSV/JSON)</option>
                                      <option value="document">📄 Word Document (DOC/DOCX)</option>
                                      <option value="presentation">🖥️ Presentation Slide (PPT/PPTX)</option>
                                      <option value="image">🖼️ Image Asset (PNG/JPG/WEBP)</option>
                                      <option value="other">📦 Other</option>
                                    </select>
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
                          <div className="space-y-3">
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
                                          {res.resource_type}
                                        </span>
                                      </h5>
                                      <span className="text-[10px] text-slate-400">
                                        Uploaded by <span className="font-bold text-slate-600">{res.uploader_profile?.full_name}</span> on {new Date(res.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                    
                                    {res.file_path ? (
                                      <div className="flex gap-2">
                                        {(res.resource_type === 'pdf' || res.resource_type === 'image') && (
                                          <button
                                            onClick={() => handlePreviewResource(res)}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                                          >
                                            👁️ Preview Securely
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
                                      <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-indigo-650 hover:underline flex items-center gap-1 font-bold self-start sm:self-auto">
                                        <span>Open Link coordinates</span>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      </a>
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

                        const getTypeIcon = (type: string) => {
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {sliced.map(res => {
                                const isExe = res.url?.toLowerCase().endsWith('.exe') || res.file_name?.toLowerCase().endsWith('.exe');
                                const isLeadUpload = res.uploaded_by === selectedProject.created_by || res.owner_recommended;
                                
                                return (
                                  <div key={res.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3.5 relative hover:shadow-md transition-shadow text-xs">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="space-y-1.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-black uppercase border border-indigo-150">
                                            {getTypeIcon(res.resource_type)}
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

                                        <h5 className="font-extrabold text-slate-850 text-sm line-clamp-1 mt-1 pr-8">{res.title}</h5>
                                        
                                        <p className="text-[10px] text-slate-400 font-medium">
                                          Shared by <span className="font-bold text-slate-600">{res.uploader_profile?.full_name || 'Teammate'}</span> · {new Date(res.created_at).toLocaleDateString()}
                                        </p>
                                        
                                        {res.description && <p className="text-slate-505 italic pr-2 line-clamp-2 leading-relaxed">"{res.description}"</p>}
                                        
                                        {res.file_path && (
                                          <p className="text-[9px] text-indigo-500 font-bold bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100/50 inline-block">
                                            💾 File Resource: {res.file_name} ({(res.file_size_bytes ? (res.file_size_bytes / 1024).toFixed(1) : 0)} KB)
                                          </p>
                                        )}

                                        {isExe && (
                                          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[9px] text-red-700 font-semibold leading-relaxed flex items-start gap-1">
                                            <span>⚠️ Safety warning: hazardous script extension detected.</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                                      <div className="flex gap-2">
                                        {res.file_path ? (
                                          <>
                                            {(res.resource_type === 'pdf' || res.resource_type === 'image') && (
                                              <button
                                                onClick={() => handlePreviewResource(res)}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all"
                                              >
                                                <span>👁️ Preview Securely</span>
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
                                          <a
                                            href={res.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all"
                                          >
                                            <span>Open Link</span>
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                          </a>
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
                          <div className="space-y-3">
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
                                        <span>{res.title}</span>
                                        <span className="px-1.5 py-0.2 bg-slate-250 text-slate-505 rounded text-[8px] font-black uppercase">
                                          {res.resource_type}
                                        </span>
                                      </h5>
                                      {res.file_path ? (
                                        <span className="text-[9px] text-slate-400 font-medium">💾 File Resource: {res.file_name}</span>
                                      ) : (
                                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-650 hover:underline line-clamp-1">{res.url}</a>
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
              </div>
              {/* Roster & Left Bar settings */}
              <div className="space-y-6">

                {/* === PHASE 6.3C: ROLE MANAGEMENT PANEL === */}
                {selectedProject.is_owner && (
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Role Slots ({selectedProject.roles?.length || 0})
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
                    <div className="space-y-2">
                      {(!selectedProject.roles || selectedProject.roles.length === 0) && !isAddingRole && (
                        <p className="text-xs text-slate-400 italic text-center py-3">No roles defined yet. Add roles to structure your team.</p>
                      )}
                      {selectedProject.roles && selectedProject.roles.map((role: any) => {
                        const isFilled = role.slots_filled >= role.slots_needed;
                        const isEditing = editingRoleId === role.id;
                        if (isEditing) {
                          return (
                            <form key={role.id} onSubmit={handleUpdateRoleSubmit} className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs">
                              <p className="font-black text-indigo-800 text-xs uppercase tracking-wider">Edit Role</p>
                              <input required value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Role name (e.g. Backend Dev)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                              <input value={newRoleDescription} onChange={e => setNewRoleDescription(e.target.value)} placeholder="Short description (optional)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                              <input value={newRoleSkills} onChange={e => setNewRoleSkills(e.target.value)} placeholder="Required skills (comma-separated)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Slots Needed</label>
                                  <input type="number" min={role.slots_filled || 1} max={10} value={newRoleSlots} onChange={e => setNewRoleSlots(Number(e.target.value))} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                                  {role.slots_filled > 0 && <p className="text-[9px] text-slate-400 mt-0.5">Cannot go below {role.slots_filled} (filled)</p>}
                                </div>
                                <div className="flex-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                                  <select value={newRolePriority} onChange={e => setNewRolePriority(e.target.value as any)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400">
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button type="submit" disabled={actionLoading} className="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50">Save Changes</button>
                                <button type="button" onClick={() => setEditingRoleId(null)} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs transition-colors">Cancel</button>
                              </div>
                            </form>
                          );
                        }
                        return (
                          <div key={role.id} className={`flex items-start justify-between p-2.5 rounded-xl border text-xs gap-2 ${isFilled ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'}`}>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="font-black text-slate-800 truncate">{role.role_name}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                                  role.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
                                  role.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                  'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>{role.priority}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {role.slots_filled}/{role.slots_needed} filled {isFilled ? '✓' : '· open'}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => startEditRole(role)}
                                className="px-1.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded border border-slate-200 transition-colors"
                                title="Edit role"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role.id, role.role_name)}
                                disabled={(role.slots_filled || 0) > 0}
                                className="px-1.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title={(role.slots_filled || 0) > 0 ? 'Cannot delete — role has active members' : 'Delete role'}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Role Form */}
                    {isAddingRole && (
                      <form onSubmit={handleAddRoleSubmit} className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs">
                        <p className="font-black text-indigo-800 text-xs uppercase tracking-wider">Add New Role</p>
                        <input required value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Role name (e.g. UI Designer)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                        <input value={newRoleDescription} onChange={e => setNewRoleDescription(e.target.value)} placeholder="Short description (optional)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                        <input value={newRoleSkills} onChange={e => setNewRoleSkills(e.target.value)} placeholder="Required skills (comma-separated)" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Slots Needed</label>
                            <input type="number" min={1} max={10} value={newRoleSlots} onChange={e => setNewRoleSlots(Number(e.target.value))} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400" />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                            <select value={newRolePriority} onChange={e => setNewRolePriority(e.target.value as any)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400">
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button type="submit" disabled={actionLoading} className="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50">Add Role</button>
                          <button type="button" onClick={() => setIsAddingRole(false)} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs transition-colors">Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                 {/* Active Roster List */}
                <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                  <h4 className="text-md font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Team Roster ({teamMembers.length}/{selectedProject.max_team_size})
                  </h4>

                  <div className="space-y-3.5 divide-y divide-slate-100">
                    {(() => {
                      const activeMembersSorted = [...teamMembers].sort((a, b) => {
                        const isOwnerA = a.user_id === selectedProject.created_by;
                        const isOwnerB = b.user_id === selectedProject.created_by;
                        if (isOwnerA) return -1;
                        if (isOwnerB) return 1;
                        const nameA = a.profile?.full_name || '';
                        const nameB = b.profile?.full_name || '';
                        return nameA.localeCompare(nameB);
                      });

                      return activeMembersSorted.map((member, idx) => {
                        const isOwner = member.user_id === selectedProject.created_by;
                        const initials = member.profile?.full_name 
                          ? member.profile.full_name.split(' ').filter(n => n.length > 0).map(n => n[0]).slice(0, 2).join('').toUpperCase()
                          : 'SS';
                        
                        return (
                          <div key={member.id} className={`flex items-start justify-between gap-3 text-xs ${idx > 0 ? 'pt-3.5' : ''}`}>
                            <div className="flex gap-2.5">
                              {/* circular initials avatar */}
                              <div className="w-9 h-9 rounded-full bg-indigo-50/80 border border-indigo-100 text-indigo-650 font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
                                {initials}
                              </div>
                              <div className="space-y-0.5">
                                <h5 className="font-extrabold text-slate-800 leading-tight">
                                  {member.profile?.full_name}
                                </h5>
                                <span className="text-[10px] text-slate-400 block">
                                  {member.profile?.department} ({member.profile?.year_of_study})
                                </span>
                                <span className="text-[10px] text-slate-400 block font-medium">
                                  Joined: {new Date(member.joined_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>

                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  {isOwner && (
                                    <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-250 text-[8px] font-black uppercase rounded">
                                      👑 Lead
                                    </span>
                                  )}
                                  {member.role_name && member.role_name !== 'Project Lead' && (
                                    <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-150 text-[8px] font-bold rounded">
                                      {member.role_name}
                                    </span>
                                  )}
                                </div>

                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedUserIdForProfile(member.user_id)}
                                    className="px-2.5 py-0.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-150 rounded text-[9px] font-bold transition-all"
                                  >
                                    View Profile
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-1 shrink-0">
                              {selectedProject.is_owner && member.user_id !== user?.id && (
                                <button
                                  onClick={() => {
                                    setExitingMemberId(member.user_id);
                                    setIsKickModalOpen(true);
                                  }}
                                  className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded border border-red-150 transition-colors text-[10px]"
                                >
                                  Kick
                                </button>
                              )}
                              
                              {!selectedProject.is_owner && member.user_id === user?.id && (
                                <button
                                  onClick={() => setIsLeaveModalOpen(true)}
                                  className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded border border-red-150 transition-colors text-[10px]"
                                >
                                  Leave Team
                                </button>
                              )}
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
                      className="w-full flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider focus:outline-none"
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
                      <div className="divide-y divide-slate-200/60 pt-2 space-y-2.5">
                        {pastTeamMembers.map((member, idx) => {
                          const isRemoved = !!member.removed_by;
                          return (
                            <div key={member.id} className={`text-xs text-slate-500 space-y-1 ${idx > 0 ? 'pt-2.5' : ''}`}>
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-800">{member.profile?.full_name}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                  isRemoved ? 'bg-red-50 text-red-650 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                  {isRemoved ? 'Removed' : 'Left'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Role: {member.role_name || 'Team Member'} · Exit: {new Date(member.left_at!).toLocaleDateString()}
                              </p>
                              {member.leave_reason && (
                                <p className="text-[10px] italic text-slate-500 bg-white/70 p-1.5 rounded border border-slate-150 mt-0.5 leading-relaxed">
                                  "Reason: {member.leave_reason}"
                                </p>
                              )}
                              <div className="pt-1 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserIdForProfile(member.user_id)}
                                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300 rounded text-[9px] font-bold transition-all"
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

                {/* Open positions info */}
                {selectedProject.roles && selectedProject.roles.length > 0 && (
                  <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Required Slots</h4>
                    <div className="space-y-2">
                      {selectedProject.roles.map(r => (
                        <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">{r.role_name}</span>
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase">
                              {r.priority} priority
                            </span>
                          </div>
                          <p className="text-slate-400 text-[10px] mt-0.5">{r.slots_filled} of {r.slots_needed} slots filled</p>
                          {r.description && <p className="text-slate-500 italic text-[10px] mt-1">"{r.description}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
        )}

          {activeTab === 'workspace' && selectedProject && !(selectedProject.is_owner || selectedProject.is_member) && (
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
