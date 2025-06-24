
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Calendar, MapPin, User, FileText } from 'lucide-react';
import type { AdminLeave, AdminTour, Employee } from '../../services/adminService';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AdminLeave | AdminTour | Employee | null;
  type: 'leave' | 'tour' | 'employee';
  onStatusUpdate?: (id: number, status: 'approved' | 'rejected') => void;
  loading?: boolean;
}

export const DetailModal = ({ 
  isOpen, 
  onClose, 
  data, 
  type, 
  onStatusUpdate, 
  loading = false 
}: DetailModalProps) => {
  if (!data) return null;

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
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderLeaveDetails = (leave: AdminLeave) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Leave Request Details</h3>
        <Badge className={getStatusColor(leave.status)}>
          {leave.status}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Employee ID:</span>
          </div>
          <p className="text-sm text-gray-600">{leave.user_id}</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Duration:</span>
          </div>
          <p className="text-sm text-gray-600">
            {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Reason:</span>
        </div>
        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          {leave.reason || 'No reason provided'}
        </p>
      </div>

      {leave.status === 'pending' && onStatusUpdate && (
        <>
          <Separator />
          <div className="flex space-x-3">
            <Button
              onClick={() => onStatusUpdate(leave.id, 'approved')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => onStatusUpdate(leave.id, 'rejected')}
              disabled={loading}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderTourDetails = (tour: AdminTour) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tour Request Details</h3>
        <Badge className={getStatusColor(tour.status)}>
          {tour.status}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Employee ID:</span>
          </div>
          <p className="text-sm text-gray-600">{tour.user_id}</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Location:</span>
          </div>
          <p className="text-sm text-gray-600">{tour.location}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Duration:</span>
        </div>
        <p className="text-sm text-gray-600">
          {formatDate(tour.start_date)} - {formatDate(tour.end_date)}
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Reason:</span>
        </div>
        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          {tour.reason || 'No reason provided'}
        </p>
      </div>

      {tour.status === 'pending' && onStatusUpdate && (
        <>
          <Separator />
          <div className="flex space-x-3">
            <Button
              onClick={() => onStatusUpdate(tour.id, 'approved')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => onStatusUpdate(tour.id, 'rejected')}
              disabled={loading}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderEmployeeDetails = (employee: Employee) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Employee Details</h3>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <span className="text-sm font-medium">Name:</span>
          <p className="text-sm text-gray-600">{employee.name}</p>
        </div>
        
        <div className="space-y-2">
          <span className="text-sm font-medium">Email:</span>
          <p className="text-sm text-gray-600">{employee.email}</p>
        </div>
        
        <div className="space-y-2">
          <span className="text-sm font-medium">Employee ID:</span>
          <p className="text-sm text-gray-600">{employee.id}</p>
        </div>
        
        <div className="space-y-2">
          <span className="text-sm font-medium">Joined:</span>
          <p className="text-sm text-gray-600">{formatDate(employee.created_at)}</p>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === 'leave' && 'Leave Request'}
            {type === 'tour' && 'Tour Request'}
            {type === 'employee' && 'Employee Information'}
          </DialogTitle>
        </DialogHeader>
        
        {type === 'leave' && renderLeaveDetails(data as AdminLeave)}
        {type === 'tour' && renderTourDetails(data as AdminTour)}
        {type === 'employee' && renderEmployeeDetails(data as Employee)}
      </DialogContent>
    </Dialog>
  );
};
