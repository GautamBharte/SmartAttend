
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar } from 'lucide-react';
import { attendanceService } from '@/services/attendanceService';
import { toast } from '@/hooks/use-toast';

export const AttendancePanel = () => {
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      const history = await attendanceService.getHistory();
      setAttendanceHistory(history || []);
      
      // Check if user is currently checked in
      const today = new Date().toDateString();
      const todayAttendance = history?.find((record: any) => 
        new Date(record.check_in_time).toDateString() === today
      );
      setIsCheckedIn(todayAttendance && !todayAttendance.check_out_time);
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await attendanceService.checkIn();
      setIsCheckedIn(true);
      toast({ title: 'Check-in successful!', description: 'Have a great day!' });
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
      await attendanceService.checkOut();
      setIsCheckedIn(false);
      toast({ title: 'Check-out successful!', description: 'See you tomorrow!' });
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

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
              <span>Today's Attendance</span>
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
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 ${
                isCheckedIn ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              }`}>
                <Clock className="w-8 h-8" />
              </div>
              <p className="text-lg font-semibold">
                {isCheckedIn ? 'Checked In' : 'Not Checked In'}
              </p>
              <p className="text-sm text-gray-500">
                Current Status
              </p>
            </div>
            
            <div className="space-y-2">
              {!isCheckedIn ? (
                <Button 
                  onClick={handleCheckIn} 
                  disabled={loading} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              ) : (
                <Button 
                  onClick={handleCheckOut} 
                  disabled={loading} 
                  variant="outline"
                  className="w-full"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
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
                      <p className="font-medium">{formatDate(record.check_in_time)}</p>
                      <div className="flex space-x-4 text-sm text-gray-500 mt-1">
                        <span>In: {formatTime(record.check_in_time)}</span>
                        {record.check_out_time && (
                          <span>Out: {formatTime(record.check_out_time)}</span>
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
