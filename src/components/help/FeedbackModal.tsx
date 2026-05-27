import React, { useState } from 'react';
import { upsertFeedbackForRequest } from '../../lib/feedback';
import type { Feedback, HelpRequestWithProfiles } from '../../types';

interface FeedbackModalProps {
  request: HelpRequestWithProfiles;
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
  existingFeedback?: Feedback | null;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  request,
  currentUserId,
  onClose,
  onSuccess,
  existingFeedback = null,
}) => {
  const [rating, setRating] = useState<number>(existingFeedback?.rating ?? 5);
  const [helpful, setHelpful] = useState<boolean>(existingFeedback?.helpful ?? true);
  const [comment, setComment] = useState(existingFeedback?.comment ?? '');

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request.accepted_by) {
      setErrorMsg('Cannot submit feedback for a request that has not been accepted.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await upsertFeedbackForRequest({
        request_id: request.id,
        created_by: currentUserId,
        receiver_id: request.accepted_by,
        rating,
        helpful,
        comment,
      });

      if (result) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg('Failed to record your feedback review.');
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('unique_feedback_request') || errMsg.includes('duplicate key value')) {
        setErrorMsg('Feedback already submitted for this request.');
      } else {
        setErrorMsg(errMsg || 'An error occurred during submission.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative z-[1000] bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header Section */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{existingFeedback ? 'Edit Tutor Feedback' : 'Submit Tutor Feedback'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review help provided by <strong>{request.helper_profile?.full_name || 'your peer'}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 hover:bg-slate-100 rounded-md transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Status Alerts */}
          {errorMsg && (
            <div className="p-4 text-xs text-red-800 bg-red-50 rounded-lg border border-red-200" role="alert">
              <span className="font-semibold">Error:</span> {errorMsg}
            </div>
          )}

          {/* Rating Stars Selector */}
          <div className="text-center space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Rate your peer tutor's help:
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-2xl focus:outline-none transition-transform hover:scale-110 active:scale-95"
                >
                  <span className={star <= rating ? 'text-amber-400' : 'text-slate-200'}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400 font-semibold block">
              Rating Selected: {rating} / 5
            </span>
          </div>

          {/* Helpfulness yes/no toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 text-center">
              Did this session solve your problem?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setHelpful(true)}
                className={`py-2 px-4 rounded-lg font-semibold text-sm border text-center transition-all ${
                  helpful
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-250 ring-2 ring-emerald-500/25 border-emerald-500'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Yes, it helped!
              </button>
              <button
                type="button"
                onClick={() => setHelpful(false)}
                className={`py-2 px-4 rounded-lg font-semibold text-sm border text-center transition-all ${
                  !helpful
                    ? 'bg-amber-50 text-amber-700 border-amber-250 ring-2 ring-amber-500/25 border-amber-500'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                No, still unresolved.
              </button>
            </div>
          </div>

          {/* Comment text area */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Add a Comment
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Explained rotations perfectly and very quickly!"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 text-sm font-medium"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              {loading ? 'Submitting...' : (existingFeedback ? 'Update Review' : 'Submit Feedback')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
