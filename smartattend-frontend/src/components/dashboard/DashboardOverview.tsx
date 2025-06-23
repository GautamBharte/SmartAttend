
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContributionCalendar } from '../../components/calendar/ContributionCalendar';
import { Clock, Calendar, Users, FileText, CheckCircle } from 'lucide-react';
import { DualModeService } from '@/services/dualModeService';
import { toast } from '@/hooks/use-toast';

interface DashboardOverviewProps {
  user: any;
}

export const DashboardOverview = ({ user }: DashboardOverviewProps) => {
  const [stats, setStats] = useState({
    todayStatus: 'Not Checked In',
    weeklyHours: 0,
    pendingRequests: 0,
    approvedLeaves: 0
  });
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [attendance, leaves, tours] = await Promise.all([
        DualModeService.getAttendanceHistory(),
        DualModeService.getLeaveHistory(),
        DualModeService.getTourHistory()
      ]);

      // Calculate stats
      const today = new Date().toDateString();
      const todayAttendance = attendance?.find((record: any) => 
        new Date(record.check_in_time).toDateString() === today
      );
      
      setIsCheckedIn(todayAttendance && !todayAttendance.check_out_time);
      
      const pendingLeaves = leaves?.filter((leave: any) => leave.status === 'pending').length || 0;
      const pendingTours = tours?.filter((tour: any) => tour.status === 'pending').length || 0;
      
      setStats({
        todayStatus: todayAttendance ? (todayAttendance.check_out_time ? 'Completed' : 'Checked In') : 'Not Checked In',
        weeklyHours: 42, // Mock data
        pendingRequests: pendingLeaves + pendingTours,
        approvedLeaves: leaves?.filter((leave: any) => leave.status === 'approved').length || 0
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const handleQuickCheckIn = async () => {
    setLoading(true);
    try {
      await DualModeService.checkIn();
      setIsCheckedIn(true);
      toast({ title: 'Check-in successful!', description: 'Have a great day!' });
      fetchDashboardData();
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
      setIsCheckedIn(false);
      toast({ title: 'Check-out successful!', description: 'See you tomorrow!' });
      fetchDashboardData();
    } catch (error: any) {
      toast({ 
        title: 'Check-out failed', 
        description: error.message,
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

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

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {!isCheckedIn ? (
          <Button 
            onClick={handleQuickCheckIn} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Clock className="w-4 h-4 mr-2" />
            Quick Check-In
          </Button>
        ) : (
          <Button 
            onClick={handleQuickCheckOut} 
            disabled={loading}
            variant="outline"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Quick Check-Out
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayStatus}</div>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
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
