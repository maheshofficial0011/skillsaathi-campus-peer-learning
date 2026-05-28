import React, { useState, useEffect } from 'react';
import type { HelpRequestWithProfiles, Feedback } from '../../types';
import { PublicProfileModal } from '../profile/PublicProfileModal';
import { getSharedHelpContactDetails } from '../../lib/seniorConnect';
import type { SecureContactInfo } from '../../lib/seniorConnect';

interface HelpRequestDetailsModalProps {
  request: HelpRequestWithProfiles;
  currentUserId: string;
  existingFeedback?: Feedback | null;
  hasAnyFeedback?: boolean;
  onClose: () => void;
  onDelete?: (requestId: string) => Promise<void>;
}

const formatFullDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${month} ${day}, ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

interface TimelineStep {
  label: string;
  active: boolean;
  icon: string;
}

const StatusTimeline: React.FC<{ status: string; hasFeedback: boolean }> = ({ status, hasFeedback }) => {
  const steps: TimelineStep[] = [
    { label: 'Posted', active: true, icon: '📋' },
    { label: 'Accepted', active: status === 'accepted' || status === 'solved', icon: '🤝' },
    { label: 'Solved', active: status === 'solved', icon: '✅' },
    { label: 'Reviewed', active: hasFeedback, icon: '⭐' },
  ];

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, idx) => (
        <React.Fragment key={step.label}>
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                step.active
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {step.icon}
            </div>
            <span
              className={`text-[10px] font-bold whitespace-nowrap ${
                step.active ? 'text-indigo-700' : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 mb-4 transition-all ${
                steps[idx + 1].active ? 'bg-indigo-400' : 'bg-slate-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const HelpRequestDetailsModal: React.FC<HelpRequestDetailsModalProps> = ({
  request,
  currentUserId,
  existingFeedback,
  hasAnyFeedback = false,
  onClose,
  onDelete,
}) => {
  // For timeline: Reviewed is active if ANY feedback exists for this request.
  // For feedback section: only show current user's own review via existingFeedback.
  const hasFeedback = hasAnyFeedback || !!existingFeedback;
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [contactDetails, setContactDetails] = useState<SecureContactInfo | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);

  useEffect(() => {
    const fetchHelpContact = async () => {
      const isParticipant = currentUserId === request.created_by || currentUserId === request.accepted_by;
      const hasAcceptedHelper = !!request.accepted_by;
      const isValidStatus = request.status === 'accepted' || request.status === 'solved' || request.status === 'closed';

      if (!isParticipant || !hasAcceptedHelper || !isValidStatus) return;

      const targetUserId = currentUserId === request.created_by ? request.accepted_by! : request.created_by;

      setLoadingContact(true);
      try {
        const details = await getSharedHelpContactDetails(targetUserId, request.id);
        setContactDetails(details);
      } catch (err) {
        console.error('Error fetching shared help contact:', err);
      } finally {
        setLoadingContact(false);
      }
    };
    fetchHelpContact();
  }, [request.id, request.status, request.created_by, request.accepted_by, currentUserId]);

  const isCreator = request.created_by === currentUserId;
  const canDelete =
    isCreator &&
    (request.status === 'open' || request.status === 'closed') &&
    !hasFeedback &&
    !!onDelete;

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm('Delete this request permanently? This cannot be undone.')) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(request.id);
      onClose();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete request.');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'accepted': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'solved': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'closed': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Urgent': return 'bg-red-50 text-red-700 border-red-200';
      case 'High': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative z-[910] bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded uppercase tracking-wider">
                {request.category}
              </span>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold border rounded uppercase tracking-wider ${getUrgencyColor(request.urgency)}`}>
                {request.urgency}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold border rounded-full ${getStatusColor(request.status)}`}>
                {request.status}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
              {request.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition text-lg font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-6 flex-1">

          {/* Workflow Timeline */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Workflow Status</p>
            <StatusTimeline status={request.status} hasFeedback={hasFeedback} />
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 rounded-lg p-3 border border-slate-100">
              {request.description}
            </p>
          </div>

          {/* Required Skills */}
          {request.required_skills && request.required_skills.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {request.required_skills.map((skill) => (
                  <span key={skill} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold rounded">
                    #{skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* People */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Posted By</p>
              <p className="text-sm font-bold text-slate-800">
                {request.creator_profile?.full_name || 'Campus Student'}
              </p>
              {request.creator_profile?.department && (
                <p className="text-xs text-slate-500">{request.creator_profile.department}</p>
              )}
              {request.creator_profile?.year_of_study && (
                <p className="text-xs text-slate-400">{request.creator_profile.year_of_study}</p>
              )}
              <button
                onClick={() => setViewProfileId(request.created_by)}
                className="mt-2 text-[11px] font-bold text-indigo-600 hover:underline focus:outline-none"
              >
                View Profile →
              </button>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Accepted By</p>
              {request.accepted_by ? (
                <>
                  <p className="text-sm font-bold text-sky-800">
                    {request.helper_profile?.full_name || 'Campus Helper'}
                  </p>
                  {request.helper_profile?.department && (
                    <p className="text-xs text-slate-500">{request.helper_profile.department}</p>
                  )}
                  <button
                    onClick={() => setViewProfileId(request.accepted_by!)}
                    className="mt-2 text-[11px] font-bold text-sky-600 hover:underline focus:outline-none"
                  >
                    View Profile →
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-400 italic">Not accepted yet</p>
              )}
            </div>
          </div>

          {/* Coordination Guidance Box */}
          {(isCreator || (request.accepted_by === currentUserId)) && request.status === 'accepted' && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1.5">
              <p className="text-xs font-bold text-indigo-800 flex items-center gap-1">
                <span>💬</span> Next Step: Coordinate Session
              </p>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Connect with your peer based on the preferred help mode.
                For <span className="font-semibold">Online</span> sessions, share a Google Meet or Discord link.
                For <span className="font-semibold">In-Person</span>, coordinate a campus spot like the library or CSE labs.
                <span className="italic text-slate-500 block mt-1">In-app notifications and direct coordination chat are coming soon!</span>
              </p>
            </div>
          )}

          {/* Shared Contact Details Card */}
          {(request.status === 'accepted' || request.status === 'solved' || request.status === 'closed') &&
            (currentUserId === request.created_by || currentUserId === request.accepted_by) &&
            request.accepted_by && (
              <div className="p-3.5 bg-violet-50/50 border border-violet-100 rounded-xl space-y-2">
                <p className="text-xs font-bold text-violet-850 flex items-center gap-1">
                  <span>👤</span> Shared Contact Details:
                </p>
                {loadingContact ? (
                  <p className="text-xs text-slate-400 italic">Loading contact details...</p>
                ) : contactDetails && (
                  contactDetails.contact_phone ||
                  contactDetails.contact_whatsapp ||
                  contactDetails.contact_email ||
                  contactDetails.contact_other
                ) ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {contactDetails.contact_phone && (
                        <p className="bg-white p-2 rounded border border-violet-200 leading-relaxed font-semibold text-slate-800">
                          <span className="font-semibold text-slate-500 block mb-0.5">📞 Phone Number:</span>
                          {contactDetails.contact_phone}
                        </p>
                      )}
                      {contactDetails.contact_whatsapp && (
                        <p className="bg-white p-2 rounded border border-violet-200 leading-relaxed font-semibold text-slate-800">
                          <span className="font-semibold text-slate-500 block mb-0.5">💬 WhatsApp:</span>
                          <a href={contactDetails.contact_whatsapp.startsWith('http') ? contactDetails.contact_whatsapp : `https://wa.me/${contactDetails.contact_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                            {contactDetails.contact_whatsapp}
                          </a>
                        </p>
                      )}
                      {contactDetails.contact_email && (
                        <p className="bg-white p-2 rounded border border-violet-200 leading-relaxed font-semibold text-slate-800">
                          <span className="font-semibold text-slate-500 block mb-0.5">✉️ Contact Email:</span>
                          <a href={`mailto:${contactDetails.contact_email}`} className="text-indigo-600 hover:underline">
                            {contactDetails.contact_email}
                          </a>
                        </p>
                      )}
                      {contactDetails.contact_other && (
                        <p className="bg-white p-2 rounded border border-violet-200 leading-relaxed font-semibold text-slate-800">
                          <span className="font-semibold text-slate-500 block mb-0.5">🌐 Other Handle / Contact:</span>
                          {contactDetails.contact_other}
                        </p>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-normal space-y-0.5 mt-1.5">
                      <p>🔒 Only visible after an accepted/completed connection.</p>
                      <p>✓ Only contact methods enabled by the user are shown.</p>
                      <p>🚫 Private contact is never shown on public profiles.</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded border border-violet-100 space-y-1">
                    <p className="italic">No contact details shared.</p>
                    <p className="text-[10px] text-slate-400 leading-normal pt-1">
                      ✓ Only contact methods enabled by the user are shown. Private contact is never shown on public profiles.
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Posted</p>
              <p className="text-xs text-slate-700 font-semibold">{formatFullDate(request.created_at)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Solved At</p>
              <p className="text-xs text-slate-700 font-semibold">{formatFullDate(request.solved_at)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${request.deadline ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deadline</p>
              <p className={`text-xs font-semibold ${request.deadline ? 'text-amber-700' : 'text-slate-400 italic'}`}>
                {request.deadline ? formatFullDate(request.deadline) : 'No deadline set'}
              </p>
            </div>
          </div>

          {/* Feedback summary if it exists */}
          {hasFeedback && existingFeedback && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">⭐ Submitted Review</p>
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= existingFeedback.rating ? 'text-amber-400' : 'text-slate-300'}>
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-xs font-bold text-purple-700">
                  {existingFeedback.helpful ? '👍 Helpful' : '👎 Not Helpful'}
                </span>
              </div>
              {existingFeedback.comment && (
                <p className="text-xs text-purple-800 mt-2 leading-relaxed italic">"{existingFeedback.comment}"</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          {deleteError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 text-center">
              {deleteError}
            </div>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-2.5 border border-rose-300 hover:bg-rose-50 disabled:opacity-60 text-rose-700 font-bold text-sm rounded-xl transition"
            >
              {deleting ? 'Deleting...' : '🗑 Delete Request Permanently'}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Inline public profile modal — rendered at top layer to appear above this modal */}
      {viewProfileId && (
        <PublicProfileModal userId={viewProfileId} layer="top" onClose={() => setViewProfileId(null)} />
      )}
    </div>
  );
};
