
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DualModeService } from '@/services/dualModeService';
import { toast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';

export const AddEmployeeForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await DualModeService.register(employeeData);
      toast({ 
        title: 'Employee added successfully!', 
        description: `${employeeData.name} has been added to the system` 
      });
      setEmployeeData({ name: '', email: '', password: '', role: 'employee' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to add employee', 
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="w-5 h-5" />
          <span>Add New Employee</span>
        </CardTitle>
        <CardDescription>Create a new employee account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={employeeData.name}
                onChange={(e) => setEmployeeData({...employeeData, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={employeeData.email}
                onChange={(e) => setEmployeeData({...employeeData, email: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create password"
                value={employeeData.password}
                onChange={(e) => setEmployeeData({...employeeData, password: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={employeeData.role} onValueChange={(value) => setEmployeeData({...employeeData, role: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Employee
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
