import React, { useState, useEffect } from 'react';
import { getHelpRequests, acceptHelpRequest, markHelpRequestSolved, closeHelpRequest } from '../lib/helpRequests';
import { HELP_CATEGORIES } from '../lib/helpCategories';
import { getCurrentProfile } from '../lib/profiles';
import { HelpRequestCard } from '../components/help/HelpRequestCard';
import { HelpRequestForm } from '../components/help/HelpRequestForm';
import { FeedbackModal } from '../components/help/FeedbackModal';
import type { HelpRequestWithProfiles } from '../types';

interface DashboardPageProps {
  userId?: string;
  userEmail?: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ userId, userEmail }) => {
  const [requests, setRequests] = useState<HelpRequestWithProfiles[]>([]);
  const [trustScore, setTrustScore] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal toggle states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedbackRequest, setFeedbackRequest] = useState<HelpRequestWithProfiles | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch live requests
      const data = await getHelpRequests();
      setRequests(data);

      // 2. Fetch current user trust score
      if (userId) {
        const profile = await getCurrentProfile(userId);
        if (profile) {
          setTrustScore(profile.trust_score);
        }
      }
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setErrorMsg('Failed to load live peer help requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Action handlers
  const handleAccept = async (requestId: string) => {
    if (!userId) return;
    try {
      await acceptHelpRequest(requestId, userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept help request.');
    }
  };

  const handleMarkSolved = async (requestId: string) => {
    if (!userId) return;
    try {
      await markHelpRequestSolved(requestId, userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark request solved.');
    }
  };

  const handleClose = async (requestId: string) => {
    if (!userId) return;
    try {
      await closeHelpRequest(requestId, userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to close help request.');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setUrgencyFilter('All');
    setStatusFilter('All');
  };

  // Filter computations
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = categoryFilter === 'All' || req.category === categoryFilter;
    const matchesUrgency = urgencyFilter === 'All' || req.urgency === urgencyFilter;
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter;

    return matchesSearch && matchesCategory && matchesUrgency && matchesStatus;
  });

  // Numeric Stats counts
  const totalOpenCount = requests.filter((r) => r.status === 'open').length;
  const myCreatedCount = userId ? requests.filter((r) => r.created_by === userId).length : 0;
  const myAcceptedCount = userId ? requests.filter((r) => r.accepted_by === userId).length : 0;
  const solvedCount = requests.filter((r) => r.status === 'solved').length;

  return (
    <div className="space-y-8 px-4 py-6 max-w-7xl mx-auto">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Student Dashboard</h2>
          <p className="text-sm text-slate-500">Welcome back{userEmail ? `, ${userEmail}` : ''}! Find active learning groups and help your peers on campus.</p>
        </div>
        {userId && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="self-start md:self-auto px-4 py-2.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-750 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm transition flex items-center gap-2"
          >
            + Create Help Request
          </button>
        )}
      </div>

      {/* Alert Error Box */}
      {errorMsg && (
        <div className="p-4 text-sm text-red-800 bg-red-50 rounded-lg border border-red-200" role="alert">
          {errorMsg}
        </div>
      )}

      {/* Stats Counter Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Campus Open Requests</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{totalOpenCount}</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Solved / Accepted</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{solvedCount} solved / {myAcceptedCount} accepted</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Trust Score</p>
          <p className="text-3xl font-extrabold text-indigo-600 mt-1">{trustScore}%</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Total Created</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{myCreatedCount}</p>
        </div>
      </div>

      {/* Explore Filters Container */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Filter Peer Help Board</h3>
          <button
            onClick={handleResetFilters}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded border border-slate-300 transition"
          >
            Reset Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search bar */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problems (e.g. tree, layout)..."
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Categories</option>
            {HELP_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Urgency Levels</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Statuses</option>
            <option value="open">Open</option>
            <option value="accepted">Accepted</option>
            <option value="solved">Solved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Grid Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Help Requests Explorer List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Campus Peer Help Requests ({filteredRequests.length})</h3>
            <button
              onClick={loadData}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Refresh Board
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
              <p className="text-xs text-slate-400 font-medium">Refreshing Board...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-3">
              <div className="text-2xl">📋</div>
              <h4 className="font-bold text-slate-700">No matching requests found</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Try clearing search terms or create a new help request.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map((req) => (
                <HelpRequestCard
                  key={req.id}
                  request={req}
                  currentUserId={userId || ''}
                  onAccept={handleAccept}
                  onMarkSolved={handleMarkSolved}
                  onGiveFeedback={setFeedbackRequest}
                  onClose={handleClose}
                />
              ))}
            </div>
          )}
        </div>

        {/* Side Panel: Study Circles (Phase 3 placeholder) */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Study Circles & Cohorts</h3>
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 shadow-sm">
            <div className="pb-3 border-b border-slate-200">
              <h4 className="font-semibold text-slate-800">🚀 React & Frontend Developers</h4>
              <p className="text-xs text-slate-500 mt-0.5">14 active peers • Meetups every Thursday</p>
            </div>
            <div className="pb-3 border-b border-slate-200">
              <h4 className="font-semibold text-slate-800">📊 Machine Learning Study Circle</h4>
              <p className="text-xs text-slate-500 mt-0.5">8 active peers • Studying linear regression</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">📝 DSA Crackers Group</h4>
              <p className="text-xs text-slate-500 mt-0.5">25 active peers • Daily practice questions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Forms */}
      {showCreateModal && userId && (
        <HelpRequestForm
          currentUserId={userId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
        />
      )}

      {feedbackRequest && userId && (
        <FeedbackModal
          request={feedbackRequest}
          currentUserId={userId}
          onClose={() => setFeedbackRequest(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
