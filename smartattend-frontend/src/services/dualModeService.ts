import { USE_DUMMY_API, API_CONFIG } from '@/config/api';
import { mockUsers, mockEmployees, mockAttendanceHistory, mockLeaveRequests, mockTourRequests } from '@/data/mockData';

// Simulate API delay for dummy mode
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class DualModeService {
  // Current user state for dummy mode
  private static currentUser: any = null;
  private static token: string | null = null;

  static async login(credentials: { email: string; password: string }) {
    console.log('DualModeService.login called with:', credentials);
    console.log('USE_DUMMY_API:', USE_DUMMY_API);
    
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      
      const user = mockUsers[credentials.email as keyof typeof mockUsers];
      console.log('Found user in mock data:', user);
      
      if (!user || user.password !== credentials.password) {
        throw new Error('Invalid credentials');
      }
      
      const { password, ...userWithoutPassword } = user;
      this.currentUser = userWithoutPassword;
      this.token = `dummy_token_${user.id}`;
      
      const response = {
        user: userWithoutPassword,
        token: this.token
      };
      
      console.log('Dummy mode login response:', response);
      return response;
    } else {
      // Real API call
      console.log('Making real API call to:', `${API_CONFIG.BASE_URL}/auth/login`);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      
      console.log('Real API response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Real API login error:', error);
        throw new Error(error.message || 'Login failed');
      }
      
      const result = await response.json();
      console.log('Real API login success:', result);
      return result;
    }
  }

  static async getProfile() {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      
      // Get current user from localStorage if available
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
      
      return this.currentUser;
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/profile`, {
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    }
  }

  static async updateProfile(profileData: { name: string; email: string }) {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      
      // Update stored user data
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const updatedUser = { ...user, ...profileData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { message: 'Profile updated successfully' };
      }
      
      return { message: 'Profile updated successfully' };
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    }
  }

  static async register(userData: { name: string; email: string; password: string; role?: string }) {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      
      if (mockUsers[userData.email as keyof typeof mockUsers]) {
        throw new Error('User already exists');
      }
      
      const newUser = {
        id: Object.keys(mockUsers).length + 1,
        ...userData,
        role: userData.role || 'employee'
      };
      
      // In real app, this would persist to storage
      return { message: 'User registered successfully' };
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return response.json();
    }
  }

  static async forgotPassword(email: string) {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      
      const user = Object.values(mockUsers).find(u => u.email === email);
      if (!user) {
        throw new Error('User not found');
      }
      
      return { 
        message: 'Reset token generated', 
        reset_token: 'dummy_reset_token_123456' 
      };
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate reset token');
      }
      
      return response.json();
    }
  }

  static async resetPassword(data: { email: string; new_password: string }) {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      
      const user = Object.values(mockUsers).find(u => u.email === data.email);
      if (!user) {
        throw new Error('User not found');
      }
      
      return { message: 'Password reset successfully' };
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
      }
      
      return response.json();
    }
  }

  static async getAttendanceStatus() {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      
      // Mock attendance status based on time of day for more realistic behavior
      const hour = new Date().getHours();
      const hasCheckedIn = hour >= 9; // Assume work starts at 9 AM
      const hasCheckedOut = hour >= 17 && hasCheckedIn; // Work ends at 5 PM
      
      if (!hasCheckedIn) {
        return { status: 'not_checked_in' };
      } else if (hasCheckedIn && !hasCheckedOut) {
        return { 
          status: 'checked_in_only',
          check_in_time: new Date(Date.now() - (hour - 9) * 60 * 60 * 1000).toISOString()
        };
      } else {
        return {
          status: 'checked_in_and_out',
          check_in_time: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          check_out_time: new Date().toISOString()
        };
      }
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/attendance/status`, {
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch attendance status');
      return response.json();
    }
  }

  static async getEmployees() {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      return mockEmployees;
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin/employees`, {
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json();
    }
  }

  static async checkIn() {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      return { message: 'Check-in successful', time: new Date().toISOString() };
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/attendance/check-in`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) throw new Error('Check-in failed');
      return response.json();
    }
  }

  static async checkOut() {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      return { message: 'Check-out successful', time: new Date().toISOString() };
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/attendance/check-out`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) throw new Error('Check-out failed');
      return response.json();
    }
  }

  static async getAttendanceHistory() {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      return mockAttendanceHistory;
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/attendance/history`, {
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch attendance history');
      return response.json();
    }
  }

  static async applyLeave(leaveData: { start_date: string; end_date: string; reason: string }) {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      return { message: 'Leave application submitted successfully' };
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/request/leave/apply`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(leaveData),
      });
      
      if (!response.ok) throw new Error('Failed to apply for leave');
      return response.json();
    }
  }

  static async applyTour(tourData: { start_date: string; end_date: string; location: string; reason: string }) {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      return { message: 'Tour application submitted successfully' };
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/request/tour/apply`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(tourData),
      });
      
      if (!response.ok) throw new Error('Failed to apply for tour');
      return response.json();
    }
  }

  static async getLeaveHistory() {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      return mockLeaveRequests;
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/request/leave`, {
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch leave history');
      return response.json();
    }
  }

  static async getTourHistory() {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      return mockTourRequests;
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/request/tour`, {
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch tour history');
      return response.json();
    }
  }

  static async updateLeaveStatus(leaveId: number, status: string) {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      return { message: `Leave request ${status} successfully` };
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/request/leave/${leaveId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) throw new Error('Failed to update leave status');
      return response.json();
    }
  }

  static async updateTourStatus(tourId: number, status: string) {
    if (USE_DUMMY_API) {
      await delay(API_CONFIG.DUMMY_DELAY);
      return { message: `Tour request ${status} successfully` };
    } else {
      const response = await fetch(`${API_CONFIG.BASE_URL}/request/tour/${tourId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) throw new Error('Failed to update tour status');
      return response.json();
    }
  }

  private static getAuthHeaders() {
    const token = USE_DUMMY_API ? this.token : localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
}
