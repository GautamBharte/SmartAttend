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
    const userData = localStorage.getItem('user');
    
    console.log('Found token:', !!token);
    console.log('Found user data:', !!userData);
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('Parsed user:', parsedUser);
        
        // Verify token is still valid by fetching fresh profile
        try {
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
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  };

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      console.log('Login attempt with credentials:', credentials);
      const response = await DualModeService.login(credentials);
      console.log('Login response received:', response);
      
      // Store authentication data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      console.log('Setting user state:', response.user);
      setUser(response.user);
      setIsAuthenticated(true);
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
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

  // Global error handler for API calls
  const handleApiError = (error: any) => {
    console.error('API Error:', error);
    
    // Check if it's a 401 (Unauthorized) or 404 error indicating expired token
    if (error.status === 401 || error.status === 404 || error.message?.includes('401') || error.message?.includes('404')) {
      console.log('API key expired or unauthorized, clearing cache and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Add global error handling
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response.status === 401 || response.status === 404) {
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
