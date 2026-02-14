
import { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { AttendancePanel } from './AttendancePanel';
import { LeaveRequests } from './LeaveRequests';
import { TourRequests } from './TourRequests';
import { AdminPanel } from './AdminPanel';
import { ENABLED_TABS } from '@/config/featureFlags';

/** Read the sidebar tab from the URL hash, e.g. #admin → "admin" */
function tabFromHash(user?: any): string {
  const raw = window.location.hash.replace('#', '').split('/')[0];
  if (ENABLED_TABS.includes(raw)) {
    return raw;
  }
  // Default to 'admin' for admin users, 'dashboard' for others
  return user?.role === 'admin' ? 'admin' : 'dashboard';
}

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onProfileUpdate?: (updatedUser: any) => void;
}

export const Dashboard = ({ user, onLogout, onProfileUpdate }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState(() => tabFromHash(user));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track which tabs have been visited so we mount them lazily but keep them alive
  const visitedTabs = useRef<Set<string>>(new Set([tabFromHash(user)]));

  // Keep the URL hash in sync with the active tab
  const changeTab = useCallback((tab: string) => {
    visitedTabs.current.add(tab);
    setActiveTab(tab);
    window.location.hash = tab;
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const onHashChange = () => {
      const tab = tabFromHash(user);
      visitedTabs.current.add(tab);
      setActiveTab(tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [user]);

  // Redirect admin users away from employee-only tabs
  useEffect(() => {
    if (user?.role === 'admin' && ['dashboard', 'attendance', 'leave'].includes(activeTab)) {
      changeTab('admin');
      window.location.hash = 'admin';
    }
  }, [user, activeTab, changeTab]);

  /** Resolve component for a tab id */
  const tabComponent = (tab: string) => {
    const isAdmin = user?.role === 'admin';
    
    // Block admin users from accessing employee-only tabs
    if (isAdmin && ['dashboard', 'attendance', 'leave'].includes(tab)) {
      return <div className="p-6"><div className="text-center text-gray-500">This section is not available for admin users</div></div>;
    }
    
    switch (tab) {
      case 'dashboard':
        return <DashboardOverview user={user} />;
      case 'attendance':
        return <AttendancePanel />;
      case 'leave':
        return <LeaveRequests />;
      case 'tour':
        return <TourRequests />;
      case 'admin':
        return isAdmin
          ? <AdminPanel />
          : <div className="p-6"><div className="text-center text-gray-500">Access Denied</div></div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar 
        user={user} 
        onLogout={onLogout} 
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        onProfileUpdate={onProfileUpdate}
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
        
        <main className="flex-1 min-h-[calc(100vh-4rem)] overflow-x-hidden">
          <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl w-full">
            {/*
              Render all visited & enabled tabs, but only show the active one.
              Inactive tabs stay mounted (preserving state) but are hidden via CSS.
              Filter out employee-only tabs for admin users.
            */}
            {ENABLED_TABS
              .filter(tab => {
                // Hide dashboard, attendance, and leave tabs for admin users
                if (user?.role === 'admin' && ['dashboard', 'attendance', 'leave'].includes(tab)) {
                  return false;
                }
                return true;
              })
              .map((tab) =>
                visitedTabs.current.has(tab) ? (
                  <div
                    key={tab}
                    style={{ display: activeTab === tab ? 'block' : 'none' }}
                  >
                    {tabComponent(tab)}
                  </div>
                ) : null
              )}
          </div>
        </main>
      </div>
    </div>
  );
};
