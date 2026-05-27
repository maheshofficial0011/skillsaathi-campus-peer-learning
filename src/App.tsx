import { useState } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { DoubtsPage } from './pages/DoubtsPage';
import { LearningCirclesPage } from './pages/LearningCirclesPage';
import { ProjectMatePage } from './pages/ProjectMatePage';
import { SeniorConnectPage } from './pages/SeniorConnectPage';

function App() {
  const [activePage, setActivePage] = useState<string>('landing');

  // Render correct placeholder page based on active tab state
  const renderPage = () => {
    switch (activePage) {
      case 'landing':
        return <LandingPage onNavigate={setActivePage} />;
      case 'auth':
        return <AuthPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'profile':
        return <ProfilePage />;
      case 'doubts':
        return <DoubtsPage />;
      case 'circles':
        return <LearningCirclesPage />;
      case 'projectmate':
        return <ProjectMatePage />;
      case 'seniorconnect':
        return <SeniorConnectPage />;
      default:
        return <LandingPage onNavigate={setActivePage} />;
    }
  };

  return (
    <MainLayout activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </MainLayout>
  );
}

export default App;
