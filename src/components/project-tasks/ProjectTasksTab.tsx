import React, { useState, useEffect } from 'react';
import type { ProjectTask, ProjectWithStats, ProjectTeamMember, ProjectTaskAttachment, ProjectTaskSubmission } from '../../types';
import {
  createProjectTask,
  cancelProjectTask,
  markTaskInProgress,
  submitProjectTask,
  getTaskSubmissions,
  getTaskSubmissionFiles,
  verifyTaskSubmission,
  rejectTaskSubmission,
  withdrawTaskSubmission,
  uploadProjectTaskFile,
  getSafeTaskFileUrl,
  requestTaskExtension,
  getProjectTaskExtensionRequests,
  approveTaskExtension,
  rejectTaskExtension,
  withdrawTaskExtensionRequest,
  getTaskAttachments
} from '../../lib/projectMates';
import { useToast } from '../../hooks/useToast';

interface ProjectTasksTabProps {
  tasks: ProjectTask[];
  project: ProjectWithStats;
  currentUser: any;
  teamMembers: ProjectTeamMember[];
  refreshTasks: () => void;
}

export function ProjectTasksTab({ tasks, project, currentUser, teamMembers, refreshTasks }: ProjectTasksTabProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'board' | 'assign' | 'review' | 'extensions' | 'dashboard'>('board');
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  
  // Attachments & submissions for the selected task
  const [selectedTaskAttachments, setSelectedTaskAttachments] = useState<ProjectTaskAttachment[]>([]);
  const [selectedTaskSubmissions, setSelectedTaskSubmissions] = useState<ProjectTaskSubmission[]>([]);
  const [selectedTaskSubmissionFiles, setSelectedTaskSubmissionFiles] = useState<Record<string, any[]>>({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Queues
  const [extensionRequests, setExtensionRequests] = useState<any[]>([]);
  const [loadingQueues, setLoadingQueues] = useState(false);

  // Form states for assigning task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskObjective, setNewTaskObjective] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low'|'medium'|'high'|'urgent'>('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueAt, setNewTaskDueAt] = useState('');
  
  // Attachments while assigning
  const [assignAttachMode, setAssignAttachMode] = useState<'none' | 'link' | 'file'>('none');
  const [assignAttachType, setAssignAttachType] = useState<'link' | 'pdf' | 'document' | 'presentation' | 'image' | 'video' | 'folder' | 'code_repo' | 'other'>('link');
  const [assignAttachTitle, setAssignAttachTitle] = useState('');
  const [assignAttachUrl, setAssignAttachUrl] = useState('');
  const [assignAttachFile, setAssignAttachFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Form states for submitting work
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionAttachMode, setSubmissionAttachMode] = useState<'link' | 'file'>('link');
  const [submissionAttachType, setSubmissionAttachType] = useState<'link' | 'pdf' | 'document' | 'presentation' | 'image' | 'video' | 'folder' | 'code_repo' | 'other'>('link');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

  // Form states for requesting extension
  const [extRequestedDate, setExtRequestedDate] = useState('');
  const [extReason, setExtReason] = useState('');
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  // Preview file URLs
  const [previewFileUrl, setPreviewFileUrl] = useState('');
  const [previewFileType, setPreviewFileType] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Fetch extension requests for Team Lead subtab view & member dashboards
  const loadQueuesData = async () => {
    setLoadingQueues(true);
    try {
      const requests = await getProjectTaskExtensionRequests(project.id);
      setExtensionRequests(requests);
    } catch (err: any) {
      toast.error(err.message || 'Error loading queues data');
    } finally {
      setLoadingQueues(false);
    }
  };

  useEffect(() => {
    loadQueuesData();
  }, [activeSubView]);

  // Load selected task details (attachments, submissions, submission files)
  const loadTaskDetails = async (task: ProjectTask) => {
    setLoadingDetails(true);
    try {
      const attachments = await getTaskAttachments(task.id);
      setSelectedTaskAttachments(attachments);

      const submissions = await getTaskSubmissions(task.id);
      setSelectedTaskSubmissions(submissions);

      const filesMap: Record<string, any[]> = {};
      for (const sub of submissions) {
        const files = await getTaskSubmissionFiles(sub.id);
        filesMap[sub.id] = files;
      }
      setSelectedTaskSubmissionFiles(filesMap);
    } catch (err: any) {
      toast.error(err.message || 'Error loading task details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedTask) {
      loadTaskDetails(selectedTask);
    } else {
      setSelectedTaskAttachments([]);
      setSelectedTaskSubmissions([]);
      setSelectedTaskSubmissionFiles({});
    }
  }, [selectedTask]);

  // Derived statuses & queues
  const myTasks = tasks.filter(t => t.assigned_to === currentUser.id);
  const pendingReview = tasks.filter(t => t.status === 'submitted');
  
  const getIsOverdue = (task: ProjectTask) => {
    return task.status !== 'verified' && task.status !== 'cancelled' && new Date(task.due_at) < new Date();
  };
  const overdueCount = tasks.filter(getIsOverdue).length;

  // Validation functions
  const isDangerousFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext ? ['exe', 'bat', 'cmd', 'sh', 'msi', 'scr', 'apk', 'jar'].includes(ext) : false;
  };

  const handleAssignTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (newTaskTitle.trim().length < 5 || newTaskTitle.trim().length > 100) {
      toast.error('Task title must be between 5 and 100 characters.');
      return;
    }
    if (newTaskObjective.trim().length < 10) {
      toast.error('Instructions / Objective must be at least 10 characters.');
      return;
    }
    if (new Date(newTaskDueAt) <= new Date()) {
      toast.error('Due date must be set in the future.');
      return;
    }
    if (!newTaskAssignee) {
      toast.error('Please assign this task to an active teammate.');
      return;
    }

    setLoading(true);
    try {
      let attachmentObj: any = null;

      if (assignAttachMode === 'link') {
        if (!assignAttachUrl || !assignAttachUrl.startsWith('https://')) {
          throw new Error('Supporting links must strictly use the https:// protocol.');
        }
        attachmentObj = {
          attachment_type: assignAttachType,
          title: assignAttachTitle.trim() || 'Supporting Link',
          url: assignAttachUrl
        };
      } else if (assignAttachMode === 'file' && assignAttachFile) {
        if (isDangerousFile(assignAttachFile)) {
          throw new Error('Unsupported or hazardous executable formats are blocked for security.');
        }
        if (assignAttachFile.size > 20 * 1024 * 1024) {
          throw new Error('Supporting files cannot exceed the 20 MB size limit.');
        }
        setUploadProgress(true);
        const uploadRes = await uploadProjectTaskFile(project.id, assignAttachFile);
        attachmentObj = {
          attachment_type: assignAttachType,
          title: assignAttachTitle.trim() || assignAttachFile.name,
          file_path: uploadRes.filePath,
          file_name: assignAttachFile.name,
          file_mime_type: assignAttachFile.type,
          file_size_bytes: uploadRes.sizeBytes,
          storage_bucket: 'project-task-files'
        };
      }

      await createProjectTask({
        project_id: project.id,
        assigned_to: newTaskAssignee,
        title: newTaskTitle.trim(),
        objective: newTaskObjective.trim(),
        priority: newTaskPriority,
        due_at: new Date(newTaskDueAt).toISOString(),
        status: 'assigned'
      }, attachmentObj ? [attachmentObj] : undefined);

      toast.success('Task assigned successfully with secure attachments! 🚀');
      
      // Reset form
      setNewTaskTitle('');
      setNewTaskObjective('');
      setNewTaskAssignee('');
      setNewTaskDueAt('');
      setAssignAttachMode('none');
      setAssignAttachTitle('');
      setAssignAttachUrl('');
      setAssignAttachFile(null);
      
      setActiveSubView('board');
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error creating task.');
    } finally {
      setLoading(false);
      setUploadProgress(false);
    }
  };

  const handleMarkInProgress = async (taskId: string) => {
    try {
      await markTaskInProgress(taskId);
      toast.success('Task marked as in-progress! Let\'s do this! 💪');
      refreshTasks();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, status: 'in_progress' } : null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating task status');
    }
  };

  const handleCancelTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to cancel this task? This action cannot be undone.')) return;
    try {
      await cancelProjectTask(taskId);
      toast.info('Task cancelled.');
      refreshTasks();
      setSelectedTask(null);
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling task');
    }
  };

  const handleSubmitWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    if (submissionNote.trim().length < 10) {
      toast.error('Submission notes must be at least 10 characters.');
      return;
    }

    if (submissionAttachMode === 'link' && (!submissionUrl || !submissionUrl.trim())) {
      toast.error('Please paste a secure HTTPS link to your work.');
      return;
    }
    if (submissionAttachMode === 'file' && !submissionFile) {
      toast.error('Please select a file asset to submit.');
      return;
    }

    setLoading(true);
    try {
      let fileObj: any = null;

      if (submissionAttachMode === 'link') {
        if (!submissionUrl || !submissionUrl.startsWith('https://')) {
          throw new Error('External work links must strictly use the https:// protocol.');
        }
        fileObj = {
          file_type: submissionAttachType,
          title: 'Work Link',
          url: submissionUrl
        };
      } else if (submissionAttachMode === 'file' && submissionFile) {
        if (isDangerousFile(submissionFile)) {
          throw new Error('Unsupported or hazardous executable formats are blocked for security.');
        }
        if (submissionFile.size > 20 * 1024 * 1024) {
          throw new Error('Submission deliverables cannot exceed the 20 MB size limit.');
        }
        const uploadRes = await uploadProjectTaskFile(project.id, submissionFile);
        fileObj = {
          file_type: submissionAttachType,
          title: submissionFile.name,
          file_path: uploadRes.filePath,
          file_name: submissionFile.name,
          file_mime_type: submissionFile.type,
          file_size_bytes: uploadRes.sizeBytes,
          storage_bucket: 'project-task-files'
        };
      }

      await submitProjectTask({
        task_id: selectedTask.id,
        project_id: project.id,
        submission_note: submissionNote.trim(),
        files: fileObj ? [fileObj] : []
      });

      toast.success('Work submitted successfully! Pending Team Lead verification. ⏳');
      setSubmissionNote('');
      setSubmissionUrl('');
      setSubmissionFile(null);
      setSelectedTask(null);
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error submitting work.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmission = async (subId: string, taskId: string) => {
    if (!window.confirm('Withdraw this submission? You will be able to edit and resubmit your work.')) return;
    setLoading(true);
    try {
      await withdrawTaskSubmission(subId, taskId);
      toast.info('Submission withdrawn. Task status reverted.');
      setSelectedTask(null);
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error withdrawing submission');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmission = async (subId: string, taskId: string) => {
    if (!window.confirm('Verify and approve this submission? This will mark the task as fully completed.')) return;
    const feedback = prompt('Feedback / appreciation for the teammate (optional):') || 'Outstanding work! Verified.';
    setLoading(true);
    try {
      await verifyTaskSubmission(subId, taskId, feedback);
      toast.success('Submission approved and verified! Work history updated. 🎉');
      setSelectedTask(null);
      refreshTasks();
      loadQueuesData();
    } catch (err: any) {
      toast.error(err.message || 'Error verifying work');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSubmission = async (subId: string, taskId: string) => {
    const reason = prompt('Reason for requesting revision / rejecting work? (Required):');
    if (!reason || !reason.trim()) {
      toast.error('Rejection reason is required to request changes.');
      return;
    }
    setLoading(true);
    try {
      await rejectTaskSubmission(subId, taskId, reason.trim());
      toast.info('Revision requested. Submission returned as rejected.');
      setSelectedTask(null);
      refreshTasks();
      loadQueuesData();
    } catch (err: any) {
      toast.error(err.message || 'Error requesting revision');
    } finally {
      setLoading(false);
    }
  };

  // Extension request actions
  const handleRequestExtensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    if (new Date(extRequestedDate) <= new Date()) {
      toast.error('Requested extension date must be in the future.');
      return;
    }
    if (new Date(extRequestedDate) <= new Date(selectedTask.due_at)) {
      toast.error('Requested date must be strictly later than the current due date.');
      return;
    }
    if (extReason.trim().length < 15) {
      toast.error('Please provide a descriptive reason (minimum 15 characters) for the extension.');
      return;
    }

    setLoading(true);
    try {
      await requestTaskExtension(selectedTask.id, project.id, selectedTask.due_at, new Date(extRequestedDate).toISOString(), extReason.trim());
      toast.success('Deadline extension requested! Lead has been notified. ⏰');
      setExtRequestedDate('');
      setExtReason('');
      setIsExtensionModalOpen(false);
      setSelectedTask(null);
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Could not request extension.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExtension = async (reqId: string, taskId: string, requestedDueAt: string) => {
    const note = prompt('Add optional reviewer response / approval note:') || 'Approved.';
    setLoading(true);
    try {
      await approveTaskExtension(reqId, taskId, requestedDueAt, note);
      toast.success('Deadline extension approved! Task updated.');
      loadQueuesData();
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error approving extension');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectExtension = async (reqId: string, taskId: string) => {
    const note = prompt('Add optional reviewer explanation / rejection note:') || 'Rejected.';
    setLoading(true);
    try {
      await rejectTaskExtension(reqId, taskId, note);
      toast.info('Extension request rejected. Task deadline preserved.');
      loadQueuesData();
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error rejecting extension');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawExtension = async (reqId: string, taskId: string) => {
    if (!window.confirm('Withdraw this deadline extension request?')) return;
    setLoading(true);
    try {
      await withdrawTaskExtensionRequest(reqId, taskId);
      toast.info('Extension request withdrawn.');
      setSelectedTask(null);
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error withdrawing extension request');
    } finally {
      setLoading(false);
    }
  };

  // Safe file previewer trigger
  const triggerFilePreview = async (name: string, type: string, path: string) => {
    setLoadingPreview(true);
    setPreviewFileName(name);
    setPreviewFileType(type);
    setPreviewFileUrl('');
    try {
      const url = await getSafeTaskFileUrl(path);
      setPreviewFileUrl(url);
    } catch (err: any) {
      toast.error('Could not generate secure signed URL.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Helper styles
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'urgent': return 'bg-red-50 text-red-700 border-red-200';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium': return 'bg-indigo-50 text-indigo-700 border-indigo-150';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusBadge = (status: string, task: ProjectTask) => {
    const isOverdue = getIsOverdue(task);
    if (isOverdue) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-250 animate-pulse">
          ⚠️ Overdue
        </span>
      );
    }

    switch(status) {
      case 'assigned': return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">Assigned</span>;
      case 'in_progress': return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-150">In Progress</span>;
      case 'submitted': return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-150">Submitted</span>;
      case 'verified': return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-150">Verified</span>;
      case 'rejected': return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-150">Needs Revision</span>;
      case 'extension_requested': return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-250">Extension Pending</span>;
      case 'extended': return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-teal-50 text-teal-700 border border-teal-150">Extended</span>;
      case 'cancelled': return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-150 text-slate-500 border border-slate-200 line-through">Cancelled</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-250">{status}</span>;
    }
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '💾 PDF';
      case 'image': return '🖼️ Image';
      case 'video': return '🎥 Video';
      case 'document': return '📄 Doc';
      case 'presentation': return '🖥️ Slide';
      case 'folder': return '📁 Folder Link';
      case 'code_repo': return '💻 Repo Link';
      default: return '🔗 Web Link';
    }
  };

  const TaskCard = ({ task }: { task: ProjectTask }) => {
    const isOverdue = getIsOverdue(task);
    return (
      <div className={`p-4 bg-white border rounded-2xl flex flex-col justify-between space-y-3.5 relative hover:shadow-md transition-all text-xs ${isOverdue ? 'border-red-200 shadow-sm shadow-red-50/20' : 'border-slate-200'}`}>
        <div className="space-y-1.5">
          <div className="flex justify-between items-start gap-3">
            <h4 className="font-extrabold text-slate-850 text-sm line-clamp-1 pr-6 break-words break-all" title={task.title}>{task.title}</h4>
            <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-black border shrink-0 ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          </div>
          <p className="text-slate-505 line-clamp-2 leading-relaxed italic pr-2">"{task.objective}"</p>
          
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              👤 <span className="text-slate-600">{task.assignee_profile?.full_name || 'Teammate'}</span>
            </span>
            <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600' : 'text-slate-400'}`}>
              📅 Due: {new Date(task.due_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-150 flex items-center justify-between mt-auto shrink-0">
          {getStatusBadge(task.status, task)}
          <button 
            onClick={() => setSelectedTask(task)}
            className="px-3 py-1.5 text-[10px] font-black text-indigo-750 bg-indigo-50/60 hover:bg-indigo-55 hover:text-indigo-800 border border-indigo-150 rounded-lg transition-all"
          >
            View Workspace Details →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-650 shrink-0 font-bold text-sm">📋</div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</p>
            <p className="text-lg font-black text-slate-800">{tasks.length}</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-650 shrink-0 font-bold text-sm">👤</div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Tasks</p>
            <p className="text-lg font-black text-indigo-650">{myTasks.length}</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-650 shrink-0 font-bold text-sm">⏳</div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Review</p>
            <p className="text-lg font-black text-amber-700">{pendingReview.length}</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-650 shrink-0 font-bold text-sm">✅</div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified Completed</p>
            <p className="text-lg font-black text-emerald-700">{tasks.filter(t => t.status === 'verified').length}</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-650 shrink-0 font-bold text-sm">⚠️</div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue Tasks</p>
            <p className="text-lg font-black text-rose-700">{overdueCount}</p>
          </div>
        </div>
      </div>

      {/* Consol Navigation bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex border-b border-slate-100 p-1 bg-slate-50/50 rounded-xl gap-1.5 overflow-x-auto thin-scrollbar w-full sm:w-auto">
          <button
            onClick={() => setActiveSubView('board')}
            className={`px-3.5 py-2 text-xs font-black rounded-lg border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeSubView === 'board' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📋 Task Board
          </button>
          
          <button
            onClick={() => setActiveSubView('dashboard')}
            className={`px-3.5 py-2 text-xs font-black rounded-lg border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeSubView === 'dashboard' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📊 My Work Dashboard
          </button>

          {project.is_owner && (
            <>
              <button
                onClick={() => setActiveSubView('assign')}
                className={`px-3.5 py-2 text-xs font-black rounded-lg border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeSubView === 'assign' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                ➕ Assign Task
              </button>
              <button
                onClick={() => setActiveSubView('review')}
                className={`px-3.5 py-2 text-xs font-black rounded-lg border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeSubView === 'review' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                👀 Review Queue ({pendingReview.length})
              </button>
              <button
                onClick={() => setActiveSubView('extensions')}
                className={`px-3.5 py-2 text-xs font-black rounded-lg border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeSubView === 'extensions' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                ⏰ Extension Requests
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub Views */}
      {activeSubView === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2 flex justify-between items-center bg-slate-50/50 p-2 rounded-xl">
              <h3 className="font-black text-sm text-slate-800">To Do / In Progress</h3>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] rounded-full font-bold">
                {tasks.filter(t => ['assigned', 'in_progress', 'rejected'].includes(t.status)).length}
              </span>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto thin-scrollbar pr-1">
              {tasks.filter(t => ['assigned', 'in_progress', 'rejected'].includes(t.status)).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No tasks currently pending activity.</p>
              ) : (
                tasks.filter(t => ['assigned', 'in_progress', 'rejected'].includes(t.status)).map(t => (
                  <TaskCard key={t.id} task={t} />
                ))
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2 flex justify-between items-center bg-amber-50/40 p-2 rounded-xl border border-amber-100">
              <h3 className="font-black text-sm text-amber-800">Review Requested</h3>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full font-bold border border-amber-200">
                {tasks.filter(t => ['submitted', 'extension_requested'].includes(t.status)).length}
              </span>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto thin-scrollbar pr-1">
              {tasks.filter(t => ['submitted', 'extension_requested'].includes(t.status)).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No submissions or actions pending review.</p>
              ) : (
                tasks.filter(t => ['submitted', 'extension_requested'].includes(t.status)).map(t => (
                  <TaskCard key={t.id} task={t} />
                ))
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="border-b border-emerald-200 pb-2 flex justify-between items-center bg-emerald-50/30 p-2 rounded-xl border border-emerald-100">
              <h3 className="font-black text-sm text-emerald-800">Verified &amp; Completed</h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full font-bold border border-emerald-200">
                {tasks.filter(t => ['verified', 'extended'].includes(t.status)).length}
              </span>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto thin-scrollbar pr-1">
              {tasks.filter(t => ['verified', 'extended'].includes(t.status)).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No verified completions yet. Keep going! 🚀</p>
              ) : (
                tasks.filter(t => ['verified', 'extended'].includes(t.status)).map(t => (
                  <TaskCard key={t.id} task={t} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubView === 'dashboard' && (() => {
        // Compute per-group filters — grouped by task status
        const myAssigned = myTasks.filter(t => t.status === 'assigned');
        const myInProgress = myTasks.filter(t => t.status === 'in_progress');
        const myPendingReview = myTasks.filter(t => t.status === 'submitted');
        const myVerified = myTasks.filter(t => t.status === 'verified');
        const myNeedsRevision = myTasks.filter(t => t.status === 'rejected');
        const myExtensionRequested = myTasks.filter(t => t.status === 'extension_requested' || t.status === 'extended');
        const myOverdue = myTasks.filter(t => getIsOverdue(t) && !['verified', 'cancelled'].includes(t.status));

        const DashGroup = ({
          emoji, label, count, colorClass, tasks: groupTasks
        }: { emoji: string; label: string; count: number; colorClass: string; tasks: ProjectTask[] }) => (
          groupTasks.length > 0 ? (
            <div className="space-y-2">
              <div className={`flex justify-between items-center pb-1 border-b ${colorClass}`}>
                <h4 className="font-black text-xs flex items-center gap-1">
                  <span>{emoji}</span>
                  <span>{label}</span>
                </h4>
                <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-[9px] rounded-full font-bold shadow-xs">{count}</span>
              </div>
              <div className="space-y-2 max-h-[260px] overflow-y-auto thin-scrollbar pr-0.5">
                {groupTasks.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          ) : null
        );

        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl space-y-1.5">
              <h3 className="font-black text-base text-slate-800">📊 My Project Work Dashboard</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                All tasks assigned to you, grouped by current status. Click any task to submit work, check feedback, or request a deadline extension.
              </p>
            </div>

            {myTasks.length === 0 ? (
              <div className="py-14 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-4xl mb-3">🗂️</div>
                <p className="text-sm font-black text-slate-500">No project work assigned yet.</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">The team lead will assign tasks to you here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Overdue — always first if any */}
                {myOverdue.length > 0 && (
                  <div className="sm:col-span-2 lg:col-span-3 p-4 bg-red-50/70 border border-red-200 rounded-2xl shadow-sm space-y-2">
                    <div className="flex justify-between items-center border-b border-red-200 pb-1.5">
                      <h4 className="font-black text-xs text-red-800 flex items-center gap-1.5">⚠️ Overdue Tasks</h4>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 text-[9px] rounded-full font-bold">{myOverdue.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {myOverdue.map(t => <TaskCard key={t.id} task={t} />)}
                    </div>
                  </div>
                )}

                <DashGroup emoji="📋" label="Assigned" count={myAssigned.length} colorClass="border-slate-200 text-slate-700" tasks={myAssigned} />
                <DashGroup emoji="⚡" label="In Progress" count={myInProgress.length} colorClass="border-blue-200 text-blue-700" tasks={myInProgress} />
                <DashGroup emoji="⏳" label="Pending Review" count={myPendingReview.length} colorClass="border-purple-200 text-purple-700" tasks={myPendingReview} />
                <DashGroup emoji="✅" label="Verified" count={myVerified.length} colorClass="border-emerald-200 text-emerald-700" tasks={myVerified} />
                <DashGroup emoji="🔁" label="Needs Revision" count={myNeedsRevision.length} colorClass="border-rose-200 text-rose-700" tasks={myNeedsRevision} />
                <DashGroup emoji="📅" label="Extension Requested / Granted" count={myExtensionRequested.length} colorClass="border-amber-200 text-amber-700" tasks={myExtensionRequested} />
              </div>
            )}
          </div>
        );
      })()}

      {activeSubView === 'assign' && project.is_owner && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-2xl animate-fade-in">
          <h3 className="text-lg font-black text-slate-800 mb-5">Assign a New Task Definition</h3>
          
          {/* Simple Preset Templates */}
          <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">💡 Task Presets / Quick Assign</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { title: 'Frontend UI Task', objective: 'Implement the responsive user interface, styled components, alignment polish, interactive state transitions, and responsive stacking according to mockups.', priority: 'medium' },
                { title: 'Backend API Task', objective: 'Develop secure database endpoints, helper libraries, validation logic, RLS rules, and error handling for data transactions.', priority: 'high' },
                { title: 'Design & UI/UX Task', objective: 'Create harmonized color systems, Outfit typography, high-fidelity mockups, visual assets, and detailed flow diagram wireframes.', priority: 'low' },
                { title: 'Research/Documentation Task', objective: 'Investigate technical architecture feasibility, compile competitor analysis report, and construct clear markdown documentation files.', priority: 'low' },
                { title: 'Testing/QA Task', objective: 'Verify functionality across mobile layouts, check edge cases, run typescript checks, and document all test coverage results.', priority: 'medium' },
                { title: 'Presentation/Demo Task', objective: 'Prepare a 5-minute video walkthrough, outline slide deck presentation, and polish the final application deployment flow.', priority: 'urgent' }
              ].map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setNewTaskTitle(tmpl.title);
                    setNewTaskObjective(tmpl.objective);
                    setNewTaskPriority(tmpl.priority as any);
                    toast.info(`Prefilled: "${tmpl.title}"`);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-700 transition-all shadow-sm flex items-center gap-1 shrink-0"
                >
                  ✨ {tmpl.title.split(' ')[0]} {tmpl.title.includes('&') ? '& UI/UX' : tmpl.title.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAssignTaskSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Task Title *</label>
              <input 
                required 
                value={newTaskTitle} 
                onChange={e=>setNewTaskTitle(e.target.value)} 
                type="text" 
                placeholder="e.g. Set up Supabase Schemas and seed data"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium" 
              />
              <span className="text-[9px] text-slate-400 mt-0.5 block">5 to 100 characters.</span>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Instructions / Objectives *</label>
              <textarea 
                required 
                value={newTaskObjective} 
                onChange={e=>setNewTaskObjective(e.target.value)} 
                rows={3} 
                placeholder="Detail what needs to be delivered, steps, and expected parameters..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium" 
              />
              <span className="text-[9px] text-slate-400 mt-0.5 block">Minimum 10 characters.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assign Teammate *</label>
                <select 
                  required 
                  value={newTaskAssignee} 
                  onChange={e=>setNewTaskAssignee(e.target.value)} 
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-50 font-medium"
                >
                  <option value="">Select active member...</option>
                  {teamMembers.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.user_id} ({m.role_name || 'Teammate'})</option>
                  ))}
                </select>
                {teamMembers.length === 0 && (
                  <span className="text-[9px] text-amber-600 font-bold block mt-1">⚠️ Add active teammates to your project roster before assigning tasks.</span>
                )}
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Priority *</label>
                <select 
                  required 
                  value={newTaskPriority} 
                  onChange={e=>setNewTaskPriority(e.target.value as any)} 
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-50 font-medium"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">⚠️ Urgent Priority</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Deadline Date &amp; Time *</label>
              <input 
                required 
                value={newTaskDueAt} 
                onChange={e=>setNewTaskDueAt(e.target.value)} 
                type="datetime-local" 
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-50 font-medium" 
              />
              <span className="text-[9px] text-slate-400 mt-0.5 block">Must be set in the future.</span>
            </div>

            {/* Premium Attachment Section */}
            <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">📎 Task Supporting Material</span>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setAssignAttachMode('none'); setAssignAttachFile(null); }} 
                    className={`px-2.5 py-1 rounded text-[10px] font-black border transition-all ${assignAttachMode === 'none' ? 'bg-indigo-650 border-indigo-650 text-white shadow-xs' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    None
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setAssignAttachMode('link'); setAssignAttachFile(null); }} 
                    className={`px-2.5 py-1 rounded text-[10px] font-black border transition-all ${assignAttachMode === 'link' ? 'bg-indigo-650 border-indigo-650 text-white shadow-xs' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    Add HTTPS Link
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setAssignAttachMode('file'); }} 
                    className={`px-2.5 py-1 rounded text-[10px] font-black border transition-all ${assignAttachMode === 'file' ? 'bg-indigo-650 border-indigo-650 text-white shadow-xs' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    Upload Secure File
                  </button>
                </div>
              </div>

              {assignAttachMode !== 'none' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attachment Title (Optional)</label>
                      <input 
                        type="text" 
                        value={assignAttachTitle} 
                        onChange={e=>setAssignAttachTitle(e.target.value)} 
                        placeholder="e.g. Design Blueprint, API Spec" 
                        className="w-full px-3 py-2 border rounded-xl bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Material Type</label>
                      <select 
                        value={assignAttachType} 
                        onChange={e=>setAssignAttachType(e.target.value as any)} 
                        className="w-full px-3 py-2 border rounded-xl bg-white focus:outline-none"
                      >
                        <option value="link">Web Link</option>
                        <option value="pdf">PDF File</option>
                        <option value="document">Word Doc / Markdown</option>
                        <option value="presentation">Powerpoint Slide</option>
                        <option value="image">Image Asset</option>
                        <option value="video">Secure Video Demo</option>
                        <option value="folder">Google Drive / Shared Folder</option>
                        <option value="code_repo">GitHub Code Repository</option>
                        <option value="other">Other Asset</option>
                      </select>
                    </div>
                  </div>

                  {assignAttachMode === 'link' ? (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">HTTPS Resource Link *</label>
                      <input 
                        type="url" 
                        value={assignAttachUrl} 
                        onChange={e=>setAssignAttachUrl(e.target.value)} 
                        placeholder="https://..." 
                        className="w-full px-3 py-2 border rounded-xl bg-white focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Only secure https:// links are permitted for security.</span>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select File Asset *</label>
                      <input 
                        type="file" 
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          if (file && isDangerousFile(file)) {
                            toast.error('Executables (.exe, .bat, .sh, etc.) are strictly blocked for campus protection.');
                            e.target.value = '';
                            setAssignAttachFile(null);
                            return;
                          }
                          setAssignAttachFile(file);
                        }} 
                        className="w-full text-slate-500 font-bold file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Allowed: PDF, DOC, PPT, PNG, JPG, MP4, CSV, ZIP. Max limit 20MB. Executables blocked.</span>
                      {assignAttachFile && (
                        <span className="text-[9px] text-indigo-600 font-black mt-1 block">Selected: {assignAttachFile.name} ({(assignAttachFile.size / 1024).toFixed(1)} KB)</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                disabled={loading || uploadProgress || teamMembers.length === 0} 
                type="submit" 
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-xs whitespace-nowrap"
              >
                {loading ? 'Assigning...' : 'Assign Secure Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSubView === 'review' && project.is_owner && (
        <div className="space-y-4 animate-fade-in">
          <div className="border-b border-slate-200 pb-2 bg-slate-50/50 p-2.5 rounded-2xl flex justify-between items-center">
            <h3 className="font-black text-sm text-slate-800">Outstanding Teammate Work Submissions</h3>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-750 border border-indigo-150 text-[10px] rounded-full font-black">
              {pendingReview.length} pending approval
            </span>
          </div>

          {loadingQueues ? (
            <div className="py-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
          ) : pendingReview.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-12 bg-white border border-slate-150 rounded-2xl">
              All clear! No teammate work submissions are currently pending your approval. 👍
            </p>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto thin-scrollbar pr-1">
              {pendingReview.map(task => {
                const isOverdue = getIsOverdue(task);
                return (
                  <div key={task.id} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm text-xs relative hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2.5 gap-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-850 text-sm">{task.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Assigned to <span className="font-extrabold text-slate-600">{task.assignee_profile?.full_name}</span> · Due: {new Date(task.due_at).toLocaleDateString()} {isOverdue && <span className="text-red-600 font-bold ml-1">⚠️ Overdue</span>}
                        </span>
                      </div>
                      <button 
                        onClick={() => setSelectedTask(task)} 
                        className="px-3 py-1.5 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg self-start sm:self-auto hover:bg-indigo-100 transition-colors"
                      >
                        Inspect Submission Details
                      </button>
                    </div>

                    <p className="text-slate-505 italic bg-slate-50/50 p-3 rounded-xl border border-slate-100 pr-4 leading-relaxed font-semibold">
                      "Instructions / Parameter: {task.objective}"
                    </p>

                    <div className="pt-2 flex justify-end gap-2.5 shrink-0 border-t border-slate-100 mt-2">
                      <button 
                        onClick={() => setSelectedTask(task)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs"
                      >
                        Review &amp; Verify Work
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSubView === 'extensions' && project.is_owner && (
        <div className="space-y-4 animate-fade-in text-xs">
          <div className="border-b border-slate-200 pb-2 bg-slate-50/50 p-2.5 rounded-2xl flex justify-between items-center">
            <h3 className="font-black text-sm text-slate-800">Deadline Extension Requests Queue</h3>
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-250 text-[10px] rounded-full font-black">
              {extensionRequests.filter(r => r.status === 'pending').length} pending approval
            </span>
          </div>

          {loadingQueues ? (
            <div className="py-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
          ) : extensionRequests.filter(r => r.status === 'pending').length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-12 bg-white border border-slate-150 rounded-2xl">
              No extension requests are currently pending review.
            </p>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto thin-scrollbar pr-1">
              {extensionRequests.filter(r => r.status === 'pending').map(req => (
                <div key={req.id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3.5 shadow-sm">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-black text-slate-800 text-sm">Task: {req.task?.title || 'Unknown Task'}</h4>
                      <span className="text-[10px] text-slate-400">
                        Requested by <span className="font-bold text-slate-600">{req.requester_profile?.full_name}</span> on {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-250 font-black text-[9px] uppercase rounded">
                      Extension Pending
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] font-bold py-2 bg-slate-50 rounded-xl px-3 text-slate-500">
                    <div>
                      <p className="text-slate-400 uppercase tracking-wide">Current Due Date</p>
                      <p className="text-slate-800 text-xs">{new Date(req.old_due_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-amber-700 uppercase tracking-wide">Requested Due Date</p>
                      <p className="text-amber-800 text-xs">{new Date(req.requested_due_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <p className="italic bg-slate-50 p-2.5 rounded-lg text-slate-600">"Reason: {req.reason}"</p>

                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => handleRejectExtension(req.id, req.task_id)}
                      className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-150 rounded-lg transition-colors"
                    >
                      Decline Request
                    </button>
                    <button 
                      onClick={() => handleApproveExtension(req.id, req.task_id, req.requested_due_at)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-xs"
                    >
                      Approve &amp; Extend
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Details Drawer/Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(selectedTask.status, selectedTask)}
                  <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-black border ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority} Priority
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-800 mt-2">{selectedTask.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedTask(null)} 
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors font-bold text-sm shrink-0"
              >
                ✕
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed">
              
              {/* Objective */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">Instructions &amp; Parameters</h4>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-semibold bg-slate-50 p-4 rounded-xl border border-slate-150">
                  {selectedTask.objective}
                </p>
              </div>

              {/* Attachments from Lead */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2.5">Supporting Assets &amp; Links</h4>
                {loadingDetails ? (
                  <span className="italic text-slate-400 block py-2 animate-pulse">Loading attachments...</span>
                ) : selectedTaskAttachments.length === 0 ? (
                  <p className="text-slate-400 italic font-semibold">No supporting materials attached during task creation.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {selectedTaskAttachments.map(att => (
                      <div key={att.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-slate-800 line-clamp-1 break-words break-all">{att.title || 'Supporting File'}</p>
                          <span className="text-[9px] text-indigo-500 font-bold bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
                            {getAttachmentIcon(att.attachment_type)}
                          </span>
                          {att.file_size_bytes && (
                            <span className="text-[9px] text-slate-400 font-bold ml-1.5">({(att.file_size_bytes / 1024).toFixed(1)} KB)</span>
                          )}
                        </div>

                        <div className="shrink-0">
                          {att.file_path ? (
                            <div className="flex gap-2">
                              {['pdf', 'image', 'video'].includes(att.attachment_type) && (
                                <button 
                                  onClick={() => triggerFilePreview(att.file_name || 'Asset', att.attachment_type, att.file_path!)}
                                  className="text-[10px] font-black text-indigo-650 hover:underline"
                                >
                                  {att.attachment_type === 'video' ? '▶ Play' : 'Preview'}
                                </button>
                              )}
                              <button 
                                onClick={async () => {
                                  try {
                                    const url = await getSafeTaskFileUrl(att.file_path!);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.target = '_blank';
                                    link.download = att.file_name || 'download';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    toast.success('Download started!');
                                  } catch (err) {
                                    toast.error('Download failed.');
                                  }
                                }}
                                className="text-[10px] font-black text-slate-600 hover:underline"
                              >
                                Download
                              </button>
                            </div>
                          ) : att.url ? (
                            <a 
                              href={att.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[10px] font-black text-indigo-650 hover:underline flex items-center gap-0.5"
                            >
                              <span>Open Link</span>
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                          ) : (
                            <span 
                              className="text-[9px] text-slate-350 italic font-semibold cursor-not-allowed"
                              title="No file or link was attached to this asset."
                            >
                              — No source attached
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submissions & Reviews History */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2.5">Submissions &amp; Activity Log</h4>
                {loadingDetails ? (
                  <span className="italic text-slate-400 block py-2 animate-pulse">Loading work logs...</span>
                ) : selectedTaskSubmissions.length === 0 ? (
                  <p className="text-slate-400 italic">No work submissions recorded for this task yet.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedTaskSubmissions.map(sub => {
                      const files = selectedTaskSubmissionFiles[sub.id] || [];
                      return (
                        <div key={sub.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                            <span className="font-extrabold text-slate-700">Submitted by {sub.submitter_profile?.full_name || 'Member'}</span>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(sub.submitted_at).toLocaleString()}</span>
                          </div>
                          
                          <p className="italic leading-relaxed text-slate-600 font-semibold bg-white p-2.5 border border-slate-100 rounded-lg pr-4">
                            "Notes: {sub.submission_note}"
                          </p>

                          {files.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Attached Deliverables</p>
                              {files.map(file => (
                                <div key={file.id} className="flex justify-between items-center bg-white p-2 border border-slate-150 rounded-lg">
                                  <span className="font-bold text-slate-700 truncate max-w-[70%]" title={file.file_name}>{file.file_name || 'Deliverable'}</span>
                                  <div className="shrink-0 flex gap-2.5">
                                    {file.file_path ? (
                                      <>
                                        {['pdf', 'image', 'video'].includes(file.file_type) && (
                                          <button 
                                            onClick={() => triggerFilePreview(file.file_name || 'Asset', file.file_type, file.file_path!)}
                                            className="text-[10px] font-black text-indigo-650 hover:underline"
                                          >
                                            Preview
                                          </button>
                                        )}
                                        <button 
                                          onClick={async () => {
                                            try {
                                              const url = await getSafeTaskFileUrl(file.file_path!);
                                              const link = document.createElement('a');
                                              link.href = url;
                                              link.target = '_blank';
                                              link.download = file.file_name || 'download';
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                            } catch (err) {
                                              toast.error('Download failed.');
                                            }
                                          }}
                                          className="text-[10px] font-black text-slate-600 hover:underline"
                                        >
                                          Download
                                        </button>
                                      </>
                                    ) : file.url ? (
                                      <a 
                                        href={file.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-[10px] font-black text-indigo-650 hover:underline flex items-center gap-0.5"
                                      >
                                        Open Link
                                      </a>
                                    ) : (
                                      <span
                                        className="text-[9px] text-slate-350 italic font-semibold cursor-not-allowed"
                                        title="No file or link was attached to this deliverable."
                                      >
                                        — No source
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {sub.status === 'verified' && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                              <span className="text-[10px] font-black uppercase text-emerald-800 block">✅ Lead Approved &amp; Verified</span>
                              {sub.review_feedback && <p className="italic text-emerald-700 font-semibold">"{sub.review_feedback}"</p>}
                            </div>
                          )}

                          {sub.status === 'rejected' && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                              <span className="text-[10px] font-black uppercase text-red-800 block">❌ Lead Requested Changes</span>
                              {sub.review_feedback && <p className="italic text-red-700 font-semibold">"Feedback: {sub.review_feedback}"</p>}
                            </div>
                          )}

                          {sub.status === 'pending_review' && project.is_owner && (
                            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200/50">
                              <button 
                                onClick={() => handleRejectSubmission(sub.id, selectedTask.id)}
                                className="px-3.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-150 rounded-lg"
                              >
                                Request Changes
                              </button>
                              <button 
                                onClick={() => handleVerifySubmission(sub.id, selectedTask.id)}
                                className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                              >
                                Verify &amp; Complete
                              </button>
                            </div>
                          )}

                          {sub.status === 'pending_review' && sub.submitted_by === currentUser.id && (
                            <div className="flex justify-end pt-2">
                              <button 
                                onClick={() => handleWithdrawSubmission(sub.id, selectedTask.id)}
                                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-150 rounded-lg text-[10px]"
                              >
                                Withdraw Submission
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Task Status Alert Banners */}
              <div className="space-y-3">
                {selectedTask.status === 'verified' && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-250 rounded-2xl flex items-start gap-3 text-emerald-800 font-semibold leading-relaxed animate-fade-in shadow-xs">
                    <span className="text-lg shrink-0">🏆</span>
                    <div className="space-y-1">
                      <p className="font-extrabold text-xs text-emerald-950 uppercase tracking-wide">Task Verified & Completed</p>
                      <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
                        This task has been successfully completed, reviewed, and verified by the Project Lead. 
                        The contribution has been logged to the assignee's profile work history. No further work is required.
                      </p>
                    </div>
                  </div>
                )}
                {selectedTask.status === 'cancelled' && (
                  <div className="p-4 bg-slate-100 border border-slate-250 rounded-2xl flex items-start gap-3 text-slate-700 font-semibold leading-relaxed animate-fade-in shadow-xs">
                    <span className="text-lg shrink-0">🚫</span>
                    <div className="space-y-1">
                      <p className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">Task Assignment Cancelled</p>
                      <p className="text-[10px] text-slate-550 font-medium leading-relaxed">
                        This task assignment has been officially cancelled by the Project Lead. No further submissions or reviews can be processed.
                      </p>
                    </div>
                  </div>
                )}
                {selectedTask.status === 'submitted' && (
                  <div className="p-4 bg-purple-50/70 border border-purple-250 rounded-2xl flex items-start gap-3 text-purple-800 font-semibold leading-relaxed animate-fade-in shadow-xs">
                    <span className="text-lg shrink-0">⏳</span>
                    <div className="space-y-1">
                      <p className="font-extrabold text-xs text-purple-950 uppercase tracking-wide">Work Pending Lead Review</p>
                      <p className="text-[10px] text-purple-700 font-medium leading-relaxed">
                        Your work has been submitted and is currently pending verification from the Project Lead. 
                        If you need to make changes, you can withdraw your submission below.
                      </p>
                    </div>
                  </div>
                )}
                {selectedTask.status === 'rejected' && (
                  <div className="p-4 bg-rose-50/70 border border-rose-250 rounded-2xl flex items-start gap-3 text-rose-800 font-semibold leading-relaxed animate-fade-in shadow-xs">
                    <span className="text-lg shrink-0">⚠️</span>
                    <div className="space-y-1">
                      <p className="font-extrabold text-xs text-rose-950 uppercase tracking-wide">Revisions Requested</p>
                      <p className="text-[10px] text-rose-700 font-medium leading-relaxed">
                        The Project Lead has requested revisions. Please read the review feedback below, make the necessary improvements to your work, and submit the new deliverables.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Panels depending on roles */}
              {selectedTask.assigned_to === currentUser.id && (
                <div className="space-y-4">
                  
                  {/* Mark In Progress if Assigned */}
                  {selectedTask.status === 'assigned' && (
                    <div className="p-4 bg-blue-50 border border-blue-150 rounded-2xl flex items-center justify-between gap-3 animate-fade-in shadow-xs">
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-blue-800 text-sm">Ready to start?</p>
                        <p className="text-[10px] text-blue-600 font-medium leading-relaxed">Mark this task in-progress to signal to the lead you have begun working.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMarkInProgress(selectedTask.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shrink-0 text-xs shadow-md"
                      >
                        ⚡ Start Working
                      </button>
                    </div>
                  )}

                  {/* Withdraw Pending Extension if requested */}
                  {(() => {
                    const myPendingExtension = extensionRequests.find(r => r.task_id === selectedTask.id && r.status === 'pending' && r.requested_by === currentUser.id);
                    if (!myPendingExtension) return null;
                    return (
                      <div className="p-4 bg-amber-50 border border-amber-250 rounded-2xl flex items-center justify-between gap-3 animate-fade-in shadow-xs text-xs">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-amber-800">Extension Request Pending</p>
                          <p className="text-[10px] text-amber-600 font-semibold leading-relaxed">
                            You requested an extension to {new Date(myPendingExtension.requested_due_at).toLocaleDateString()}.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleWithdrawExtension(myPendingExtension.id, selectedTask.id)}
                          className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-150 text-red-600 font-black rounded-lg shrink-0 text-[10px] transition-colors"
                        >
                          Withdraw Request
                        </button>
                      </div>
                    );
                  })()}

                  {/* Submit Form if not verified or cancelled */}
                  {['assigned', 'in_progress', 'rejected'].includes(selectedTask.status) && (
                    <div className="bg-indigo-50/50 border border-indigo-150 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                        <h4 className="text-sm font-black text-indigo-800">Submit Your Finished Work</h4>
                        {(() => {
                          const hasPendingExt = extensionRequests.some(r => r.task_id === selectedTask.id && r.status === 'pending' && r.requested_by === currentUser.id);
                          if (hasPendingExt) return null;
                          return (
                            <button 
                              onClick={() => {
                                setExtRequestedDate('');
                                setExtReason('');
                                setIsExtensionModalOpen(true);
                              }}
                              className="text-[10px] font-black text-indigo-700 hover:underline uppercase bg-white px-2 py-1 border border-indigo-200 rounded"
                            >
                              ⏰ Request Extension
                            </button>
                          );
                        })()}
                      </div>
                  
                  <form onSubmit={handleSubmitWorkSubmit} className="space-y-4 font-semibold text-slate-700">
                    <div className="flex items-center justify-between bg-white p-2 border border-indigo-100 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Submission Mode</span>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => { setSubmissionAttachMode('link'); setSubmissionFile(null); }} 
                          className={`px-2 py-0.5 rounded text-[9px] font-black border transition-all ${submissionAttachMode === 'link' ? 'bg-indigo-650 border-indigo-650 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                          HTTPS Link
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setSubmissionAttachMode('file')} 
                          className={`px-2 py-0.5 rounded text-[9px] font-black border transition-all ${submissionAttachMode === 'file' ? 'bg-indigo-650 border-indigo-650 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                          Upload File
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div>
                        <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Deliverable Type</label>
                        <select 
                          value={submissionAttachType} 
                          onChange={e=>setSubmissionAttachType(e.target.value as any)} 
                          className="w-full px-3 py-2 border border-indigo-150 rounded-xl bg-white focus:outline-none"
                        >
                          <option value="link">Web Link</option>
                          <option value="pdf">PDF File</option>
                          <option value="document">Document / Code</option>
                          <option value="presentation">Presentation</option>
                          <option value="image">Image Asset</option>
                          <option value="video">Video Demo</option>
                          <option value="folder">Shared Drive Folder</option>
                          <option value="code_repo">GitHub Repo</option>
                        </select>
                      </div>
                    </div>

                    {submissionAttachMode === 'link' ? (
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-800 mb-1">Work Link / HTTPS URL *</label>
                        <input 
                          required
                          value={submissionUrl} 
                          onChange={e=>setSubmissionUrl(e.target.value)} 
                          type="url" 
                          placeholder="https://github.com/..." 
                          className="w-full px-3.5 py-2.5 border border-indigo-200 bg-white rounded-xl focus:outline-none focus:border-indigo-500 font-medium" 
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-800 mb-1">Select File deliverable *</label>
                        <input 
                          required
                          type="file" 
                          onChange={e => {
                            const file = e.target.files?.[0] || null;
                            if (file && isDangerousFile(file)) {
                              toast.error('Hazardous scripts blocked.');
                              e.target.value = '';
                              setSubmissionFile(null);
                              return;
                            }
                            setSubmissionFile(file);
                          }} 
                          className="w-full text-slate-500 font-bold file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-750 hover:file:bg-indigo-100"
                        />
                        {submissionFile && (
                          <span className="text-[9px] text-indigo-700 block mt-1">Size: {(submissionFile.size / 1024).toFixed(1)} KB</span>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-indigo-800 mb-1">Submission Explanatory Note *</label>
                      <textarea 
                        required 
                        value={submissionNote} 
                        onChange={e=>setSubmissionNote(e.target.value)} 
                        rows={3} 
                        className="w-full px-3.5 py-2.5 border border-indigo-200 bg-white rounded-xl focus:outline-none focus:border-indigo-500 font-medium" 
                        placeholder="Detail what tasks were solved, components built, and verification steps..." 
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Minimum 10 characters.</span>
                    </div>

                    <button 
                      disabled={loading} 
                      type="submit" 
                      className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1 text-xs"
                    >
                      {loading ? 'Uploading & Submitting...' : '🚀 Submit Deliverables for Review'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

              {/* Cancel task option for lead */}
              {project.is_owner && selectedTask.status !== 'verified' && selectedTask.status !== 'cancelled' && (
                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center">Admin Controls (Lead Only)</span>
                  <button 
                    onClick={() => handleCancelTask(selectedTask.id)}
                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-150 text-red-600 rounded-lg font-bold"
                  >
                    Cancel Task assignment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deadline Extension Modal */}
      {isExtensionModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md shadow-2xl p-6 relative overflow-hidden flex flex-col text-xs leading-relaxed animate-scale-up">
            <h3 className="text-base font-black text-slate-800 mb-3 border-b pb-2">⏰ Request Deadline Extension</h3>
            
            <form onSubmit={handleRequestExtensionSubmit} className="space-y-4 font-semibold text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-black">Current Task Deadline</p>
                <p className="text-slate-800 text-xs font-extrabold">{new Date(selectedTask.due_at).toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Requested New Due Date &amp; Time *</label>
                <input 
                  required
                  type="datetime-local" 
                  value={extRequestedDate} 
                  onChange={e=>setExtRequestedDate(e.target.value)} 
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-50 font-medium text-xs" 
                />
                <span className="text-[9px] text-slate-400 mt-0.5 block">Must be in the future and strictly later than the current due date.</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reason / Explanation *</label>
                <textarea 
                  required 
                  value={extReason} 
                  onChange={e=>setExtReason(e.target.value)} 
                  rows={3} 
                  placeholder="Detail the circumstances, blocker issues, or workload context that necessitates this extension..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-50 font-medium text-xs" 
                />
                <span className="text-[9px] text-slate-400 mt-0.5 block">Minimum 15 characters.</span>
              </div>

              <div className="flex gap-2.5 justify-end pt-3">
                <button 
                  type="button" 
                  onClick={() => setIsExtensionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-250 text-slate-650 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={loading}
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {loading ? 'Requesting...' : 'Request Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic secure task file preview lightbox */}
      {previewFileUrl && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded border border-indigo-150">
                  🔐 Secure Task Asset Preview
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1 line-clamp-1">{previewFileName}</h3>
              </div>
              <button 
                onClick={() => setPreviewFileUrl('')} 
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-350 flex items-center justify-center transition-colors font-bold text-sm shrink-0"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col justify-center items-center bg-slate-100/30">
              {loadingPreview ? (
                <div className="py-20 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-extrabold text-slate-500 text-xs">Authenticating task asset credentials...</span>
                </div>
              ) : (
                (() => {
                  if (previewFileType === 'pdf') {
                    return (
                      <iframe 
                        src={previewFileUrl} 
                        className="w-full h-[60vh] rounded-2xl border border-slate-200 shadow-sm bg-white" 
                        title="Secure Task PDF Preview" 
                      />
                    );
                  } else if (previewFileType === 'image') {
                    return (
                      <div className="max-h-[60vh] overflow-auto flex items-center justify-center">
                        <img 
                          src={previewFileUrl} 
                          className="max-w-full max-h-[55vh] object-contain rounded-2xl shadow border bg-slate-50" 
                          alt="Secure Task Preview" 
                        />
                      </div>
                    );
                  } else if (previewFileType === 'video') {
                    return (
                      <div className="max-h-[60vh] overflow-auto flex flex-col items-center justify-center bg-black/5 rounded-2xl p-4 w-full">
                        <video 
                          controls 
                          autoPlay={false}
                          src={previewFileUrl} 
                          className="max-w-full max-h-[48vh] rounded-xl shadow-md border border-slate-700 bg-black"
                          onError={() => {
                            toast.error('Preview link expired. Reopen preview to refresh.');
                          }}
                        >
                          Your browser does not support the video tag.
                        </video>
                        <div className="text-center mt-2.5 space-y-0.5 shrink-0">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">🎥 Secure Task Video Preview</p>
                          <p className="text-[9px] text-slate-400">Signed URL expires in 5 mins. If playback fails, please reopen the preview lightbox to refresh.</p>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl max-w-xl text-center space-y-4 shadow-sm text-xs">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-amber-250">
                          ⚠️
                        </div>
                        <h4 className="text-base font-black text-amber-800">Task Document Preview Blocked</h4>
                        <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                          In-browser rendering is limited for rich formatting files (.docx, .pptx, etc.) to enforce security boundaries. 
                          Please download the file directly to preview it securely on your device.
                        </p>
                      </div>
                    );
                  }
                })()
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
              <span>Secure Signed Expiry Link</span>
              <button 
                onClick={() => setPreviewFileUrl('')} 
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
