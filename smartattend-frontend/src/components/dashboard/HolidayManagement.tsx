import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { adminService, type Holiday } from '@/services/adminService';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6]; // Python weekday: Monday=0, Sunday=6

export const HolidayManagement = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    date: '',
    name: '',
    type: 'gazetted',
  });
  const [weekendDays, setWeekendDays] = useState<number[]>([6]); // Default: Sunday only
  const [savingWeekend, setSavingWeekend] = useState(false);

  useEffect(() => {
    fetchHolidays();
    fetchWeekendConfig();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    try {
      const data = await adminService.getHolidays(selectedYear);
      setHolidays(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch holidays',
        variant: 'destructive',
      });
    }
  };

  const fetchWeekendConfig = async () => {
    try {
      const config = await adminService.getWeekendConfig();
      setWeekendDays(config.weekend_days);
    } catch (error: any) {
      console.error('Failed to fetch weekend config:', error);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.name) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await adminService.addHoliday(newHoliday);
      toast({ title: 'Success', description: 'Holiday added successfully' });
      setNewHoliday({ date: '', name: '', type: 'gazetted' });
      setShowAddForm(false);
      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add holiday',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    setLoading(true);
    try {
      await adminService.deleteHoliday(id);
      toast({ title: 'Success', description: 'Holiday deleted successfully' });
      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete holiday',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleSeedHolidays = async () => {
    if (!confirm(`Seed default Indian public holidays for ${selectedYear}?`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await adminService.seedHolidays(selectedYear);
      toast({ title: 'Success', description: result.message });
      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to seed holidays',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleUpdateWeekend = async () => {
    setSavingWeekend(true);
    try {
      await adminService.updateWeekendConfig(weekendDays);
      toast({ title: 'Success', description: 'Weekend configuration updated successfully' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update weekend configuration',
        variant: 'destructive',
      });
    }
    setSavingWeekend(false);
  };

  const toggleWeekendDay = (day: number) => {
    if (weekendDays.includes(day)) {
      setWeekendDays(weekendDays.filter(d => d !== day));
    } else {
      setWeekendDays([...weekendDays, day].sort());
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      weekday: 'long',
    });
  };

  return (
    <div className="space-y-6">
      {/* Weekend Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Weekend Configuration
          </CardTitle>
          <CardDescription>
            Select which days of the week are considered weekends (non-working days).
            These days will be excluded from working day calculations for leave requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DAY_NAMES.map((dayName, index) => {
              const dayValue = DAY_VALUES[index];
              const isWeekend = weekendDays.includes(dayValue);
              return (
                <label
                  key={dayValue}
                  className={cn(
                    "flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors",
                    isWeekend
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isWeekend}
                    onChange={() => toggleWeekendDay(dayValue)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className={cn(
                    "text-sm font-medium",
                    isWeekend ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"
                  )}>
                    {dayName}
                  </span>
                </label>
              );
            })}
          </div>
          <Button
            onClick={handleUpdateWeekend}
            disabled={savingWeekend}
            className="w-full md:w-auto"
          >
            {savingWeekend ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Weekend Configuration
              </>
            )}
          </Button>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">ℹ️ Note</p>
            <p>
              Currently selected: <strong>{weekendDays.map(d => DAY_NAMES[DAY_VALUES.indexOf(d)]).join(', ')}</strong>
            </p>
            <p className="mt-1 text-xs">
              Working days calculation will exclude these days along with public holidays.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Holidays Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Public Holidays — {selectedYear}
              </CardTitle>
              <CardDescription>
                Manage public holidays. These are automatically excluded from working day calculations.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {[2024, 2025, 2026, 2027, 2028].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedHolidays}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Seed Default
              </Button>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Holiday
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && (
            <Card className="bg-gray-50 dark:bg-gray-800/50">
              <CardHeader>
                <CardTitle className="text-lg">Add New Holiday</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddHoliday} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newHoliday.date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newHoliday.date
                              ? format(new Date(newHoliday.date + 'T00:00:00'), 'PPP')
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newHoliday.date ? new Date(newHoliday.date + 'T00:00:00') : undefined}
                            onSelect={(date) =>
                              setNewHoliday({...newHoliday, date: date ? format(date, 'yyyy-MM-dd') : ''})
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <select
                        value={newHoliday.type}
                        onChange={(e) => setNewHoliday({...newHoliday, type: e.target.value})}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                      >
                        <option value="gazetted">Gazetted Holiday</option>
                        <option value="restricted">Restricted Holiday</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Holiday Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Republic Day, Diwali"
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex space-x-3">
                    <Button type="submit" disabled={loading}>
                      Add Holiday
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewHoliday({ date: '', name: '', type: 'gazetted' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {holidays.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">
                      {formatDate(holiday.date)}
                    </TableCell>
                    <TableCell>{holiday.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {holiday.type === 'gazetted' ? 'Gazetted' : 'Restricted'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>No holidays found for {selectedYear}</p>
              <p className="text-sm mt-1">Click "Seed Default" to add Indian public holidays</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

