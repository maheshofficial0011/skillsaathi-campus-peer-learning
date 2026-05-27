import React, { useState, useEffect } from 'react';
import { getHelpRequests, acceptHelpRequest, markHelpRequestSolved, closeHelpRequest, deleteHelpRequest } from '../lib/helpRequests';
import { HELP_CATEGORIES } from '../lib/helpCategories';
import { getCurrentProfile } from '../lib/profiles';
import { supabase } from '../lib/supabase';
import { HelpRequestCard } from '../components/help/HelpRequestCard';
import { HelpRequestForm } from '../components/help/HelpRequestForm';
import { FeedbackModal } from '../components/help/FeedbackModal';
import { HelpRequestDetailsModal } from '../components/help/HelpRequestDetailsModal';
import type { HelpRequestWithProfiles, Feedback, Profile } from '../types';

interface DashboardPageProps {
  userId?: string;
  userEmail?: string;
}

type SortOption = 'newest' | 'urgency' | 'deadline' | 'status' | 'best-match';
type ActiveTab = 'recommended' | 'my-requests' | 'accepted-by-me' | 'all';

const URGENCY_WEIGHT: Record<string, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
const STATUS_WEIGHT: Record<string, number> = { open: 4, accepted: 3, solved: 2, closed: 1 };

const applySorting = (list: HelpRequestWithProfiles[], sort: SortOption): HelpRequestWithProfiles[] => {
  const sorted = [...list];
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'urgency':
      return sorted.sort((a, b) => (URGENCY_WEIGHT[b.urgency] || 0) - (URGENCY_WEIGHT[a.urgency] || 0));
    case 'deadline':
      return sorted.sort((a, b) => {
        if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return 0;
      });
    case 'status':
      return sorted.sort((a, b) => (STATUS_WEIGHT[b.status] || 0) - (STATUS_WEIGHT[a.status] || 0));
    case 'best-match':
      // For non-recommended tabs this is the same as newest; will be overridden for recommended
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    default:
      return sorted;
  }
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ userId, userEmail }) => {
  const [requests, setRequests] = useState<HelpRequestWithProfiles[]>([]);
  const [trustScore, setTrustScore] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal toggle states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedbackRequest, setFeedbackRequest] = useState<HelpRequestWithProfiles | null>(null);
  const [detailsRequest, setDetailsRequest] = useState<HelpRequestWithProfiles | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('recommended');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Sort state — per tab defaults
  const [sortOption, setSortOption] = useState<SortOption>('best-match');

  // When tab changes, update default sort
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'recommended') setSortOption('best-match');
    else if (tab === 'accepted-by-me') setSortOption('status');
    else setSortOption('newest');
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getHelpRequests();
      setRequests(data);

      if (userId) {
        const profile = await getCurrentProfile(userId);
        if (profile) {
          setCurrentUserProfile(profile);
          setTrustScore(profile.trust_score);
        }

        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback')
          .select('*')
          .eq('created_by', userId);

        if (!feedbackError && feedbackData) {
          setFeedbacks(feedbackData as Feedback[]);
        }
      }
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setErrorMsg('Failed to load live peer help requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Action handlers — return Promise<void> so cards can track loading
  const handleAccept = async (requestId: string): Promise<void> => {
    if (!userId) return;
    try {
      await acceptHelpRequest(requestId, userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept help request.');
    }
  };

  const handleMarkSolved = async (requestId: string): Promise<void> => {
    if (!userId) return;
    try {
      await markHelpRequestSolved(requestId, userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark request solved.');
    }
  };

  const handleClose = async (requestId: string): Promise<void> => {
    if (!userId) return;
    try {
      await closeHelpRequest(requestId, userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to close help request.');
    }
  };

  const handleDelete = async (requestId: string): Promise<void> => {
    if (!userId) return;
    try {
      await deleteHelpRequest(requestId);
      await loadData();
      // If the deleted request is currently shown in details modal, close it
      setDetailsRequest(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete help request. Ensure the Supabase delete policy patch has been applied.');
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

  // Segmented tab lists & counts
  const myRequests = userId ? requests.filter((r) => r.created_by === userId) : [];
  const myRequestsCount = myRequests.length;
  const myActiveRequestsCount = myRequests.filter((r) => r.status === 'open' || r.status === 'accepted').length;

  const acceptedByMe = userId
    ? requests.filter((r) => r.accepted_by === userId && (r.status === 'accepted' || r.status === 'solved'))
    : [];
  const acceptedByMeCount = acceptedByMe.length;
  const myActiveAcceptedCount = acceptedByMe.filter((r) => r.status === 'accepted').length;

  // Recommended list with match scoring
  const recommendedRequests = requests
    .filter((req) => req.status === 'open' && req.created_by !== userId)
    .map((req) => {
      if (!currentUserProfile) return { ...req, matchPercentage: 0, matchedSkills: [] as string[] };
      const skillsKnown = currentUserProfile.skills_known.map((s) => s.toLowerCase());
      const matched = req.required_skills.filter((s) => skillsKnown.includes(s.toLowerCase()));
      let pct = 0;
      if (req.required_skills.length > 0) {
        pct = Math.round((matched.length / req.required_skills.length) * 100);
      } else {
        const catLower = req.category.toLowerCase();
        if (skillsKnown.includes(catLower)) {
          pct = 100;
          matched.push(req.category);
        } else {
          const titleMatches = currentUserProfile.skills_known.filter((s) =>
            req.title.toLowerCase().includes(s.toLowerCase())
          );
          if (titleMatches.length > 0) {
            pct = 50;
            matched.push(...titleMatches);
          }
        }
      }
      return { ...req, matchPercentage: pct, matchedSkills: matched };
    })
    .filter((req) => req.matchPercentage > 0);

  // Sort recommended by best-match first, then apply sortOption override
  const sortedRecommended =
    sortOption === 'best-match'
      ? [...recommendedRequests].sort((a, b) => {
          if (b.matchPercentage !== a.matchPercentage) return b.matchPercentage - a.matchPercentage;
          const aU = URGENCY_WEIGHT[a.urgency] || 0;
          const bU = URGENCY_WEIGHT[b.urgency] || 0;
          if (bU !== aU) return bU - aU;
          if (a.deadline && b.deadline)
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          if (a.deadline) return -1;
          if (b.deadline) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
      : applySorting(recommendedRequests, sortOption);

  const sortedMyRequests = applySorting(myRequests, sortOption);
  const sortedAcceptedByMe = applySorting(acceptedByMe, sortOption);
  const sortedFilteredRequests = applySorting(filteredRequests, sortOption);

  const recommendedCount = recommendedRequests.length;

  const SORT_LABELS: Record<SortOption, string> = {
    newest: 'Newest',
    urgency: 'Urgency',
    deadline: 'Deadline',
    status: 'Status',
    'best-match': 'Best Match',
  };

  // Common card renderer to DRY up the JSX
  const renderCard = (req: HelpRequestWithProfiles & { matchPercentage?: number; matchedSkills?: string[] }) => (
    <HelpRequestCard
      key={req.id}
      request={req}
      currentUserId={userId || ''}
      onAccept={handleAccept}
      onMarkSolved={handleMarkSolved}
      onGiveFeedback={setFeedbackRequest}
      onClose={handleClose}
      onDelete={handleDelete}
      onViewDetails={setDetailsRequest}
      existingFeedback={feedbacks.find((f) => f.request_id === req.id)}
      matchPercentage={req.matchPercentage}
      matchedSkills={req.matchedSkills}
    />
  );

  return (
    <div className="space-y-8 px-4 py-6 max-w-7xl mx-auto">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Student Dashboard</h2>
          <p className="text-sm text-slate-500">
            Welcome back{userEmail ? `, ${userEmail}` : ''}! Find active learning groups and help your peers on campus.
          </p>
        </div>
        {userId && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="self-start md:self-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm transition flex items-center gap-2"
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recommended Matches</p>
          <p className="text-3xl font-extrabold text-indigo-600 mt-1">{recommendedCount}</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Active Requests</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">
            {myActiveRequestsCount}{' '}
            <span className="text-xs text-slate-400 font-normal">/ {myRequestsCount} total</span>
          </p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accepted / Solved by Me</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">
            {myActiveAcceptedCount}{' '}
            <span className="text-xs text-slate-400 font-normal">
              active / {acceptedByMe.filter((r) => r.status === 'solved').length} solved
            </span>
          </p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Trust Score</p>
          <p className="text-3xl font-extrabold text-indigo-600 mt-1">{trustScore}%</p>
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
        <div className="lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <h3 className="text-lg font-bold text-slate-900">Campus Peer Help Requests</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort Dropdown */}
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                  <option key={opt} value={opt}>
                    Sort: {SORT_LABELS[opt]}
                  </option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-md transition disabled:opacity-60 flex items-center gap-1"
              >
                {refreshing ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin inline-block" />
                    Refreshing...
                  </>
                ) : (
                  '↻ Refresh'
                )}
              </button>
            </div>
          </div>

          {/* Segmented Board Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {([
              { id: 'recommended' as ActiveTab, label: `Recommended (${recommendedCount})` },
              { id: 'my-requests' as ActiveTab, label: `My Requests (${myRequestsCount})` },
              { id: 'accepted-by-me' as ActiveTab, label: `Accepted by Me (${acceptedByMeCount})` },
              { id: 'all' as ActiveTab, label: `All Requests (${filteredRequests.length})` },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all duration-150 shadow-sm ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Refreshing Board...</p>
            </div>
          ) : (
            <>
              {activeTab === 'recommended' && (
                sortedRecommended.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-3">
                    <div className="text-3xl">🎯</div>
                    <h4 className="font-bold text-slate-700">No matching requests yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      No matching requests yet. Update your profile skills or browse all campus requests.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedRecommended.map((req) => renderCard(req))}
                  </div>
                )
              )}

              {activeTab === 'my-requests' && (
                sortedMyRequests.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-3">
                    <div className="text-3xl">📋</div>
                    <h4 className="font-bold text-slate-700">No help requests posted yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      You have not posted any help request yet. Create your first request.
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      + Create Help Request
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedMyRequests.map((req) => renderCard(req))}
                  </div>
                )
              )}

              {activeTab === 'accepted-by-me' && (
                sortedAcceptedByMe.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-3">
                    <div className="text-3xl">🤝</div>
                    <h4 className="font-bold text-slate-700">No accepted requests yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      You have not accepted any request yet. Browse all requests to help a peer.
                    </p>
                    <button
                      onClick={() => handleTabChange('all')}
                      className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Browse All Requests
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedAcceptedByMe.map((req) => renderCard(req))}
                  </div>
                )
              )}

              {activeTab === 'all' && (
                sortedFilteredRequests.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-3">
                    <div className="text-3xl">🔍</div>
                    <h4 className="font-bold text-slate-700">No campus help requests found</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Try clearing search terms, resetting filters, or browse other categories.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedFilteredRequests.map((req) => renderCard(req))}
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* Side Panel: Study Circles (Phase 3 placeholder) */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Study Circles &amp; Cohorts</h3>
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 shadow-sm">
            <div className="pb-3 border-b border-slate-200">
              <h4 className="font-semibold text-slate-800">🚀 React &amp; Frontend Developers</h4>
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
          existingFeedback={feedbacks.find((f) => f.request_id === feedbackRequest.id)}
        />
      )}

      {detailsRequest && (
        <HelpRequestDetailsModal
          request={detailsRequest}
          currentUserId={userId || ''}
          existingFeedback={feedbacks.find((f) => f.request_id === detailsRequest.id)}
          onClose={() => setDetailsRequest(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};
