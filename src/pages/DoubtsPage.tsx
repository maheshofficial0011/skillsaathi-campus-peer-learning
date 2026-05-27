import React from 'react';

export const DoubtsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Anonymous Doubts Board</h2>
          <p className="text-sm text-slate-500">Ask or answer questions without revealing your identity. Keep it friendly!</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-150">
          Ask Doubt Anonymously
        </button>
      </div>

      {/* Doubt List Placeholder */}
      <div className="space-y-4">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Posted by Anonymous Peer • Computer Networks</span>
            <span>3 answers</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">Why does TCP use a 3-way handshake instead of a 2-way handshake?</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            I understand that it establishes sequence numbers, but why can't the server just acknowledge the client's syn and begin transmitting data? What failure cases are solved by the third ACK?
          </p>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              ✓ Verified Solution Available
            </span>
            <button className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md transition-colors">
              View Answers
            </button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Posted by Anonymous Peer • Calculus II</span>
            <span>0 answers</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">Tips for visualizing integration by parts geometrically?</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            I can apply the formula perfectly, but I struggle to understand what is actually happening to the area under the curve in a geometric sense. Any simple animations or diagrams?
          </p>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              ⚡ Open Doubt
            </span>
            <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors">
              Write Answer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
