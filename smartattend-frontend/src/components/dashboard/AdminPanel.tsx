
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';
import { requestService } from '@/services/requestService';
import { toast } from '@/hooks/use-toast';

export const AdminPanel = () => {
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [tourRequests, setTourRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllRequests();
  }, []);

  const fetchAllRequests = async () => {
    try {
      // For admin, we would need separate admin endpoints
      // For now, using the same endpoints as they might return all data for admin
      const [leaves, tours] = await Promise.all([
        requestService.getLeaveHistory(),
        requestService.getTourHistory(),
      ]);
      setLeaveRequests(leaves || []);
      setTourRequests(tours || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  };

  const handleLeaveStatusUpdate = async (leaveId: number, status: string) => {
    setLoading(true);
    try {
      await requestService.updateLeaveStatus(leaveId, status);
      toast({ 
        title: `Leave request ${status}!`, 
        description: 'Status updated successfully' 
      });
      fetchAllRequests();
    } catch (error: any) {
      toast({ 
        title: 'Failed to update status', 
        description: error.message,
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const handleTourStatusUpdate = async (tourId: number, status: string) => {
    setLoading(true);
    try {
      await requestService.updateTourStatus(tourId, status);
      toast({ 
        title: `Tour request ${status}!`, 
        description: 'Status updated successfully' 
      });
      fetchAllRequests();
    } catch (error: any) {
      toast({ 
        title: 'Failed to update status', 
        description: error.message,
        variant: 'destructive'
      });
    }
    setLoading(false);
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

  const pendingLeaves = leaveRequests.filter(req => req.status === 'pending');
  const pendingTours = tourRequests.filter(req => req.status === 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-1">Manage employee requests and attendance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLeaves.length}</div>
            <p className="text-xs text-muted-foreground">Require approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tours</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTours.length}</div>
            <p className="text-xs text-muted-foreground">Require approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leaves</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveRequests.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tours</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tourRequests.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leaves" className="w-full">
        <TabsList>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          <TabsTrigger value="tours">Tour Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="leaves" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leave Requests Management</CardTitle>
              <CardDescription>Review and approve employee leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaveRequests.length > 0 ? (
                  leaveRequests.map((leave: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{leave.employee_name || 'Unknown Employee'}</p>
                        <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(leave.status)}>
                          {leave.status}
                        </Badge>
                        {leave.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleLeaveStatusUpdate(leave.id, 'approved')}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleLeaveStatusUpdate(leave.id, 'rejected')}
                              disabled={loading}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No leave requests found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tour Requests Management</CardTitle>
              <CardDescription>Review and approve employee tour requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tourRequests.length > 0 ? (
                  tourRequests.map((tour: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{tour.employee_name || 'Unknown Employee'}</p>
                        <p className="text-sm text-gray-600 mt-1">{tour.location} - {tour.reason}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(tour.start_date)} - {formatDate(tour.end_date)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(tour.status)}>
                          {tour.status}
                        </Badge>
                        {tour.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleTourStatusUpdate(tour.id, 'approved')}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleTourStatusUpdate(tour.id, 'rejected')}
                              disabled={loading}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No tour requests found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
