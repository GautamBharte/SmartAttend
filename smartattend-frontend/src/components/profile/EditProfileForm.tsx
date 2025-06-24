
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DualModeService } from '@/services/dualModeService';
import { toast } from '@/hooks/use-toast';
import { Loader2, User } from 'lucide-react';

interface EditProfileFormProps {
  user: any;
  onProfileUpdate: (updatedUser: any) => void;
  onClose: () => void;
}

export const EditProfileForm = ({ user, onProfileUpdate, onClose }: EditProfileFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await DualModeService.updateProfile(profileData);
      const updatedUser = { ...user, ...profileData };
      onProfileUpdate(updatedUser);
      toast({ 
        title: 'Profile updated successfully!', 
        description: 'Your profile information has been saved' 
      });
      onClose();
    } catch (error: any) {
      toast({ 
        title: 'Failed to update profile', 
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5" />
          <span>Edit Profile</span>
        </CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              value={profileData.name}
              onChange={(e) => setProfileData({...profileData, name: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={profileData.email}
              onChange={(e) => setProfileData({...profileData, email: e.target.value})}
              required
            />
          </div>
          <div className="flex space-x-2">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
