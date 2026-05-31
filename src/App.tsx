import { useState, useEffect } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import DoubtsPage from './pages/DoubtsPage';
import { LearningCirclesPage } from './pages/LearningCirclesPage';
import { ProjectMatePage } from './pages/ProjectMatePage';
import { SeniorConnectPage } from './pages/SeniorConnectPage';
import { PublicInfoPage } from './pages/PublicInfoPages';
import { useAuth } from './hooks/useAuth';

const publicPages = ['landing', 'auth', 'about', 'contact', 'faq', 'privacy', 'terms'];

function App() {
  const { user, loading, signOut } = useAuth();
  const [activePage, setActivePage] = useState<string>('landing');

  // Handle automatic redirect upon successful login
  useEffect(() => {
    if (user) {
      if (activePage === 'auth' || activePage === 'landing') {
        setActivePage('dashboard');
      }
    } else {
      // If user logs out, send them back to landing page
      if (!publicPages.includes(activePage)) {
        setActivePage('landing');
      }
    }
  }, [user]);

  // Route Protection validation
  const navigateTo = (page: string) => {
    const isPublic = publicPages.includes(page);

    if (!user && !isPublic) {
      // Redirect unauthenticated users to the auth portal
      setActivePage('auth');
    } else {
      setActivePage(page);
    }
  };

  // Render correct page
  const renderPage = () => {
    switch (activePage) {
      case 'landing':
        return <LandingPage onNavigate={navigateTo} />;
      case 'auth':
        return <AuthPage />;
      case 'about':
      case 'contact':
      case 'faq':
      case 'privacy':
      case 'terms':
        return <PublicInfoPage page={activePage} onNavigate={navigateTo} />;
      case 'dashboard':
        return <DashboardPage userId={user?.id} userEmail={user?.email} onNavigate={navigateTo} />;
      case 'profile':
        return <ProfilePage userId={user?.id} userEmail={user?.email} />;
      case 'doubts':
        return <DoubtsPage />;
      case 'circles':
        return <LearningCirclesPage />;
      case 'projectmate':
        return <ProjectMatePage />;
      case 'seniorconnect':
        return <SeniorConnectPage />;
      default:
        return <PublicInfoPage page="not-found" onNavigate={navigateTo} />;
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
        <p className="text-sm text-slate-500 font-semibold tracking-wide">
          Preparing your SkillSaathi session...
        </p>
      </div>
    );
  }

  return (
    <MainLayout
      activePage={activePage}
      onNavigate={navigateTo}
      userEmail={user?.email}
      onLogout={signOut}
    >
      {renderPage()}
    </MainLayout>
  );
}

export default App;
