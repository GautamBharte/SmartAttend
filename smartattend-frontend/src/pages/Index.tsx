import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { DualModeService } from '@/services/dualModeService';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Checking for existing authentication...');
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    const token = localStorage.getItem('token');

    console.log('Found token:', !!token);

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Verify token is still valid by fetching fresh profile from backend
      const freshProfile = await DualModeService.getProfile();
      console.log('Fresh profile fetched:', freshProfile);

      // Update stored user data with fresh profile
      localStorage.setItem('user', JSON.stringify(freshProfile));
      setUser(freshProfile);
      setIsAuthenticated(true);
    } catch (profileError) {
      console.error('Failed to fetch profile, token might be expired:', profileError);
      // Clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    }

    setLoading(false);
  };

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      console.log('Login attempt with credentials:', credentials);
      const response = await DualModeService.login(credentials);
      console.log('Login response received:', response);

      // Store token first
      localStorage.setItem('token', response.token);

      // If the backend returned a user object, use it; otherwise fetch the profile
      let userData = response.user;
      if (!userData) {
        console.log('No user data in login response, fetching profile...');
        userData = await DualModeService.getProfile();
      }

      console.log('Setting user state:', userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);

      return { ...response, user: userData };
    } catch (error) {
      console.error('Login failed:', error);
      // Clean up token if profile fetch failed after successful login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  };

  const handleLogout = () => {
    console.log('Logging out user...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleProfileUpdate = (updatedUser: any) => {
    console.log('Updating user profile:', updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // Global error handler for API calls — only 401 should invalidate the session
  const handleApiError = (error: any) => {
    console.error('API Error:', error);

    if (error.status === 401 || error.message?.includes('401')) {
      console.log('Token expired or unauthorized, clearing session and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Add global error handling — only intercept 401 (Unauthorized)
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response.status === 401) {
          handleApiError({ status: response.status });
        }
        return response;
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  console.log('Rendering Index - isAuthenticated:', isAuthenticated, 'user:', user);

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} />;
};

export default Index;
