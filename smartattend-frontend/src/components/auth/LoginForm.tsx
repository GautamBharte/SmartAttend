
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { DualModeService } from '@/services/dualModeService';
import { Loader2, Building2 } from 'lucide-react';

interface LoginFormProps {
  onLogin: (credentials: { email: string; password: string }) => Promise<any>;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [forgotPasswordData, setForgotPasswordData] = useState({ email: '' });
  const [resetPasswordData, setResetPasswordData] = useState({ 
    email: '', 
    new_password: '',
    reset_token: ''
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await DualModeService.forgotPassword(forgotPasswordData.email);
      setResetToken(response.reset_token || '');
      setResetPasswordData({ ...resetPasswordData, email: forgotPasswordData.email });
      setShowResetPassword(true);
      toast({ 
        title: 'Reset token generated!', 
        description: 'Please use the token to reset your password' 
      });
    } catch (error: any) {
      toast({ 
        title: 'Failed to generate reset token', 
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await DualModeService.resetPassword({
        email: resetPasswordData.email,
        new_password: resetPasswordData.new_password
      });
      toast({ 
        title: 'Password reset successful!', 
        description: 'Please login with your new password' 
      });
      setShowForgotPassword(false);
      setShowResetPassword(false);
      setResetToken('');
      setForgotPasswordData({ email: '' });
      setResetPasswordData({ email: '', new_password: '', reset_token: '' });
    } catch (error: any) {
      toast({ 
        title: 'Password reset failed', 
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Enter your new password</p>
          </div>

          <Card className="border-0 shadow-xl dark:bg-gray-800">
            <CardHeader className="text-center pb-2">
              <CardTitle className="dark:text-white">Reset Your Password</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Reset Token: <span className="font-mono text-sm">{resetToken}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="dark:text-white">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter your new password"
                    value={resetPasswordData.new_password}
                    onChange={(e) => setResetPasswordData({...resetPasswordData, new_password: e.target.value})}
                    required
                    className="dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reset Password
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowResetPassword(false);
                      setShowForgotPassword(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Forgot Password</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Reset your password</p>
          </div>

          <Card className="border-0 shadow-xl dark:bg-gray-800">
            <CardHeader className="text-center pb-2">
              <CardTitle className="dark:text-white">Reset Password</CardTitle>
              <CardDescription className="dark:text-gray-400">Enter your email to get reset token</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="dark:text-white">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="Enter your email"
                    value={forgotPasswordData.email}
                    onChange={(e) => setForgotPasswordData({...forgotPasswordData, email: e.target.value})}
                    required
                    className="dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Get Reset Token
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <CardTitle className="dark:text-white">Welcome Back</CardTitle>
            <CardDescription className="dark:text-gray-400">Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
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
                Sign In
              </Button>
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Forgot your password?
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
