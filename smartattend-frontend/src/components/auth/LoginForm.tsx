
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { DualModeService } from '@/services/dualModeService';
import { Loader2, Building2 } from 'lucide-react';

interface LoginFormProps {
  onLogin: (credentials: { email: string; password: string }) => Promise<any>;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'employee' 
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Attempting login with:', loginData);
      const response = await onLogin(loginData);
      console.log('Login response:', response);
      toast({ title: 'Login successful!', description: 'Welcome back!' });
    } catch (error: any) {
      console.error('Login error:', error);
      toast({ 
        title: 'Login failed', 
        description: error.message || 'Invalid credentials',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await DualModeService.register(registerData);
      toast({ 
        title: 'Registration successful!', 
        description: 'Please login with your credentials' 
      });
    } catch (error: any) {
      toast({ 
        title: 'Registration failed', 
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AttendanceHub</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Employee Attendance Management System</p>
        </div>

        <Card className="border-0 shadow-xl dark:bg-gray-800">
          <CardHeader className="text-center pb-2">
            <CardTitle className="dark:text-white">Welcome</CardTitle>
            <CardDescription className="dark:text-gray-400">Access your attendance dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="dark:text-white">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                      required
                      className="dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="dark:text-white">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      required
                      className="dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="dark:text-white">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                      required
                      className="dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="dark:text-white">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="Enter your email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      required
                      className="dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="dark:text-white">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Create a password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      required
                      className="dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="dark:text-white">Role</Label>
                    <select
                      id="role"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      value={registerData.role}
                      onChange={(e) => setRegisterData({...registerData, role: e.target.value})}
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Register
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
