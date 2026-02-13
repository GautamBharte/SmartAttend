
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DualModeService } from '@/services/dualModeService';
import { toast } from '@/hooks/use-toast';
import { Loader2, User, Lock, Mail, KeyRound, ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface EditProfileFormProps {
  user: any;
  onProfileUpdate: (updatedUser: any) => void;
  onClose: () => void;
}

/* ─── Reusable OTP input row ─────────────────────────────────────────── */
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
          className="w-11 h-12 text-center text-lg font-semibold"
        />
      ))}
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────────────── */

export const EditProfileForm = ({ user, onProfileUpdate, onClose }: EditProfileFormProps) => {
  // ── Name update (direct save) ──────────────────────────────────────
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === user?.name) return;
    setSavingName(true);
    try {
      await DualModeService.updateProfile({ name: name.trim(), email: user.email });
      onProfileUpdate({ ...user, name: name.trim() });
      toast({ title: 'Name updated!' });
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  // ── Email change (OTP to new email) ────────────────────────────────
  type EmailStep = 'view' | 'edit' | 'sending' | 'otp_sent' | 'verifying' | 'done';
  const [emailStep, setEmailStep] = useState<EmailStep>('view');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
  const [emailCountdown, setEmailCountdown] = useState(0);

  useEffect(() => {
    if (emailCountdown <= 0) return;
    const t = setTimeout(() => setEmailCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCountdown]);

  const handleRequestEmailOtp = async () => {
    if (!newEmail.trim() || newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      toast({ title: 'Same email', description: 'Please enter a different email.', variant: 'destructive' });
      return;
    }
    setEmailStep('sending');
    try {
      const res = await DualModeService.requestEmailOtp(newEmail.trim());
      toast({ title: 'OTP Sent', description: res.message });
      setEmailStep('otp_sent');
      setEmailCountdown(60);
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
      setEmailStep('edit');
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = emailOtp.join('');
    if (code.length !== 6) {
      toast({ title: 'Enter OTP', description: 'Please enter the 6-digit code.', variant: 'destructive' });
      return;
    }
    setEmailStep('verifying');
    try {
      const res = await DualModeService.verifyOtpChangeEmail(code, newEmail.trim());
      toast({ title: 'Email Updated!', description: res.message });
      onProfileUpdate({ ...user, email: res.email });
      setEmailStep('done');
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
      setEmailStep('otp_sent');
    }
  };

  const resetEmailFlow = () => {
    setEmailStep('view');
    setNewEmail('');
    setEmailOtp(['', '', '', '', '', '']);
  };

  // ── Password change (OTP flow) ─────────────────────────────────────
  type PwStep = 'idle' | 'sending' | 'otp_sent' | 'verifying' | 'done';
  const [pwStep, setPwStep] = useState<PwStep>('idle');
  const [pwOtp, setPwOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwCountdown, setPwCountdown] = useState(0);

  useEffect(() => {
    if (pwCountdown <= 0) return;
    const t = setTimeout(() => setPwCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [pwCountdown]);

  const handleRequestPwOtp = async () => {
    setPwStep('sending');
    try {
      const res = await DualModeService.requestOtp();
      toast({ title: 'OTP Sent', description: res.message });
      setPwStep('otp_sent');
      setPwCountdown(60);
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
      setPwStep('idle');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = pwOtp.join('');
    if (code.length !== 6) {
      toast({ title: 'Enter OTP', description: 'Please enter the 6-digit code.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Weak password', description: 'Min 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Mismatch', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    setPwStep('verifying');
    try {
      const res = await DualModeService.verifyOtpChangePassword(code, newPassword);
      toast({ title: 'Password Changed!', description: res.message });
      setPwStep('done');
      setPwOtp(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
      setPwStep('otp_sent');
    }
  };

  const resetPwFlow = () => {
    setPwStep('idle');
    setPwOtp(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
  };

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto p-1">
      {/* ── Name ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" /> Profile Name
        </CardTitle>
      </CardHeader>
      <CardContent>
          <form onSubmit={handleSaveName} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingName || name.trim() === user?.name} className="flex-1">
                {savingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Name
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Email (OTP to new email) ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5" /> Email Address
          </CardTitle>
          <CardDescription>
            A verification code will be sent to the new email
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailStep === 'done' ? (
            <SuccessBanner message="Email updated successfully!" onDone={resetEmailFlow} />
          ) : emailStep === 'view' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 border">
                <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setEmailStep('edit')}>
                Change Email
              </Button>
            </div>
          ) : emailStep === 'edit' || emailStep === 'sending' ? (
            <div className="space-y-4">
          <div className="space-y-2">
                <Label htmlFor="new-email">New Email Address</Label>
            <Input
                  id="new-email"
              type="email"
                  placeholder="you@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  We'll send a verification code to the new email address
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleRequestEmailOtp}
                  disabled={emailStep === 'sending' || !newEmail.trim()}
                  className="flex-1"
                >
                  {emailStep === 'sending' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Send Code
                </Button>
                <Button type="button" variant="outline" onClick={resetEmailFlow} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* otp_sent / verifying */
            <form onSubmit={handleVerifyEmailOtp} className="space-y-5">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Enter the code sent to <strong>{newEmail}</strong>
              </p>
              <OtpInput otp={emailOtp} setOtp={setEmailOtp} disabled={emailStep === 'verifying'} />
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  disabled={emailCountdown > 0 || emailStep === 'verifying'}
                  onClick={handleRequestEmailOtp}
                  className="text-xs"
                >
                  {emailCountdown > 0 ? `Resend in ${emailCountdown}s` : 'Resend Code'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={emailStep === 'verifying' || emailOtp.join('').length !== 6}
                  className="flex-1"
                >
                  {emailStep === 'verifying' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Verify & Update
                </Button>
                <Button type="button" variant="outline" onClick={resetEmailFlow} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Password (OTP to current email) ───────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="w-5 h-5" /> Change Password
          </CardTitle>
          <CardDescription>
            A verification code will be sent to your current email
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pwStep === 'done' ? (
            <SuccessBanner message="Password changed successfully!" onDone={resetPwFlow} />
          ) : pwStep === 'idle' || pwStep === 'sending' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  We'll send a 6-digit code to <strong>{user?.email}</strong>
                </p>
              </div>
              <Button
                onClick={handleRequestPwOtp}
                disabled={pwStep === 'sending'}
                className="w-full"
              >
                {pwStep === 'sending' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                Send Verification Code
              </Button>
            </div>
          ) : (
            /* otp_sent / verifying */
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <OtpInput otp={pwOtp} setOtp={setPwOtp} disabled={pwStep === 'verifying'} />
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={pwCountdown > 0 || pwStep === 'verifying'}
                    onClick={handleRequestPwOtp}
                    className="text-xs"
                  >
                    {pwCountdown > 0 ? `Resend in ${pwCountdown}s` : 'Resend Code'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-pw">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-pw"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
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

              <div className="space-y-2">
                <Label htmlFor="confirm-pw">Confirm Password</Label>
                <Input
                  id="confirm-pw"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={pwStep === 'verifying' || pwOtp.join('').length !== 6}
                  className="flex-1"
                >
                  {pwStep === 'verifying' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Change Password
            </Button>
                <Button type="button" variant="outline" onClick={resetPwFlow} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
          )}
      </CardContent>
    </Card>
    </div>
  );
};

/* ─── Shared success banner ──────────────────────────────────────────── */
const SuccessBanner = ({ message, onDone }: { message: string; onDone: () => void }) => (
  <div className="text-center py-4 space-y-3">
    <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
    </div>
    <p className="text-sm font-medium text-green-700 dark:text-green-400">{message}</p>
    <Button variant="outline" size="sm" onClick={onDone}>Done</Button>
  </div>
);
