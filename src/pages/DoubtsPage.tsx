import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { DoubtPostWithProfile, Profile } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getCurrentProfile } from '../lib/profiles';
import {
  getDoubts,
  getDoubtIdsAnsweredByUser,
  closeDoubt,
  reopenDoubt,
  deleteDoubt,
  DOUBT_CATEGORIES,
} from '../lib/doubts';
import { CreateDoubtModal } from '../components/doubts/CreateDoubtModal';
import { DoubtDetailsModal } from '../components/doubts/DoubtDetailsModal';
import { DoubtCard } from '../components/doubts/DoubtCard';
import { PublicProfileModal } from '../components/profile/PublicProfileModal';
import { useToast } from '../hooks/useToast';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';

// ──────────────────────────────────────────
// TABS
// ──────────────────────────────────────────
type TabKey = 'recommended' | 'my-doubts' | 'answered-by-me' | 'all';

const TAB_KEYS: TabKey[] = ['recommended', 'my-doubts', 'answered-by-me', 'all'];
const TAB_EMOJI: Record<TabKey, string> = {
  'recommended': '🎯',
  'my-doubts': '📝',
  'answered-by-me': '💡',
  'all': '🌐',
};
const TAB_LABEL: Record<TabKey, string> = {
  'recommended': 'Recommended',
  'my-doubts': 'My Doubts',
  'answered-by-me': 'Answered by Me',
  'all': 'All Doubts',
};

// ──────────────────────────────────────────
// MATCH SCORE for Recommended tab
// ──────────────────────────────────────────
const calcMatchScore = (doubt: DoubtPostWithProfile, skills: string[]): number => {
  if (!skills || skills.length === 0) return 0;
  const lowerSkills = skills.map((s) => s.toLowerCase());
  let hits = 0;
  let total = 0;

  // Category match
  total++;
  if (lowerSkills.some((s) => doubt.category.toLowerCase().includes(s) || s.includes(doubt.category.toLowerCase()))) hits++;

  // Tag matches
  (doubt.tags || []).forEach((tag) => {
    total++;
    if (lowerSkills.some((s) => tag.toLowerCase().includes(s) || s.includes(tag.toLowerCase()))) hits++;
  });

  // Title keyword matches
  doubt.title.split(/\s+/).forEach((word) => {
    if (word.length < 4) return;
    total++;
    if (lowerSkills.some((s) => s.includes(word.toLowerCase()) || word.toLowerCase().includes(s))) hits++;
  });

  return total === 0 ? 0 : Math.round((hits / total) * 100);
};

