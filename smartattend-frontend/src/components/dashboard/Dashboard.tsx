
import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { AttendancePanel } from './AttendancePanel';
import { LeaveRequests } from './LeaveRequests';
import { TourRequests } from './TourRequests';
import { AdminPanel } from './AdminPanel';

const VALID_TABS = ['dashboard', 'attendance', 'leave', 'tour', 'admin'];

/** Read the sidebar tab from the URL hash, e.g. #admin → "admin" */
function tabFromHash(): string {
  const raw = window.location.hash.replace('#', '').split('/')[0];
  return VALID_TABS.includes(raw) ? raw : 'dashboard';
}

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onProfileUpdate?: (updatedUser: any) => void;
}

export const Dashboard = ({ user, onLogout, onProfileUpdate }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState(tabFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keep the URL hash in sync with the active tab
  const changeTab = useCallback((tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab;
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const onHashChange = () => setActiveTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview user={user} />;
      case 'attendance':
        return <AttendancePanel />;
      case 'leave':
        return <LeaveRequests />;
      case 'tour':
        return <TourRequests />;
      case 'admin':
        return user?.role === 'admin' ? <AdminPanel /> : <div className="p-6"><div className="text-center text-gray-500">Access Denied</div></div>;
      default:
        return <DashboardOverview user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar 
        user={user} 
        onLogout={onLogout} 
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        // onProfileUpdate={onProfileUpdate}
        showMenuButton={true}
      />
      
      <div className="flex">
        <Sidebar 
          user={user} 
          activeTab={activeTab} 
          setActiveTab={changeTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <div className="container mx-auto p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};
