
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { DualModeService } from '@/services/dualModeService';
import { Loader2, Building2, ArrowLeft, KeyRound, ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface LoginFormProps {
  onLogin: (credentials: { email: string; password: string }) => Promise<any>;
}

/* ─── Reusable OTP input row ──────────────────────────────────────────── */
interface OtpInputProps {
  otp: string[];
  setOtp: (v: string[]) => void;
  disabled?: boolean;
}
const OtpInput = ({ otp, setOtp, disabled }: OtpInputProps) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setOtp(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {otp.map((digit, i) => (
        <Input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className="w-11 h-12 text-center text-lg font-semibold dark:bg-gray-700 dark:text-white"
        />
      ))}
    </div>
  );
};

/* ─── Shared page wrapper (must be outside LoginForm to keep stable identity) */
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AttendanceHub</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Employee Attendance Management System</p>
      </div>
      {children}
    </div>
  </div>
);

/* ─── Main component ──────────────────────────────────────────────────── */

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // ── Forgot password OTP flow ────────────────────────────────────────
  type ForgotStep = 'hidden' | 'email' | 'sending' | 'otp' | 'verifying' | 'done';
  const [forgotStep, setForgotStep] = useState<ForgotStep>('hidden');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await onLogin(loginData);
      toast({ title: 'Login successful!', description: 'Welcome back!' });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotStep('sending');
    try {
      const res = await DualModeService.forgotPassword(forgotEmail.trim());
      toast({ title: 'OTP Sent', description: res.message });
      setForgotStep('otp');
      setCountdown(60);
    } catch (error: any) {
      toast({
        title: 'Failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
      setForgotStep('email');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = forgotOtp.join('');
    if (code.length !== 6) {
      toast({ title: 'Enter OTP', description: 'Please enter the 6-digit code.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Weak password', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Mismatch', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    setForgotStep('verifying');
    try {
      const res = await DualModeService.resetPassword({
        email: forgotEmail.trim(),
        otp: code,
        new_password: newPassword,
      });
      toast({ title: 'Password Reset!', description: res.message });
      setForgotStep('done');
    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
      setForgotStep('otp');
    }
  };

  const resetForgotFlow = () => {
    setForgotStep('hidden');
    setForgotEmail('');
    setForgotOtp(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setCountdown(0);
  };

  /* ── Forgot password: success screen ─────────────────────────────── */
  if (forgotStep === 'done') {
    return (
      <PageWrapper>
        <Card className="border-0 shadow-xl dark:bg-gray-800">
          <CardContent className="pt-8 pb-6">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Password Reset Successful</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  You can now sign in with your new password.
                </p>
              </div>
              <Button className="w-full" onClick={resetForgotFlow}>
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  /* ── Forgot password: OTP + new password form ────────────────────── */
  if (forgotStep === 'otp' || forgotStep === 'verifying') {
    return (
      <PageWrapper>
        <Card className="border-0 shadow-xl dark:bg-gray-800">
          <CardHeader className="text-center pb-2">
            <CardTitle className="dark:text-white">Reset Your Password</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Enter the 6-digit code sent to <strong>{forgotEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* OTP */}
              <div className="space-y-2">
                <Label className="dark:text-white">Verification Code</Label>
                <OtpInput otp={forgotOtp} setOtp={setForgotOtp} disabled={forgotStep === 'verifying'} />
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={countdown > 0 || forgotStep === 'verifying'}
                    onClick={() => handleSendOtp()}
                    className="text-xs"
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </Button>
                </div>
              </div>

              {/* New password */}
              <div className="space-y-2">
                <Label htmlFor="new-pw" className="dark:text-white">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-pw"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="dark:bg-gray-700 dark:text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-pw" className="dark:text-white">Confirm Password</Label>
                <Input
                  id="confirm-pw"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={forgotStep === 'verifying' || forgotOtp.join('').length !== 6}
                  className="flex-1"
                >
                  {forgotStep === 'verifying' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Reset Password
                </Button>
                <Button type="button" variant="outline" onClick={resetForgotFlow} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  /* ── Forgot password: enter email screen ─────────────────────────── */
  if (forgotStep === 'email' || forgotStep === 'sending') {
    return (
      <PageWrapper>
        <Card className="border-0 shadow-xl dark:bg-gray-800">
          <CardHeader className="text-center pb-2">
            <CardTitle className="dark:text-white">Forgot Password</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Enter your email and we'll send you a verification code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="dark:text-white">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="dark:bg-gray-700 dark:text-white"
                />
              </div>
              <Button type="submit" className="w-full" disabled={forgotStep === 'sending' || !forgotEmail.trim()}>
                {forgotStep === 'sending' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                Send Verification Code
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={resetForgotFlow}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  /* ── Default: Login screen ──────────────────────────────────────── */
  return (
    <PageWrapper>
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
              <div className="relative">
                <Input
                  id="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  required
                  className="dark:bg-gray-700 dark:text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setForgotStep('email')}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Forgot your password?
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageWrapper>
  );
};
