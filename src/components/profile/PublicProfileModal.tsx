import React, { useState, useEffect } from 'react';
import { getPublicProfileStats } from '../../lib/profileStats';
import type { PublicProfileStats, ReviewItem } from '../../lib/profileStats';

interface PublicProfileModalProps {
  userId: string;
  onClose: () => void;
  /** 'base' = z-[900]/z-[910], 'top' = z-[1000]/z-[1010]. Use 'top' when nested inside another modal. */
  layer?: 'base' | 'top';
}

// Badge definitions frontend-side (no DB change needed)
const BADGE_META: Record<string, { emoji: string; label: string; description: string; color: string }> = {
  Newcomer: { emoji: '🌱', label: 'Newcomer', description: 'Getting started on SkillSaathi', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  'Helpful Peer': { emoji: '🤝', label: 'Helpful Peer', description: 'Completed first few help sessions', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Trusted Helper': { emoji: '🏅', label: 'Trusted Helper', description: 'Consistently helpful to peers', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  'Campus Mentor': { emoji: '🎓', label: 'Campus Mentor', description: 'Highly trusted peer supporter', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'Skill Champion': { emoji: '🏆', label: 'Skill Champion', description: 'Top-rated campus helper', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const getBadgeMeta = (badge: string, trust: number, solved: number) => {
  if (BADGE_META[badge]) return BADGE_META[badge];
  if (solved >= 20 || trust >= 95) return BADGE_META['Skill Champion'];
  if (solved >= 10 || trust >= 85) return BADGE_META['Campus Mentor'];
  if (solved >= 5 || trust >= 75) return BADGE_META['Trusted Helper'];
  if (solved >= 1 || trust >= 60) return BADGE_META['Helpful Peer'];
  return BADGE_META['Newcomer'];
};

const getInitials = (name: string) =>
  name.split(' ').filter((n) => n.length > 0).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'SS';

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const StarRow: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <span key={s} className={s <= rating ? 'text-amber-400' : 'text-slate-200'}>★</span>
    ))}
  </span>
);

