import React from 'react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

const features = [
  {
    emoji: '❓',
    title: 'Anonymous Doubts',
    description: 'Post academic questions anonymously. Get peer answers, upvotes, and accepted answers without judgement.',
    color: 'bg-violet-50 border-violet-100',
    accent: 'text-violet-600',
  },
  {
    emoji: '🔵',
    title: 'Learning Circles',
    description: 'Form focused study groups, share resources, manage members, and collaborate on a shared discussion board.',
    color: 'bg-blue-50 border-blue-100',
    accent: 'text-blue-600',
  },
  {
    emoji: '⭐',
    title: 'Senior Connect',
    description: 'Request 1-on-1 guidance sessions with verified senior mentors. Track your session history and feedback.',
    color: 'bg-amber-50 border-amber-100',
    accent: 'text-amber-600',
  },
  {
    emoji: '🤝',
    title: 'Find Teammates',
    description: 'Post project ideas, define role slots, and recruit teammates. Apply to projects that match your skills.',
    color: 'bg-emerald-50 border-emerald-100',
    accent: 'text-emerald-600',
  },
  {
    emoji: '🗂️',
    title: 'Project Workspace',
    description: 'Private workspace for your team: shared resources, videos, discussion board, and task management in one place.',
    color: 'bg-indigo-50 border-indigo-100',
    accent: 'text-indigo-600',
  },
  {
    emoji: '🏆',
    title: 'Verified Contributions',
    description: 'Build a verifiable record of completed tasks and collaborations. Earn dynamic badges on your profile.',
    color: 'bg-rose-50 border-rose-100',
    accent: 'text-rose-600',
  },
];

const stats = [
  { value: '6+', label: 'Platform Modules' },
  { value: '20+', label: 'Core Features' },
  { value: '100%', label: 'RLS Secured' },
  { value: 'MVP', label: 'Production Ready' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col gap-16 px-4 py-8">

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-6">
        <span className="px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-full border border-indigo-200 uppercase tracking-wider">
          🎓 Campus Peer Learning Platform
        </span>

        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Learn Together, Grow{' '}
          <span className="text-indigo-600">Together</span>
        </h1>

        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          SkillSaathi helps campus students ask anonymous doubts, join study circles, find project teammates, get senior guidance, and track verified contributions — all in one platform.
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            id="landing-get-started-btn"
            onClick={() => onNavigate('auth')}
            className="px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            Get Started — It's Free
          </button>
          <button
            id="landing-dashboard-btn"
            onClick={() => onNavigate('dashboard')}
            className="px-7 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-200 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Explore Dashboard →
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto w-full">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <span className="text-2xl font-extrabold text-indigo-600">{s.value}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Features Grid */}
      <div className="max-w-4xl mx-auto w-full">
        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Everything You Need to Collaborate</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className={`p-5 rounded-xl border ${f.color} hover:shadow-md transition-shadow duration-200 flex flex-col gap-2`}
            >
              <span className={`text-2xl ${f.accent}`}>{f.emoji}</span>
              <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Footer Row */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <p className="text-slate-500 text-sm">
          Built for campus students. Backed by{' '}
          <span className="font-semibold text-slate-700">Supabase</span>,{' '}
          <span className="font-semibold text-slate-700">React</span>, and{' '}
          <span className="font-semibold text-slate-700">Vercel</span>.
        </p>
        <button
          onClick={() => onNavigate('auth')}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          Create Your Campus Account →
        </button>
      </div>

    </div>
  );
};
