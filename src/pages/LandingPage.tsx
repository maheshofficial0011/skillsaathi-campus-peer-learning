import React from 'react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <span className="px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full border border-indigo-200 uppercase tracking-wider">
          Phase 0: Project Setup Complete
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
          Welcome to <span className="text-indigo-600 bg-clip-text">SkillSaathi</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          A campus peer-learning and student collaboration platform designed to connect you with seniors, share resources, find project teammates, and resolve academic doubts together.
        </p>
        
        <div className="pt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => onNavigate('auth')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200"
          >
            Get Started
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg border border-slate-200 shadow-sm transition-colors duration-200"
          >
            Enter Dashboard
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="pt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-md transition-shadow duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Peer Learning Profiles</h3>
            <p className="text-sm text-slate-600">List the skills you know, the skills you want to learn, and connect with matching campus partners.</p>
          </div>
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-md transition-shadow duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Anonymous Doubt Solver</h3>
            <p className="text-sm text-slate-600">Ask your burning academic doubts anonymously or answer questions to earn peer trust scores.</p>
          </div>
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-md transition-shadow duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Senior Connect & Circles</h3>
            <p className="text-sm text-slate-600">Reach out to experienced seniors for guidance, share resources, and form specialized study circles.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
