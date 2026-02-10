
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContributionCalendar } from '../../components/calendar/ContributionCalendar';
import { Clock, Calendar, Users, FileText, CheckCircle, Timer } from 'lucide-react';
import { DualModeService } from '@/services/dualModeService';
import { toast } from '@/hooks/use-toast';

interface DashboardOverviewProps {
  user: any;
}

export const DashboardOverview = ({ user }: DashboardOverviewProps) => {
  const [stats, setStats] = useState({
    weeklyHours: 0,
    pendingRequests: 0,
    approvedLeaves: 0
  });
  // 'not_checked_in' | 'checked_in_only' | 'checked_in_and_out'
  const [attendanceStatus, setAttendanceStatus] = useState<string>('not_checked_in');
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const status = await DualModeService.getAttendanceStatus();
      setAttendanceStatus(status.status || 'not_checked_in');
      setCheckInTime(status.check_in_time || null);
      setCheckOutTime(status.check_out_time || null);
    } catch (error) {
      console.error('Failed to fetch attendance status:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [_statusResult, leaves, tours] = await Promise.all([
        fetchAttendanceStatus(),
        DualModeService.getLeaveHistory(),
        DualModeService.getTourHistory()
      ]);

      const leaveList = Array.isArray(leaves) ? leaves : [];
      const tourList = Array.isArray(tours) ? tours : [];

      const pendingLeaves = leaveList.filter((leave: any) => leave.status === 'pending').length;
      const pendingTours = tourList.filter((tour: any) => tour.status === 'pending').length;

      setStats({
        weeklyHours: 42, // TODO: calculate from attendance history
        pendingRequests: pendingLeaves + pendingTours,
        approvedLeaves: leaveList.filter((leave: any) => leave.status === 'approved').length
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleQuickCheckIn = async () => {
    setLoading(true);
    try {
      await DualModeService.checkIn();
      toast({ title: 'Check-in successful!', description: 'Have a great day!' });
      await fetchAttendanceStatus();
    } catch (error: any) {
      toast({
        title: 'Check-in failed',
        description: error.message,
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const handleQuickCheckOut = async () => {
    setLoading(true);
    try {
      await DualModeService.checkOut();
      toast({ title: 'Check-out successful!', description: 'See you tomorrow!' });
      await fetchAttendanceStatus();
    } catch (error: any) {
      toast({
        title: 'Check-out failed',
        description: error.message,
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Derive display values from attendanceStatus
  const getStatusDisplay = () => {
    switch (attendanceStatus) {
      case 'checked_in_only':
        return {
          label: 'Checked In',
          subtitle: checkInTime ? `Since ${formatTime(checkInTime)}` : '',
          color: 'text-green-600 dark:text-green-400',
          icon: Timer,
          iconBg: 'bg-green-100 dark:bg-green-900/30',
        };
      case 'checked_in_and_out':
        return {
          label: 'Completed',
          subtitle: checkInTime && checkOutTime
            ? `${formatTime(checkInTime)} – ${formatTime(checkOutTime)}`
            : '',
          color: 'text-blue-600 dark:text-blue-400',
          icon: CheckCircle,
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        };
      default:
        return {
          label: 'Not Checked In',
          subtitle: 'Ready to start your day',
          color: 'text-gray-600 dark:text-gray-400',
          icon: Clock,
          iconBg: 'bg-gray-100 dark:bg-gray-800',
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Here's what's happening with your attendance today.
        </p>
      </div>

      {/* Quick Actions — only show when there's an action to take */}
      {!initialLoading && (
        <div className="flex flex-wrap gap-3">
          {attendanceStatus === 'not_checked_in' && (
            <Button
              onClick={handleQuickCheckIn}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Clock className="w-4 h-4 mr-2" />
              Quick Check-In
            </Button>
          )}

          {attendanceStatus === 'checked_in_only' && (
            <Button
              onClick={handleQuickCheckOut}
              disabled={loading}
              variant="outline"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Quick Check-Out
            </Button>
          )}

          {attendanceStatus === 'checked_in_and_out' && (
            <div className="inline-flex items-center px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
              <span className="text-green-800 dark:text-green-300 font-medium">Day Completed!</span>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
            <div className={`p-1.5 rounded-md ${statusDisplay.iconBg}`}>
              <StatusIcon className={`h-4 w-4 ${statusDisplay.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${statusDisplay.color}`}>
              {initialLoading ? '...' : statusDisplay.label}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {initialLoading
                ? 'Loading...'
                : statusDisplay.subtitle || new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Hours</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weeklyHours}h</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Leaves</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedLeaves}</div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>
      </div>

      {/* Contribution Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Your Activity</CardTitle>
          <CardDescription>
            A visual overview of your attendance, leaves, and business tours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContributionCalendar />
        </CardContent>
      </Card>
    </div>
  );
};
