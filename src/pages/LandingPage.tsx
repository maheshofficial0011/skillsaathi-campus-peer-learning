import React from 'react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

const statusBadges = ['MVP Complete', 'Vercel Live', 'Supabase Secure', 'Project Collaboration Ready'];

const features = [
  ['❓', 'Anonymous Doubts', 'Ask safely, discover answers, and turn peer knowledge into a searchable campus support network.'],
  ['🔵', 'Learning Circles', 'Join focused study spaces with member workflows, discussions, and shared learning resources.'],
  ['⭐', 'Senior Connect', 'Discover mentors through public-safe profiles, reviews, and structured guidance requests.'],
  ['🤝', 'Project Mate', 'Find the right teammates, fill role slots, and run collaboration from one secure workspace.'],
  ['🏆', 'Verified Contributions', 'Submit work, receive lead verification, and build a profile that proves your impact.'],
];

const workflow = [
  ['01', 'Ask or discover help', 'Start with a doubt, browse peer requests, or find the right mentor.'],
  ['02', 'Join circles or teams', 'Move from discovery into focused study communities and project roles.'],
  ['03', 'Collaborate with resources and tasks', 'Share materials, coordinate work, and keep deliverables visible.'],
  ['04', 'Build verified contribution history', 'Turn completed work into credible proof on your SkillSaathi profile.'],
];

const outcomes = [
  ['Peer learning', 'Make everyday knowledge easier to find and share.'],
  ['Mentorship', 'Create safer pathways to experienced senior guidance.'],
  ['Teamwork', 'Help students form balanced, accountable project teams.'],
  ['Project proof', 'Show verified work instead of relying on claims alone.'],
  ['Campus collaboration', 'Bring disconnected student workflows into one hub.'],
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="landing-page flex flex-col gap-16 sm:gap-20 py-2 sm:py-4">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 px-5 py-10 text-white shadow-2xl shadow-indigo-200/60 sm:px-10 sm:py-14 lg:px-14">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-50 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
            Campus peer-learning network
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Learn together. Build together. <span className="text-cyan-200">Prove your contributions.</span>
          </h1>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-indigo-100 sm:text-base">
            SkillSaathi helps students ask doubts, join learning circles, connect with seniors, find teammates, manage projects, share resources, and verify contributions — all in one campus-ready platform.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button id="landing-get-started-btn" onClick={() => onNavigate('dashboard')} className="rounded-xl bg-white px-6 py-3 text-sm font-black text-indigo-800 shadow-lg shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-indigo-800">
              Open Dashboard <span aria-hidden="true">→</span>
            </button>
            <button id="landing-project-mate-btn" onClick={() => onNavigate('projectmate')} className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-800">
              Explore Project Mate
            </button>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {statusBadges.map((badge) => (
              <span key={badge} className="rounded-full border border-white/20 bg-indigo-950/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-50">
                ✓ {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">One connected campus workflow</p>
          <h2 id="features-heading" className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">From a first question to verified project impact.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Focused modules keep the experience simple while giving every collaboration a clear next step.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {features.map(([emoji, title, description]) => (
            <article key={title} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/70">
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl ring-1 ring-indigo-100" aria-hidden="true">{emoji}</span>
              <h3 className="text-sm font-black text-slate-900">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]" aria-labelledby="workflow-heading">
        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">How SkillSaathi works</p>
          <h2 id="workflow-heading" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">A clear path from help to proof.</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {workflow.map(([number, title, description]) => (
              <article key={number} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-xs font-black tracking-widest text-cyan-300">STEP {number}</span>
                <h3 className="mt-2 text-sm font-black text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-300">{description}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Why it matters</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Collaboration students can carry forward.</h2>
          <div className="mt-6 space-y-3">
            {outcomes.map(([title, description]) => (
              <div key={title} className="flex gap-3 rounded-xl border border-white bg-white/80 p-3.5 shadow-sm">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white" aria-hidden="true">✓</span>
                <div><h3 className="text-xs font-black text-slate-900">{title}</h3><p className="mt-0.5 text-xs leading-5 text-slate-600">{description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50 px-6 py-8 text-center sm:px-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Phase 6.8 · Final MVP Showcase</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">Ready to collaborate with your campus network?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">Explore the dashboard, discover the modules, and turn your next team project into a verified contribution story.</p>
        <button onClick={() => onNavigate('auth')} className="mt-5 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          Get Started <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  );
};