// ────────────────────────────────────────────────────────────────────
// Review card
// ────────────────────────────────────────────────────────────────────
const ReviewCard: React.FC<{
  rev: ReviewItem;
  onViewReviewer: (reviewerId: string) => void;
}> = ({ rev, onViewReviewer }) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
    <div className="flex items-center gap-2 flex-wrap">
      {rev.reviewer_name ? (
        <button onClick={() => onViewReviewer(rev.reviewer_id)}
          className="text-[11px] font-bold text-indigo-700 hover:underline focus:outline-none">
          {rev.reviewer_name}
        </button>
      ) : (
        <span className="text-[11px] font-bold text-slate-500">Campus Student</span>
      )}
      {(rev.reviewer_department || rev.reviewer_year) && (
        <span className="text-[10px] text-slate-400">
          {[rev.reviewer_department, rev.reviewer_year].filter(Boolean).join(' • ')}
        </span>
      )}
      <span className="text-[10px] text-slate-400 ml-auto">{formatDate(rev.created_at)}</span>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <StarRow rating={rev.rating} />
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
        rev.helpful ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
      }`}>
        {rev.helpful ? '👍 Helpful' : '👎 Not Helpful'}
      </span>
    </div>
    {rev.request_title && (
      <p className="text-[11px] text-slate-500">For: <span className="font-semibold">{rev.request_title}</span></p>
    )}
    {rev.comment && (
      <p className="text-xs text-slate-700 italic leading-relaxed">"{rev.comment}"</p>
    )}
  </div>
);

// ────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────
export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  userId: initialUserId,
  onClose,
  layer = 'base',
}) => {
  const [activeUserId, setActiveUserId] = useState(initialUserId);
  const [history, setHistory] = useState<string[]>([]);
  const [stats, setStats] = useState<PublicProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const overlayZ = layer === 'top' ? 'z-[1000]' : 'z-[900]';
  const contentZ = layer === 'top' ? 'z-[1010]' : 'z-[910]';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStats(null);
    getPublicProfileStats(activeUserId).then((result) => {
      if (cancelled) return;
      if (!result) setError('Could not load this profile.');
      else setStats(result);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeUserId]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleViewReviewer = (reviewerId: string) => {
    if (reviewerId === activeUserId) return;
    setHistory((prev) => [...prev, activeUserId]);
    setActiveUserId(reviewerId);
  };

  const handleBack = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setActiveUserId(prev);
  };

  const badgeMeta = stats ? getBadgeMeta(stats.profile.badge_level, stats.profile.trust_score, stats.solvedCount) : null;
  const ds = stats?.doubtStats;

  // Determine if there are any doubt contributions
  const hasDoubtContributions = ds && (ds.doubtsAnswered > 0 || ds.acceptedAnswers > 0 || ds.answerRatingsReceived > 0);
  const hasHelpReputation = stats && (stats.reviewCount > 0 || stats.solvedCount > 0);

  return (
    <div
      className={`fixed inset-0 ${overlayZ} flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4`}
      onClick={handleBackdrop}
    >
      <div className={`relative ${contentZ} bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col`}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button onClick={handleBack}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 flex items-center justify-center text-sm font-bold transition"
                aria-label="Back">
                ←
              </button>
            )}
            <h2 className="text-base font-bold text-slate-700 uppercase tracking-wider">Peer Profile</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-lg font-bold transition"
            aria-label="Close">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-6 flex-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin" />
              <p className="text-xs text-slate-400">Loading profile...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center">
              {error}
            </div>
          )}

          {stats && !loading && (
            <>
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-2xl font-extrabold text-indigo-600 border-2 border-indigo-200 shrink-0">
                  {getInitials(stats.profile.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-extrabold text-slate-900 truncate">
                    {stats.profile.full_name || 'Campus Student'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {stats.profile.department || 'General Studies'} • {stats.profile.year_of_study}
                    {stats.profile.section ? ` • Sec ${stats.profile.section}` : ''}
                  </p>
                  {(stats.profile.availability || stats.profile.help_mode) && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {stats.profile.help_mode && `📍 ${stats.profile.help_mode}`}
                      {stats.profile.availability && ` • 🕐 ${stats.profile.availability}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Badge */}
              {badgeMeta && (
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${badgeMeta.color}`}>
                  <span className="text-2xl">{badgeMeta.emoji}</span>
                  <div>
                    <p className="text-xs font-bold">{badgeMeta.label}</p>
                    <p className="text-[11px] opacity-80">{badgeMeta.description}</p>
                  </div>
                </div>
              )}

              {/* ─── SECTION A: PEER HELP REPUTATION ─── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="text-sm font-bold text-slate-800">🤝 Peer Help Reputation</span>
                  <span className="text-[10px] text-slate-400 font-medium ml-auto">Help requests & feedback</span>
                </div>

                {!hasHelpReputation ? (
                  <p className="text-xs text-slate-400 italic">No peer help reviews yet.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                        <p className="text-2xl font-extrabold text-indigo-700">{stats.profile.trust_score}%</p>
                        <p className="text-[10px] font-bold text-indigo-500 mt-0.5">Trust Score</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                        <p className="text-2xl font-extrabold text-emerald-700">{stats.solvedCount}</p>
                        <p className="text-[10px] font-bold text-emerald-500 mt-0.5">Solved</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                        {stats.averageRating !== null ? (
                          <>
                            <p className="text-2xl font-extrabold text-amber-700">{stats.averageRating}</p>
                            <p className="text-[10px] font-bold text-amber-500 mt-0.5">Avg Rating</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xl font-extrabold text-slate-300">—</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">No Ratings</p>
                          </>
                        )}
                      </div>
                    </div>
                    {stats.reviewCount > 0 && (
                      <p className="text-[11px] text-slate-400 text-center">
                        Based on <strong className="text-slate-600">{stats.reviewCount}</strong> help review{stats.reviewCount !== 1 ? 's' : ''} received
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Badge Explanation (Peer Help only) */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Badge Levels (Peer Help)</p>
                <div className="space-y-1.5">
                  {Object.values(BADGE_META).map((b) => (
                    <div key={b.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                      badgeMeta?.label === b.label ? `${b.color} font-bold` : 'bg-slate-50 border-slate-100 text-slate-500'
                    }`}>
                      <span>{b.emoji}</span>
                      <span className="font-semibold">{b.label}</span>
                      <span className="text-[10px] opacity-70">— {b.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── SECTION B: DOUBT CONTRIBUTION ─── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="text-sm font-bold text-slate-800">❓ Doubt Contribution</span>
                  <span className="text-[10px] text-slate-400 font-medium ml-auto">Answers, ratings & acceptance</span>
                </div>

                {!hasDoubtContributions ? (
                  <p className="text-xs text-slate-400 italic">No doubt contributions yet.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-violet-50 rounded-xl border border-violet-100 text-center">
                        <p className="text-2xl font-extrabold text-violet-700">{ds!.doubtsAnswered}</p>
                        <p className="text-[10px] font-bold text-violet-500 mt-0.5">Doubts Answered</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                        <p className="text-2xl font-extrabold text-emerald-700">{ds!.acceptedAnswers}</p>
                        <p className="text-[10px] font-bold text-emerald-500 mt-0.5">Accepted Answers</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                        {ds!.averageDoubtAnswerRating !== null ? (
                          <>
                            <p className="text-2xl font-extrabold text-amber-700">{ds!.averageDoubtAnswerRating}<span className="text-sm font-bold">/10</span></p>
                            <p className="text-[10px] font-bold text-amber-500 mt-0.5">Avg Answer Rating</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xl font-extrabold text-slate-300">—</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">No Ratings Yet</p>
                          </>
                        )}
                      </div>
                      <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-center">
                        <p className="text-2xl font-extrabold text-sky-700">{ds!.answerRatingsReceived}</p>
                        <p className="text-[10px] font-bold text-sky-500 mt-0.5">Ratings Received</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center">
                      Note: Doubt answer ratings (1–10) are separate from peer help ratings (1–5)
                    </p>
                  </>
                )}
              </div>

              {/* Skills */}
              {stats.profile.skills_known && stats.profile.skills_known.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Can Help With</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.profile.skills_known.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold rounded-full">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {stats.profile.skills_wanted && stats.profile.skills_wanted.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Wants to Learn</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.profile.skills_wanted.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold rounded-full">
                        🔍 {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Help Reviews */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Recent Peer Help Reviews ({stats.reviewCount})
                </p>
                {stats.recentReviews.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No peer help reviews yet.</p>
                ) : (
                  <div className="space-y-2">
                    {stats.recentReviews.map((rev) => (
                      <ReviewCard key={rev.id} rev={rev} onViewReviewer={handleViewReviewer} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
