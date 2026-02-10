
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, FileText, CheckCircle, XCircle, Mail, Eye, Send, Loader2, ExternalLink, AlertCircle, Clock } from 'lucide-react';
import { adminService, type SearchFilters, type AdminLeave, type AdminTour, type Employee } from '../..//services/adminService';
import { AdminSearchFilters } from './AdminSearchFilters';
import { DetailModal } from './DetailModal';
import { AddEmployeeForm } from './AddEmployeeForm';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { OFFICE } from '@/config/api';

/* ─── Daily Report Section ──────────────────────────────────────────── */

/** Returns true when the current time in the office timezone falls within office hours. */
function isWithinOfficeHours(): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone: OFFICE.TIMEZONE,
  });
  const parts = formatter.formatToParts(now);
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
  const currentMinutes = h * 60 + m;

  const [startH, startM] = OFFICE.START.split(':').map(Number);
  const [endH, endM] = OFFICE.END.split(':').map(Number);
  return currentMinutes >= startH * 60 + startM && currentMinutes < endH * 60 + endM;
}

const DailyReportSection = () => {
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [outsideOfficeHours, setOutsideOfficeHours] = useState(!isWithinOfficeHours());

  // Re-check every 60 s so the button enables/disables without a reload
  useEffect(() => {
    const id = setInterval(() => setOutsideOfficeHours(!isWithinOfficeHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleSend = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await adminService.sendDailyReport();
      setSendResult({ ok: true, message: res.message });
      toast({ title: 'Report Sent!', description: res.message });
    } catch (err: any) {
      setSendResult({ ok: false, message: err.message });
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    setPreviewHtml(null);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`http://localhost:8000/admin/preview-daily-report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Failed to load preview');
      const html = await resp.text();
      setPreviewHtml(html);
    } catch (err: any) {
      toast({ title: 'Preview Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const openInNewTab = () => {
    window.open(adminService.getPreviewReportUrl(), '_blank');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Daily Attendance Report
          </CardTitle>
          <CardDescription>
            Preview or manually send today's attendance report email. The report is also sent
            automatically every day at 10:00 PM (office timezone).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={loadingPreview}
            >
              {loadingPreview ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Preview Report
            </Button>

            <Button
              variant="outline"
              onClick={openInNewTab}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>

            <div className="relative group inline-block">
              <Button
                onClick={handleSend}
                disabled={sending || !outsideOfficeHours}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Report Now
              </Button>
              {!outsideOfficeHours && (
                <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                  <div className="relative px-3 py-1.5 text-xs text-white bg-gray-800 rounded-md shadow-sm whitespace-nowrap">
                    Available after office hours ({OFFICE.END})
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-800" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* During office hours banner */}
          {!outsideOfficeHours && (
            <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>
                Sending is available after office hours (after <strong>{OFFICE.END}</strong>).
                You can still preview the report.
              </span>
            </div>
          )}

          {/* Send result banner */}
          {sendResult && (
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${sendResult.ok
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
                }`}
            >
              {sendResult.ok ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {sendResult.message}
            </div>
          )}

          {/* Inline preview */}
          {previewHtml && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Report Preview</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewHtml(null)}
                  className="text-xs text-gray-500"
                >
                  Close Preview
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden bg-gray-50">
                <iframe
                  srcDoc={previewHtml}
                  title="Daily Report Preview"
                  className="w-full border-0"
                  style={{ minHeight: '600px' }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
            <p className="font-medium mb-1">ℹ️ About the Daily Report</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Sent automatically every day at <strong>10:00 PM</strong> (office timezone). Manual send is available after office hours.</li>
              <li>Includes every employee's status: <strong>Present</strong> or <strong>Absent</strong>.</li>
              <li>Shows entry &amp; exit times for present employees.</li>
              <li>Recipients are configured via the <code className="bg-blue-100 px-1 rounded">REPORT_RECIPIENTS</code> env var.</li>
              <li>Requires SMTP settings (<code className="bg-blue-100 px-1 rounded">SMTP_HOST</code>, <code className="bg-blue-100 px-1 rounded">SMTP_USER</code>, <code className="bg-blue-100 px-1 rounded">SMTP_PASS</code>) in <code className="bg-blue-100 px-1 rounded">.env</code>.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const AdminPanel = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<AdminLeave[]>([]);
  const [tours, setTours] = useState<AdminTour[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [employeeFilters, setEmployeeFilters] = useState<SearchFilters>({});
  const [leaveFilters, setLeaveFilters] = useState<SearchFilters>({});
  const [tourFilters, setTourFilters] = useState<SearchFilters>({});

  // Modal states
  const [selectedItem, setSelectedItem] = useState<AdminLeave | AdminTour | Employee | null>(null);
  const [modalType, setModalType] = useState<'leave' | 'tour' | 'employee' | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchLeaves();
    fetchTours();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [employeeFilters]);

  useEffect(() => {
    fetchLeaves();
  }, [leaveFilters]);

  useEffect(() => {
    fetchTours();
  }, [tourFilters]);

  const fetchEmployees = async () => {
    try {
      const data = await adminService.getEmployees(employeeFilters);
      setEmployees(data);
    } catch (error: any) {
      console.error('Failed to fetch employees:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch employees',
        variant: 'destructive'
      });
    }
  };

  const fetchLeaves = async () => {
    try {
      const data = await adminService.getLeaves(leaveFilters);
      // Add employee names to leaves
      const leavesWithNames = data.map(leave => ({
        ...leave,
        employee_name: employees.find(emp => emp.id === leave.user_id)?.name || 'Unknown Employee'
      }));
      setLeaves(leavesWithNames);
    } catch (error: any) {
      console.error('Failed to fetch leaves:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch leaves',
        variant: 'destructive'
      });
    }
  };

  const fetchTours = async () => {
    try {
      const data = await adminService.getTours(tourFilters);
      // Add employee names to tours
      const toursWithNames = data.map(tour => ({
        ...tour,
        employee_name: employees.find(emp => emp.id === tour.user_id)?.name || 'Unknown Employee'
      }));
      setTours(toursWithNames);
    } catch (error: any) {
      console.error('Failed to fetch tours:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch tours',
        variant: 'destructive'
      });
    }
  };

  const handleStatusUpdate = async (id: number, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      if (modalType === 'leave') {
        await adminService.updateLeaveStatus(id, status);
        toast({
          title: `Leave ${status}!`,
          description: 'Status updated successfully'
        });
        fetchLeaves();
      } else if (modalType === 'tour') {
        await adminService.updateTourStatus(id, status);
        toast({
          title: `Tour ${status}!`,
          description: 'Status updated successfully'
        });
        fetchTours();
      }
      setModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const openDetailModal = (item: AdminLeave | AdminTour | Employee, type: 'leave' | 'tour' | 'employee') => {
    setSelectedItem(item);
    setModalType(type);
    setModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const pendingLeaves = leaves.filter(leave => leave.status === 'pending');
  const pendingTours = tours.filter(tour => tour.status === 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-1">Manage employees, leaves, and tour requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLeaves.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tours</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTours.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaves.length + tours.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          <TabsTrigger value="tours">Tour Requests</TabsTrigger>
          <TabsTrigger value="add-employee">Add Employee</TabsTrigger>
          <TabsTrigger value="daily-report">
            <Mail className="w-4 h-4 mr-1.5" />
            Daily Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <AdminSearchFilters
            filters={employeeFilters}
            onFiltersChange={setEmployeeFilters}
          />

          <Card>
            <CardHeader>
              <CardTitle>Employee Management</CardTitle>
              <CardDescription>View and manage all employees</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{formatDate(employee.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailModal(employee, 'employee')}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {employees.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No employees found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <AdminSearchFilters
            filters={leaveFilters}
            onFiltersChange={setLeaveFilters}
            showUserFilter={true}
            employees={employees}
          />

          <Card>
            <CardHeader>
              <CardTitle>Leave Requests</CardTitle>
              <CardDescription>Review and manage leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">{leave.employee_name}</TableCell>
                      <TableCell>
                        {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(leave.status)}>
                          {leave.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailModal(leave, 'leave')}
                          >
                            View Details
                          </Button>
                          {leave.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(leave.id, 'approved')}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                                disabled={loading}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {leaves.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No leave requests found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tours" className="space-y-4">
          <AdminSearchFilters
            filters={tourFilters}
            onFiltersChange={setTourFilters}
            showUserFilter={true}
            employees={employees}
          />

          <Card>
            <CardHeader>
              <CardTitle>Tour Requests</CardTitle>
              <CardDescription>Review and manage tour requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tours.map((tour) => (
                    <TableRow key={tour.id}>
                      <TableCell className="font-medium">{tour.employee_name}</TableCell>
                      <TableCell>{tour.location}</TableCell>
                      <TableCell>
                        {formatDate(tour.start_date)} - {formatDate(tour.end_date)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(tour.status)}>
                          {tour.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailModal(tour, 'tour')}
                          >
                            View Details
                          </Button>
                          {tour.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(tour.id, 'approved')}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusUpdate(tour.id, 'rejected')}
                                disabled={loading}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {tours.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No tour requests found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add-employee" className="space-y-4">
          <AddEmployeeForm onEmployeeAdded={fetchEmployees} />
        </TabsContent>

        <TabsContent value="daily-report" className="space-y-4">
          <DailyReportSection />
        </TabsContent>
      </Tabs>

      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={selectedItem}
        type={modalType!}
        onStatusUpdate={handleStatusUpdate}
        loading={loading}
      />
    </div>
  );
};
