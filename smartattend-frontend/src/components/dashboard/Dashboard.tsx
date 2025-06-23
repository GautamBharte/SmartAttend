
import { useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { AttendancePanel } from './AttendancePanel';
import { LeaveRequests } from './LeaveRequests';
import { TourRequests } from './TourRequests';
import { AdminPanel } from './AdminPanel';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        showMenuButton={true}
      />
      
      <div className="flex">
        <Sidebar 
          user={user} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
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
