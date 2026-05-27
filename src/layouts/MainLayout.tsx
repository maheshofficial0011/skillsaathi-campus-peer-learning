import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, activePage, onNavigate }) => {
  const navItems = [
    { id: 'landing', label: 'Home' },
    { id: 'auth', label: 'Auth Gateway' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'My Profile' },
    { id: 'doubts', label: 'Anonymous Doubts' },
    { id: 'circles', label: 'Learning Circles' },
    { id: 'projectmate', label: 'Find Teammates' },
    { id: 'seniorconnect', label: 'Senior Connect' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-650 flex items-center justify-center font-black text-white text-lg tracking-wider bg-indigo-600">
              SS
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              SkillSaathi
            </h1>
          </div>
          
          <div className="flex items-center gap-3 text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            <span>Phase 0 Setup</span>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-64 p-4 lg:py-6 lg:border-r border-slate-200 shrink-0">
          <nav className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 pb-4 lg:pb-0 scrollbar-none">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap text-left shrink-0 w-full ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-650 hover:bg-slate-100 text-slate-600 hover:text-slate-905'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Dynamic Page Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 min-h-[60vh] shadow-sm">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>© 2026 SkillSaathi Campus Platform. All rights reserved. (Phase 0 Scaffolded)</p>
      </footer>
    </div>
  );
};
