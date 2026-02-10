
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, CheckCircle, Timer } from 'lucide-react';
import { DualModeService } from '@/services/dualModeService';
import { toast } from '@/hooks/use-toast';
import { formatOfficeTime, formatOfficeDate } from '@/config/api';

export const AttendancePanel = () => {
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<string>('not_checked_in');
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
    fetchAttendanceStatus();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      const history = await DualModeService.getAttendanceHistory();
      setAttendanceHistory(history || []);
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
    }
  };

  const fetchAttendanceStatus = async () => {
    try {
      const status = await DualModeService.getAttendanceStatus();
      console.log('Attendance status received:', status);
      setAttendanceStatus(status.status);
      if (status.check_in_time) {
        setTodayRecord({
          check_in_time: status.check_in_time,
          check_out_time: status.check_out_time || null
        });
      }
    } catch (error) {
      console.error('Failed to fetch attendance status:', error);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await DualModeService.checkIn();
      toast({ title: 'Check-in successful!', description: 'Have a great day!' });
      fetchAttendanceStatus();
      fetchAttendanceData();
    } catch (error: any) {
      toast({ 
        title: 'Check-in failed', 
        description: error.message,
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await DualModeService.checkOut();
      toast({ title: 'Check-out successful!', description: 'See you tomorrow!' });
      fetchAttendanceStatus();
      fetchAttendanceData();
    } catch (error: any) {
      toast({ 
        title: 'Check-out failed', 
        description: error.message,
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const getStatusInfo = () => {
    switch (attendanceStatus) {
      case 'not_checked_in':
        return {
          title: 'Not Checked In',
          description: 'Ready to start your day',
          color: 'bg-gray-100 text-gray-600',
          icon: Clock,
          showCheckIn: true,
          showCheckOut: false
        };
      case 'checked_in_only':
        return {
          title: 'Checked In',
          description: `Since ${todayRecord?.check_in_time ? formatOfficeTime(todayRecord.check_in_time) : ''}`,
          color: 'bg-green-100 text-green-600',
          icon: Timer,
          showCheckIn: false,
          showCheckOut: true
        };
      case 'checked_in_and_out':
        return {
          title: 'Day Completed',
          description: `${todayRecord?.check_in_time ? formatOfficeTime(todayRecord.check_in_time) : ''} - ${todayRecord?.check_out_time ? formatOfficeTime(todayRecord.check_out_time) : ''}`,
          color: 'bg-blue-100 text-blue-600',
          icon: CheckCircle,
          showCheckIn: false,
          showCheckOut: false
        };
      default:
        return {
          title: 'Status Unknown',
          description: 'Please refresh the page',
          color: 'bg-red-100 text-red-600',
          icon: Clock,
          showCheckIn: false,
          showCheckOut: false
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Tracking</h1>
          <p className="text-gray-600 mt-1">Manage your daily attendance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Today's Status</span>
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 ${statusInfo.color}`}>
                <StatusIcon className="w-8 h-8" />
              </div>
              <p className="text-lg font-semibold">{statusInfo.title}</p>
              <p className="text-sm text-gray-500">{statusInfo.description}</p>
            </div>
            
            <div className="space-y-2">
              {statusInfo.showCheckIn && (
                <Button 
                  onClick={handleCheckIn} 
                  disabled={loading} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              )}
              
              {statusInfo.showCheckOut && (
                <Button 
                  onClick={handleCheckOut} 
                  disabled={loading} 
                  variant="outline"
                  className="w-full border-green-600 text-green-600 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
              )}

              {attendanceStatus === 'checked_in_and_out' && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">Day Completed!</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Attendance History</span>
            </CardTitle>
            <CardDescription>Your recent attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceHistory.length > 0 ? (
                attendanceHistory.map((record: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{record.date || (record.check_in_time ? formatOfficeDate(record.check_in_time) : '—')}</p>
                      <div className="flex space-x-4 text-sm text-gray-500 mt-1">
                        {record.check_in_time && <span>In: {formatOfficeTime(record.check_in_time)}</span>}
                        {record.check_out_time && (
                          <span>Out: {formatOfficeTime(record.check_out_time)}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={record.check_out_time ? "default" : "secondary"}>
                      {record.check_out_time ? 'Complete' : 'In Progress'}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No attendance records yet</p>
                  <p className="text-sm">Start by checking in today!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