// ──────────────────────────────────────────
// DOUBTS PAGE
// ──────────────────────────────────────────
const DoubtsPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [doubts, setDoubts] = useState<DoubtPostWithProfile[]>([]);
  const [myAnsweredIds, setMyAnsweredIds] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDoubt, setSelectedDoubt] = useState<DoubtPostWithProfile | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('recommended');
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);

  // All Doubts tab filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const currentUserId = user?.id ?? '';

  // ── Load all data in parallel ──
  const loadData = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError('');
    try {
      const [allDoubts, answeredIds, profile] = await Promise.all([
        getDoubts(),
        getDoubtIdsAnsweredByUser(currentUserId),
        getCurrentProfile(currentUserId),
      ]);
      setDoubts(allDoubts);
      setMyAnsweredIds(answeredIds);
      setUserProfile(profile);
    } catch {
      setError('Failed to load doubts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived lists per tab ──
  const recommendedDoubts = useMemo(() => {
    const skills = userProfile?.skills_known ?? [];
    return doubts
      .filter((d) => d.created_by !== currentUserId && (d.status === 'open' || d.status === 'answered'))
      .map((d) => ({ doubt: d, score: calcMatchScore(d, skills) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const order: Record<string, number> = { answered: 0, open: 1 };
        return (order[a.doubt.status] ?? 2) - (order[b.doubt.status] ?? 2);
      });
  }, [doubts, currentUserId, userProfile]);

  const myDoubts = useMemo(
    () => doubts.filter((d) => d.created_by === currentUserId),
    [doubts, currentUserId]
  );

  const answeredByMeDoubts = useMemo(
    () => doubts.filter((d) => myAnsweredIds.has(d.id)),
    [doubts, myAnsweredIds]
  );

  const allFilteredDoubts = useMemo(() => {
    return doubts.filter((d) => {
      const q = searchQuery.toLowerCase();
      if (
        q &&
        !d.title.toLowerCase().includes(q) &&
        !d.description.toLowerCase().includes(q) &&
        !d.category.toLowerCase().includes(q)
      ) return false;
      if (filterCategory !== 'All' && d.category !== filterCategory) return false;
      if (filterStatus !== 'All' && d.status !== filterStatus) return false;
      return true;
    });
  }, [doubts, searchQuery, filterCategory, filterStatus]);

  // ── Status counters ──
  const stats = useMemo(() => ({
    recommended: recommendedDoubts.length,
    myDoubts: myDoubts.length,
    answeredByMe: answeredByMeDoubts.length,
    open: doubts.filter((d) => d.status === 'open').length,
    answered: doubts.filter((d) => d.status === 'answered').length,
    solved: doubts.filter((d) => d.status === 'solved').length,
  }), [doubts, recommendedDoubts, myDoubts, answeredByMeDoubts]);

  const tabCount: Record<TabKey, number> = {
    recommended: stats.recommended,
    'my-doubts': stats.myDoubts,
    'answered-by-me': stats.answeredByMe,
    all: doubts.length,
  };

  // ── Handlers ──
  const handleDoubtCreated = (newDoubt: DoubtPostWithProfile) => {
    setDoubts((prev) => [newDoubt, ...prev]);
    setActiveTab('my-doubts');
    toast.success('Doubt Posted Successfully', 'Your doubt is now live on the board!');
  };

  const handleDoubtUpdated = useCallback((updated: DoubtPostWithProfile) => {
    setDoubts((prev) => prev.map((d) => d.id === updated.id ? { ...d, ...updated } : d));
    setSelectedDoubt((prev) => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
  }, []);

  const handleCloseDoubt = async (doubtId: string) => {
    try {
      await closeDoubt(doubtId);
      const existing = doubts.find((d) => d.id === doubtId);
      if (existing) handleDoubtUpdated({ ...existing, status: 'closed' });
      toast.success('Doubt Closed', 'Your doubt has been closed.');
    } catch (err: any) {
      toast.error('Close Failed', err.message || 'Could not close doubt.');
    }
  };

  const handleReopenDoubt = async (doubtId: string) => {
    try {
      const existing = doubts.find((d) => d.id === doubtId);
      if (!existing) return;
      // Determine new status from answer_count on the existing card
      const nextStatus: 'open' | 'answered' = (existing.answer_count ?? 0) > 0 ? 'answered' : 'open';
      await reopenDoubt(doubtId, nextStatus);
      // Optimistically update local state then do a full board refresh
      handleDoubtUpdated({ ...existing, status: nextStatus });
      await loadData();
      toast.success('Doubt Reopened', 'Students can now answer your doubt again.');
    } catch (err: any) {
      toast.error('Reopen Failed', err.message || 'Could not reopen doubt.');
    }
  };

  const handleDeleteDoubt = async (doubtId: string) => {
    try {
      await deleteDoubt(doubtId);
      // Remove from local state immediately
      setDoubts((prev) => prev.filter((d) => d.id !== doubtId));
      if (selectedDoubt?.id === doubtId) setSelectedDoubt(null);
      // Full board refresh to ensure consistency
      await loadData();
      toast.success('Doubt Deleted', 'Your doubt has been deleted.');
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete doubt.');
    }
  };

  const handleViewProfile = (userId: string) => setViewProfileUserId(userId);

  const handleViewDoubt = (doubt: DoubtPostWithProfile) => setSelectedDoubt(doubt);

  // ── Loading / Error states ──
  if (loading) {
    return <LoadingState label="Loading doubts board..." minHeight="min-h-[50vh]" />;
  }

  if (error) {
    return <ErrorState title="Failed to Load Doubts" message={error} onRetry={loadData} minHeight="min-h-[40vh]" />;
  }

  // ──────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Doubts Board</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ask doubts, answer peers, and learn together — anonymously if you prefer.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
        >
          + Ask a Doubt
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Recommended', val: stats.recommended, color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'My Doubts',   val: stats.myDoubts,    color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
          { label: 'Answered Me', val: stats.answeredByMe,color: 'text-sky-700 bg-sky-50 border-sky-200' },
          { label: 'Open',        val: stats.open,         color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'Answered',    val: stats.answered,     color: 'text-sky-700 bg-sky-50 border-sky-200' },
          { label: 'Solved',      val: stats.solved,       color: 'text-purple-700 bg-purple-50 border-purple-200' },
        ].map(({ label, val, color }) => (
          <div key={label} className={`border rounded-xl px-3 py-2 text-center ${color}`}>
            <p className="text-lg font-extrabold leading-none">{val}</p>
            <p className="text-[10px] font-semibold mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 min-w-fit px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all duration-150 ${
              activeTab === key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {TAB_EMOJI[key]} {TAB_LABEL[key]}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {tabCount[key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab: Recommended ── */}
      {activeTab === 'recommended' && (
        <TabSection
          title="Recommended for You"
          subtitle={
            userProfile?.skills_known?.length
              ? `Based on your skills: ${userProfile.skills_known.slice(0, 3).join(', ')}${userProfile.skills_known.length > 3 ? '...' : ''}`
              : 'Update your profile with skills to get better recommendations.'
          }
          emptyMessage="No recommended doubts right now. Check All Doubts or update your profile skills!"
          emptyAction={undefined}
          icon="🎯"
        >
          {recommendedDoubts.map(({ doubt, score }) => (
            <DoubtCard
              key={doubt.id}
              doubt={doubt}
              currentUserId={currentUserId}
              matchScore={score}
              onView={handleViewDoubt}
              onClose={handleCloseDoubt}
              onReopen={handleReopenDoubt}
              onDelete={handleDeleteDoubt}
              onViewProfile={handleViewProfile}
            />
          ))}
        </TabSection>
      )}

      {/* ── Tab: My Doubts ── */}
      {activeTab === 'my-doubts' && (
        <TabSection
          title="My Doubts"
          subtitle="Doubts you have posted. Accept answers and close doubts here."
          emptyMessage="You have not posted any doubts yet."
          emptyAction={{ label: '+ Ask a Doubt', onClick: () => setShowCreateModal(true) }}
          icon="📝"
        >
          {myDoubts.map((doubt) => (
            <DoubtCard
              key={doubt.id}
              doubt={doubt}
              currentUserId={currentUserId}
              onView={handleViewDoubt}
              onClose={handleCloseDoubt}
              onReopen={handleReopenDoubt}
              onDelete={handleDeleteDoubt}
              onViewProfile={handleViewProfile}
            />
          ))}
        </TabSection>
      )}

      {/* ── Tab: Answered by Me ── */}
      {activeTab === 'answered-by-me' && (
        <TabSection
          title="Answered by Me"
          subtitle="Doubts you have contributed an answer to."
          emptyMessage="You have not answered any doubts yet. Go to Recommended or All Doubts to help peers!"
          emptyAction={undefined}
          icon="💡"
        >
          {answeredByMeDoubts.map((doubt) => (
            <DoubtCard
              key={doubt.id}
              doubt={doubt}
              currentUserId={currentUserId}
              onView={handleViewDoubt}
              onClose={handleCloseDoubt}
              onReopen={handleReopenDoubt}
              onDelete={handleDeleteDoubt}
              onViewProfile={handleViewProfile}
            />
          ))}
        </TabSection>
      )}

      {/* ── Tab: All Doubts ── */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filter Doubts Board</h3>
              {(searchQuery || filterCategory !== 'All' || filterStatus !== 'All') && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterCategory('All'); setFilterStatus('All'); }}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded border border-slate-300 transition"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doubts (title, description)..."
                className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              >
                <option value="All">All Categories</option>
                {DOUBT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              >
                <option value="All">All Statuses</option>
                <option value="open">Open</option>
                <option value="answered">Answered</option>
                <option value="solved">Solved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Showing {allFilteredDoubts.length} of {doubts.length} doubts
          </p>

          {allFilteredDoubts.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No doubts match your filters"
              message="Try clearing your search terms or resetting the category and status filters."
              actionLabel="Clear Filters"
              onAction={() => { setSearchQuery(''); setFilterCategory('All'); setFilterStatus('All'); }}
            />
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pr-1 ${allFilteredDoubts.length > 4 ? 'max-h-[500px] overflow-y-auto thin-scrollbar' : ''}`}>
              {allFilteredDoubts.map((doubt) => (
                <DoubtCard
                  key={doubt.id}
                  doubt={doubt}
                  currentUserId={currentUserId}
                  onView={handleViewDoubt}
                  onClose={handleCloseDoubt}
                  onReopen={handleReopenDoubt}
                  onDelete={handleDeleteDoubt}
                  onViewProfile={handleViewProfile}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showCreateModal && (
        <CreateDoubtModal
          currentUserId={currentUserId}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleDoubtCreated}
        />
      )}

      {selectedDoubt && (
        <DoubtDetailsModal
          doubt={selectedDoubt}
          currentUserId={currentUserId}
          onClose={() => setSelectedDoubt(null)}
          onDoubtUpdated={handleDoubtUpdated}
          onDoubtDeleted={handleDeleteDoubt}
        />
      )}

      {/* Public Profile Modal from board */}
      {viewProfileUserId && (
        <PublicProfileModal
          userId={viewProfileUserId}
          onClose={() => setViewProfileUserId(null)}
        />
      )}
    </div>
  );
};

// ──────────────────────────────────────────
// TAB SECTION WRAPPER
// ──────────────────────────────────────────
interface TabSectionProps {
  title: string;
  subtitle: string;
  emptyMessage: string;
  emptyAction?: { label: string; onClick: () => void };
  children: React.ReactNode;
  icon?: string;
}

const TabSection: React.FC<TabSectionProps> = ({
  title,
  subtitle,
  emptyMessage,
  emptyAction,
  children,
  icon = '💬',
}) => {
  const childArray = React.Children.toArray(children).filter(Boolean);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {childArray.length === 0 ? (
        <EmptyState
          icon={icon}
          title={title}
          message={emptyMessage}
          actionLabel={emptyAction?.label}
          onAction={emptyAction?.onClick}
        />
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pr-1 ${childArray.length > 4 ? 'max-h-[420px] overflow-y-auto thin-scrollbar' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default DoubtsPage;
