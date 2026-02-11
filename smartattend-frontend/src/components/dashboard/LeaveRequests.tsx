
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { requestService } from '@/services/requestService';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const LeaveRequests = () => {
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    fetchLeaveHistory();
  }, []);

  const fetchLeaveHistory = async () => {
    try {
      const history = await requestService.getLeaveHistory();
      setLeaveHistory(history || []);
    } catch (error) {
      console.error('Failed to fetch leave history:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await requestService.applyLeave(formData);
      toast({ title: 'Leave request submitted!', description: 'Your request is pending approval' });
      setFormData({ start_date: '', end_date: '', reason: '' });
      setShowForm(false);
      fetchLeaveHistory();
    } catch (error: any) {
      toast({ 
        title: 'Failed to submit request', 
        description: error.message,
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leave Requests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Apply for leave and track your requests</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Apply for Leave</CardTitle>
            <CardDescription>Submit a new leave request</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date
                          ? format(new Date(formData.start_date + 'T00:00:00'), 'PPP')
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date ? new Date(formData.start_date + 'T00:00:00') : undefined}
                        onSelect={(date) =>
                          setFormData({...formData, start_date: date ? format(date, 'yyyy-MM-dd') : ''})
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date
                          ? format(new Date(formData.end_date + 'T00:00:00'), 'PPP')
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.end_date ? new Date(formData.end_date + 'T00:00:00') : undefined}
                        onSelect={(date) =>
                          setFormData({...formData, end_date: date ? format(date, 'yyyy-MM-dd') : ''})
                        }
                        disabled={(date) =>
                          formData.start_date ? date < new Date(formData.start_date + 'T00:00:00') : false
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a reason for your leave request"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  required
                />
              </div>
              <div className="flex space-x-3">
                <Button type="submit" disabled={loading}>
                  Submit Request
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" />
            <span>Leave History</span>
          </CardTitle>
          <CardDescription>Your submitted leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaveHistory.length > 0 ? (
              leaveHistory.map((leave: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{leave.reason}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Requested on {formatDate(leave.created_at)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(leave.status)}>
                    {leave.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>No leave requests yet</p>
                <p className="text-sm">Click "New Request" to apply for leave</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
