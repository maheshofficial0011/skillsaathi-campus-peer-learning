import React, { useState } from 'react';
import type { ProjectTask, ProjectWithStats, ProjectTeamMember } from '../../types';
import {
  createProjectTask,
  markTaskInProgress,
  submitProjectTask,
  verifyTaskSubmission,
  rejectTaskSubmission
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
  const [activeSubView, setActiveSubView] = useState<'board' | 'assign' | 'review' | 'extensions'>('board');
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);

  // Stats
  const myTasks = tasks.filter(t => t.assigned_to === currentUser.id);
  const pendingReview = tasks.filter(t => t.status === 'submitted');
  const overdue = tasks.filter(t => t.status !== 'verified' && t.status !== 'cancelled' && new Date(t.due_at) < new Date());
  
  // Assign Form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskObjective, setNewTaskObjective] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low'|'medium'|'high'|'urgent'>('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueAt, setNewTaskDueAt] = useState('');

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createProjectTask({
        project_id: project.id,
        assigned_to: newTaskAssignee,
        title: newTaskTitle,
        objective: newTaskObjective,
        priority: newTaskPriority,
        due_at: new Date(newTaskDueAt).toISOString(),
        status: 'assigned'
      });
      toast.success('Task assigned successfully!');
      setNewTaskTitle('');
      setNewTaskObjective('');
      setNewTaskAssignee('');
      setNewTaskDueAt('');
      setActiveSubView('board');
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error assigning task');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInProgress = async (taskId: string) => {
    try {
      await markTaskInProgress(taskId);
      toast.success('Task marked as in-progress!');
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error updating task');
    }
  };

  // Submission Form
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setLoading(true);
    try {
      const files = submissionUrl ? [{ file_type: 'link', url: submissionUrl, title: 'Work Link' }] : [];
      await submitProjectTask({
        task_id: selectedTask.id,
        project_id: project.id,
        submission_note: submissionNote,
        files
      });
      toast.success('Work submitted successfully!');
      setSelectedTask(null);
      setSubmissionNote('');
      setSubmissionUrl('');
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error submitting work');
    } finally {
      setLoading(false);
    }
  };

  // Review Actions
  const handleVerify = async (submissionId: string, taskId: string) => {
    try {
      await verifyTaskSubmission(submissionId, taskId, 'Good job!');
      toast.success('Submission verified!');
      setSelectedTask(null);
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error verifying');
    }
  };

  const handleReject = async (submissionId: string, taskId: string) => {
    try {
      const reason = prompt('Reason for rejection?');
      if (!reason) return;
      await rejectTaskSubmission(submissionId, taskId, reason);
      toast.success('Submission rejected with feedback.');
      setSelectedTask(null);
      refreshTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error rejecting');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'assigned': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'submitted': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'verified': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      case 'overdue': return 'bg-rose-50 text-rose-800 border-rose-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const TaskCard = ({ task }: { task: ProjectTask }) => (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-extrabold text-sm text-slate-800 line-clamp-1">{task.title}</h4>
        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-black border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>
      <p className="text-xs text-slate-500 line-clamp-2">{task.objective}</p>
      
      <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500">
        <span className="flex items-center gap-1">
          👤 {task.assignee_profile?.full_name}
        </span>
        <span className="flex items-center gap-1">
          📅 Due: {new Date(task.due_at).toLocaleDateString()}
        </span>
        <span className={`px-1.5 py-0.5 rounded border ${getStatusColor(task.status)}`}>
          {task.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div className="pt-2 border-t border-slate-100 flex gap-2">
        <button 
          onClick={() => setSelectedTask(task)}
          className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
        >
          View Details
        </button>
        {task.assigned_to === currentUser.id && task.status === 'assigned' && (
          <button 
            onClick={() => handleMarkInProgress(task.id)}
            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
          >
            Mark In Progress
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <p className="text-2xl font-black text-slate-800">{tasks.length}</p>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tasks</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <p className="text-2xl font-black text-indigo-600">{myTasks.length}</p>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Tasks</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <p className="text-2xl font-black text-purple-600">{pendingReview.length}</p>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Review</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <p className="text-2xl font-black text-rose-600">{overdue.length}</p>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue</p>
        </div>
      </div>

      {/* Console Navigation */}
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl shadow-sm gap-2 overflow-x-auto thin-scrollbar">
        <button
          onClick={() => setActiveSubView('board')}
          className={`px-4 py-2 text-xs font-black rounded-xl border transition-all whitespace-nowrap ${
            activeSubView === 'board' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          📋 Task Board
        </button>
        {project.is_owner && (
          <>
            <button
              onClick={() => setActiveSubView('assign')}
              className={`px-4 py-2 text-xs font-black rounded-xl border transition-all whitespace-nowrap ${
                activeSubView === 'assign' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              ➕ Assign New Task
            </button>
            <button
              onClick={() => setActiveSubView('review')}
              className={`px-4 py-2 text-xs font-black rounded-xl border transition-all whitespace-nowrap ${
                activeSubView === 'review' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              👀 Review Queue ({pendingReview.length})
            </button>
          </>
        )}
      </div>

      {/* Views */}
      {activeSubView === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h3 className="font-black text-sm text-slate-800 border-b border-slate-200 pb-2">To Do / In Progress</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto thin-scrollbar pr-1">
              {tasks.filter(t => ['assigned', 'in_progress', 'rejected'].includes(t.status)).map(t => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-black text-sm text-slate-800 border-b border-slate-200 pb-2">Submitted</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto thin-scrollbar pr-1">
              {tasks.filter(t => t.status === 'submitted').map(t => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-black text-sm text-emerald-800 border-b border-emerald-200 pb-2">Verified</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto thin-scrollbar pr-1">
              {tasks.filter(t => t.status === 'verified').map(t => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubView === 'assign' && project.is_owner && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-2xl">
          <h3 className="text-lg font-black text-slate-800 mb-6">Assign a New Task</h3>
          <form onSubmit={handleAssignTask} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Task Title</label>
              <input required value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} type="text" className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Objective / Instructions</label>
              <textarea required value={newTaskObjective} onChange={e=>setNewTaskObjective(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Assign To</label>
                <select required value={newTaskAssignee} onChange={e=>setNewTaskAssignee(e.target.value)} className="w-full px-3 py-2 border rounded-xl">
                  <option value="">Select teammate...</option>
                  {teamMembers.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.profile?.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
                <select required value={newTaskPriority} onChange={e=>setNewTaskPriority(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Due Date</label>
              <input required value={newTaskDueAt} onChange={e=>setNewTaskDueAt(e.target.value)} type="datetime-local" className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div className="pt-4 flex justify-end">
              <button disabled={loading} type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors">
                {loading ? 'Assigning...' : 'Assign Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task Details Drawer/Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-black border ${getStatusColor(selectedTask.status)}`}>
                  {selectedTask.status.replace('_', ' ')}
                </span>
                <h3 className="text-xl font-black text-slate-800 mt-2">{selectedTask.title}</h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-1 mb-2">Instructions</h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTask.objective}</p>
              </div>

              {selectedTask.assigned_to === currentUser.id && ['assigned', 'in_progress', 'rejected'].includes(selectedTask.status) && (
                <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-5">
                  <h4 className="text-sm font-black text-indigo-800 mb-4">Submit Your Work</h4>
                  <form onSubmit={handleSubmitWork} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-indigo-700 mb-1">Work Link / URL (Optional)</label>
                      <input value={submissionUrl} onChange={e=>setSubmissionUrl(e.target.value)} type="url" placeholder="https://github.com/..." className="w-full px-3 py-2 border border-indigo-200 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-indigo-700 mb-1">Submission Notes</label>
                      <textarea required value={submissionNote} onChange={e=>setSubmissionNote(e.target.value)} rows={3} className="w-full px-3 py-2 border border-indigo-200 rounded-xl" placeholder="Describe what you completed..." />
                    </div>
                    <button disabled={loading} type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
                      {loading ? 'Submitting...' : 'Submit Work for Review'}
                    </button>
                  </form>
                </div>
              )}

              {selectedTask.status === 'submitted' && project.is_owner && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
                  <h4 className="text-sm font-black text-amber-800">Review Required</h4>
                  <p className="text-xs text-amber-700">The assigned member has submitted work for this task. Please review it using the queues tab or quickly verify below.</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleVerify('MOCK', selectedTask.id)} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs">Verify & Approve</button>
                    <button onClick={() => handleReject('MOCK', selectedTask.id)} className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 font-bold rounded-xl text-xs">Request Changes</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
