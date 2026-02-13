
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, TreePalm } from 'lucide-react';
import { requestService } from '@/services/requestService';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeaveBalance {
  year: number;
  total: number;
  used: number;
  pending: number;
  available: number;
}

interface HolidayEntry {
  date: string;
  name: string;
  type: string;
}

export const LeaveRequests = () => {
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [weekendDays, setWeekendDays] = useState<number[]>([6]); // Default: Sunday only
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    leave_type: 'paid' as 'paid' | 'unpaid',
  });

  useEffect(() => {
    fetchLeaveHistory();
    fetchLeaveBalance();
    fetchHolidays();
    fetchWeekendConfig();
  }, []);

  const fetchLeaveHistory = async () => {
    try {
      const history = await requestService.getLeaveHistory();
      setLeaveHistory(history || []);
    } catch (error) {
      console.error('Failed to fetch leave history:', error);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const balance = await requestService.getLeaveBalance();
      setLeaveBalance(balance);
    } catch (error) {
      console.error('Failed to fetch leave balance:', error);
    }
  };

  const fetchHolidays = async () => {
    try {
      const year = new Date().getFullYear();
      const data = await requestService.getHolidays(year);
      setHolidays(data || []);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };

  const fetchWeekendConfig = async () => {
    try {
      const config = await requestService.getWeekendConfig();
      setWeekendDays(config.weekend_days || [6]);
    } catch (error) {
      console.error('Failed to fetch weekend config:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await requestService.applyLeave(formData);
      toast({ title: 'Leave request submitted!', description: 'Your request is pending approval' });
      setFormData({ start_date: '', end_date: '', reason: '', leave_type: 'paid' });
      setShowForm(false);
      fetchLeaveHistory();
      fetchLeaveBalance();
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

  // Build a set of holiday date strings for fast lookup
  const holidayDateSet = new Set(holidays.map(h => h.date));

  // Disable weekend days and public holidays in the date pickers
  const isDateDisabled = (date: Date) => {
    // JavaScript getDay(): Sunday=0, Monday=1, ..., Saturday=6
    // Python weekday: Monday=0, ..., Sunday=6
    // Convert Python weekday to JavaScript getDay()
    const jsDay = date.getDay();
    const jsWeekendDays = weekendDays.map(pyDay => {
      if (pyDay === 6) return 0; // Sunday: Python 6 -> JS 0
      return pyDay + 1; // Others: Python 0-5 -> JS 1-6
    });

    if (jsWeekendDays.includes(jsDay)) return true;
    const ds = format(date, 'yyyy-MM-dd');
    return holidayDateSet.has(ds);
  };

  // Used/total progress percentage
  const balancePercent = leaveBalance
    ? Math.round(((leaveBalance.used + leaveBalance.pending) / leaveBalance.total) * 100)
    : 0;

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

      {/* Leave Balance Card */}
      {leaveBalance && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <TreePalm className="w-5 h-5" />
              <span>Paid Leave Balance — {leaveBalance.year}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{leaveBalance.total}</p>
                <p className="text-xs text-blue-600 dark:text-blue-500">Total</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{leaveBalance.available}</p>
                <p className="text-xs text-green-600 dark:text-green-500">Available</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{leaveBalance.used}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Used</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{leaveBalance.pending}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500">Pending</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{leaveBalance.used + leaveBalance.pending} of {leaveBalance.total} days used</span>
                <span>{balancePercent}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div
                    className="bg-gray-500 dark:bg-gray-400 transition-all"
                    style={{ width: `${(leaveBalance.used / leaveBalance.total) * 100}%` }}
                  />
                  <div
                    className="bg-yellow-400 dark:bg-yellow-500 transition-all"
                    style={{ width: `${(leaveBalance.pending / leaveBalance.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Apply for Leave</CardTitle>
            <CardDescription>
              Submit a new leave request. Weekends and public holidays are excluded automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Leave Type Toggle */}
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={formData.leave_type === 'paid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, leave_type: 'paid' })}
                  >
                    Paid Leave
                    {leaveBalance && (
                      <span className="ml-1.5 text-xs opacity-80">({leaveBalance.available} left)</span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant={formData.leave_type === 'unpaid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, leave_type: 'unpaid' })}
                  >
                    Unpaid Leave
                  </Button>
                </div>
              </div>

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
                          setFormData({ ...formData, start_date: date ? format(date, 'yyyy-MM-dd') : '' })
                        }
                        disabled={isDateDisabled}
                        modifiers={{
                          holiday: holidays.map(h => new Date(h.date + 'T00:00:00')),
                        }}
                        modifiersClassNames={{
                          holiday: 'text-red-500 font-bold',
                        }}
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
                          setFormData({ ...formData, end_date: date ? format(date, 'yyyy-MM-dd') : '' })
                        }
                        disabled={(date) => {
                          if (isDateDisabled(date)) return true;
                          if (formData.start_date && date < new Date(formData.start_date + 'T00:00:00')) return true;
                          return false;
                        }}
                        modifiers={{
                          holiday: holidays.map(h => new Date(h.date + 'T00:00:00')),
                        }}
                        modifiersClassNames={{
                          holiday: 'text-red-500 font-bold',
                        }}
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
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
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

      {/* Upcoming Holidays */}
      {holidays.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <CalendarIcon className="w-5 h-5" />
              <span>Public Holidays — {new Date().getFullYear()}</span>
            </CardTitle>
            <CardDescription>
              Configured weekend days are weekly offs. These public holidays are also non-working days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {holidays.map((h) => {
                const hDate = new Date(h.date + 'T00:00:00');
                const isPast = hDate < new Date(new Date().toDateString());
                return (
                  <div
                    key={h.date}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border text-sm",
                      isPast
                        ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60"
                        : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                    )}
                  >
                    <div className={cn(
                      "text-center leading-tight shrink-0 w-10",
                      isPast ? "text-gray-400 dark:text-gray-500" : "text-red-600 dark:text-red-400"
                    )}>
                      <div className="text-lg font-bold">{hDate.getDate()}</div>
                      <div className="text-[10px] uppercase">
                        {hDate.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        "font-medium truncate",
                        isPast
                          ? "text-gray-500 dark:text-gray-400"
                          : "text-gray-800 dark:text-gray-200"
                      )}>
                        {h.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {hDate.toLocaleDateString('en-US', { weekday: 'long' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{leave.reason}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {leave.leave_type === 'unpaid' ? 'Unpaid' : 'Paid'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      {leave.working_days > 0 && (
                        <span className="ml-1 text-xs">({leave.working_days} working day{leave.working_days !== 1 ? 's' : ''})</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Requested on {leave.created_at ? formatDate(leave.created_at) : 'N/A'}
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
