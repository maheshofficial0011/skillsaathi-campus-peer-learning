import React, { useState, useEffect } from 'react';
import { getHelpRequests, acceptHelpRequest, markHelpRequestSolved, closeHelpRequest } from '../lib/helpRequests';
import { HELP_CATEGORIES } from '../lib/helpCategories';
import { getCurrentProfile } from '../lib/profiles';
import { supabase } from '../lib/supabase';
import { HelpRequestCard } from '../components/help/HelpRequestCard';
import { HelpRequestForm } from '../components/help/HelpRequestForm';
import { FeedbackModal } from '../components/help/FeedbackModal';
import type { HelpRequestWithProfiles, Feedback, Profile } from '../types';

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
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'recommended' | 'my-requests' | 'accepted-by-me' | 'all'>('recommended');

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

      // 2. Fetch current user trust score & profile details
      if (userId) {
        const profile = await getCurrentProfile(userId);
        if (profile) {
          setCurrentUserProfile(profile);
          setTrustScore(profile.trust_score);
        }

        // 3. Fetch feedback status for requests
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

  // Segmented tab organization lists & counts
  const myRequests = userId ? requests.filter((r) => r.created_by === userId) : [];
  const myRequestsCount = myRequests.length;
  const myActiveRequestsCount = myRequests.filter((r) => r.status === 'open' || r.status === 'accepted').length;

  const acceptedByMe = userId ? requests.filter((r) => r.accepted_by === userId && (r.status === 'accepted' || r.status === 'solved')) : [];
  const acceptedByMeCount = acceptedByMe.length;
  const myActiveAcceptedCount = acceptedByMe.filter((r) => r.status === 'accepted').length;

  // Sorting logic for recommendations
  const urgencyWeight: Record<string, number> = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
  
  const sortRecommended = (a: any, b: any) => {
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    const aUrgent = urgencyWeight[a.urgency] || 0;
    const bUrgent = urgencyWeight[b.urgency] || 0;
    if (bUrgent !== aUrgent) {
      return bUrgent - aUrgent;
    }
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    } else if (a.deadline) {
      return -1;
    } else if (b.deadline) {
      return 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  const recommendedRequests = requests
    .filter((req) => req.status === 'open' && req.created_by !== userId)
    .map((req) => {
      if (!currentUserProfile) return { ...req, matchPercentage: 0, matchedSkills: [] as string[] };
      const skillsKnown = currentUserProfile.skills_known.map((s) => s.toLowerCase());
      const reqSkills = req.required_skills.map((s) => s.toLowerCase());
      
      const matched = req.required_skills.filter((s) => skillsKnown.includes(s.toLowerCase()));
      
      let pct = 0;
      if (reqSkills.length > 0) {
        pct = Math.round((matched.length / req.required_skills.length) * 100);
      } else {
        const catLower = req.category.toLowerCase();
        if (skillsKnown.includes(catLower)) {
          pct = 100;
          matched.push(req.category);
        } else {
          const titleMatches = currentUserProfile.skills_known.filter(s => req.title.toLowerCase().includes(s.toLowerCase()));
          if (titleMatches.length > 0) {
            pct = 50;
            matched.push(...titleMatches);
          }
        }
      }
      
      return {
        ...req,
        matchPercentage: pct,
        matchedSkills: matched,
      };
    })
    .filter((req) => req.matchPercentage > 0)
    .sort(sortRecommended);

  const recommendedCount = recommendedRequests.length;

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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recommended Matches</p>
          <p className="text-3xl font-extrabold text-indigo-650 text-indigo-650 text-indigo-600 mt-1">{recommendedCount}</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Active Requests</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{myActiveRequestsCount} <span className="text-xs text-slate-400 font-normal">/ {myRequestsCount} total</span></p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accepted / Solved by Me</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{myActiveAcceptedCount} <span className="text-xs text-slate-400 font-normal">active / {acceptedByMe.filter(r => r.status === 'solved').length} solved</span></p>
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
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-lg font-bold text-slate-900">Campus Peer Help Requests</h3>
            <button
              onClick={loadData}
              className="text-xs font-bold text-indigo-650 text-indigo-600 hover:text-indigo-750 hover:text-indigo-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md transition"
            >
              Refresh Board
            </button>
          </div>

          {/* Segmented Board Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {[
              { id: 'recommended', label: `Recommended (${recommendedCount})` },
              { id: 'my-requests', label: `My Requests (${myRequestsCount})` },
              { id: 'accepted-by-me', label: `Accepted by Me (${acceptedByMeCount})` },
              { id: 'all', label: `All Requests (${filteredRequests.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
              <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
              <p className="text-xs text-slate-400 font-medium">Refreshing Board...</p>
            </div>
          ) : (
            <>
              {activeTab === 'recommended' && (
                recommendedRequests.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-3">
                    <div className="text-2xl">🎯</div>
                    <h4 className="font-bold text-slate-700">No matching requests yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Update your profile skills with technologies you know to see smart matching recommendations, or browse all campus requests.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendedRequests.map((req) => (
                      <HelpRequestCard
                        key={req.id}
                        request={req}
                        currentUserId={userId || ''}
                        onAccept={handleAccept}
                        onMarkSolved={handleMarkSolved}
                        onGiveFeedback={setFeedbackRequest}
                        onClose={handleClose}
                        existingFeedback={feedbacks.find((f) => f.request_id === req.id)}
                        matchPercentage={req.matchPercentage}
                        matchedSkills={req.matchedSkills}
                      />
                    ))}
                  </div>
                )
              )}

              {activeTab === 'my-requests' && (
                myRequests.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-3">
                    <div className="text-2xl">📋</div>
                    <h4 className="font-bold text-slate-700">No requests posted yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      You haven't created any help requests yet. Need assistance with a concept or bug? Create one above!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myRequests.map((req) => (
                      <HelpRequestCard
                        key={req.id}
                        request={req}
                        currentUserId={userId || ''}
                        onAccept={handleAccept}
                        onMarkSolved={handleMarkSolved}
                        onGiveFeedback={setFeedbackRequest}
                        onClose={handleClose}
                        existingFeedback={feedbacks.find((f) => f.request_id === req.id)}
                      />
                    ))}
                  </div>
                )
              )}

              {activeTab === 'accepted-by-me' && (
                acceptedByMe.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-3">
                    <div className="text-2xl">🤝</div>
                    <h4 className="font-bold text-slate-700">No accepted requests yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      You haven't accepted any peer requests yet. Browse the campus board and click 'Accept Request' to start tutoring!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {acceptedByMe.map((req) => (
                      <HelpRequestCard
                        key={req.id}
                        request={req}
                        currentUserId={userId || ''}
                        onAccept={handleAccept}
                        onMarkSolved={handleMarkSolved}
                        onGiveFeedback={setFeedbackRequest}
                        onClose={handleClose}
                        existingFeedback={feedbacks.find((f) => f.request_id === req.id)}
                      />
                    ))}
                  </div>
                )
              )}

              {activeTab === 'all' && (
                filteredRequests.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-3">
                    <div className="text-2xl">🔍</div>
                    <h4 className="font-bold text-slate-700">No matching requests found</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Try clearing search terms, resetting filters, or browse other categories.
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
                        existingFeedback={feedbacks.find((f) => f.request_id === req.id)}
                      />
                    ))}
                  </div>
                )
              )}
            </>
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
          existingFeedback={feedbacks.find((f) => f.request_id === feedbackRequest.id)}
        />
      )}
    </div>
  );
};
