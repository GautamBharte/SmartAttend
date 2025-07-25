
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus } from 'lucide-react';
import { requestService } from '@/services/requestService';
import { toast } from '@/hooks/use-toast';

export const TourRequests = () => {
  const [tourHistory, setTourHistory] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    location: '',
    reason: ''
  });

  useEffect(() => {
    fetchTourHistory();
  }, []);

  const fetchTourHistory = async () => {
    try {
      const history = await requestService.getTourHistory();
      setTourHistory(history || []);
    } catch (error) {
      console.error('Failed to fetch tour history:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await requestService.applyTour(formData);
      toast({ title: 'Tour request submitted!', description: 'Your request is pending approval' });
      setFormData({ start_date: '', end_date: '', location: '', reason: '' });
      setShowForm(false);
      fetchTourHistory();
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tour Requests</h1>
          <p className="text-gray-600 mt-1">Apply for business tours and track your requests</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Apply for Tour</CardTitle>
            <CardDescription>Submit a new tour request</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Enter destination/location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Purpose/Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide the purpose of your tour"
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
            <FileText className="w-5 h-5" />
            <span>Tour History</span>
          </CardTitle>
          <CardDescription>Your submitted tour requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tourHistory.length > 0 ? (
              tourHistory.map((tour: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{tour.location}</p>
                    <p className="text-sm text-gray-600 mt-1">{tour.reason}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(tour.start_date)} - {formatDate(tour.end_date)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Requested on {formatDate(tour.created_at)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(tour.status)}>
                    {tour.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No tour requests yet</p>
                <p className="text-sm">Click "New Request" to apply for a tour</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
