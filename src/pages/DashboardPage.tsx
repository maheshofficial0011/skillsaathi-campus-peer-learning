import React from 'react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-8 px-4 py-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Student Dashboard</h2>
          <p className="text-sm text-slate-500">Welcome back! Find active learning groups and help your peers on campus.</p>
        </div>
        <button className="self-start md:self-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-150">
          + Create Help Request
        </button>
      </div>

      {/* Stats Counter Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Help Requests Solved</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">12</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">My Trust Score</p>
          <p className="text-3xl font-semibold text-indigo-600 mt-1">98%</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Learning Circles Joined</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">4</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Doubts Answered</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">7</p>
        </div>
      </div>

      {/* Grid Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Help Requests */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Recent Peer Help Requests</h3>
          <div className="space-y-4">
            <div className="p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 text-xs font-semibold text-amber-800 bg-amber-50 rounded-full border border-amber-200">
                  Data Structures
                </span>
                <span className="text-xs text-slate-400">Posted 2 hours ago</span>
              </div>
              <h4 className="font-bold text-slate-900">Struggling with Red-Black tree insertions</h4>
              <p className="text-sm text-slate-600">Need someone to quickly sketch or explain the rotation cases before the mid-term tomorrow.</p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">By: Rahul S. (CS 3rd Year)</span>
                <button className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-md border border-indigo-200 transition-colors">
                  Accept Request
                </button>
              </div>
            </div>
            
            <div className="p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 text-xs font-semibold text-purple-800 bg-purple-50 rounded-full border border-purple-200">
                  UI/UX Design
                </span>
                <span className="text-xs text-slate-400">Posted 4 hours ago</span>
              </div>
              <h4 className="font-bold text-slate-900">Review my landing page layout in Figma</h4>
              <p className="text-sm text-slate-600">Looking for constructive feedback on mobile responsiveness and visual hierarchy for our prototype.</p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">By: Anjali M. (Design 2nd Year)</span>
                <button className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-md border border-indigo-200 transition-colors">
                  Accept Request
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Circles & Activity */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">My Circles & Cohorts</h3>
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
    </div>
  );
};
