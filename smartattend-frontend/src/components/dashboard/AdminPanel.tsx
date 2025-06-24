
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';
import { adminService, type SearchFilters, type AdminLeave, type AdminTour, type Employee } from '../..//services/adminService';
import { AdminSearchFilters } from './AdminSearchFilters';
import { DetailModal } from './DetailModal';
import { AddEmployeeForm } from './AddEmployeeForm';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

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
          <AddEmployeeForm />
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
