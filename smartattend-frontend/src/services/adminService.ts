
import { authService } from './authService';

const API_BASE_URL = 'http://localhost:8000';

export interface Employee {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AdminLeave {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  status: string;
  reason: string;
  employee_name?: string;
}

export interface AdminTour {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  location: string;
  status: string;
  reason: string;
  employee_name?: string;
}

export interface SearchFilters {
  search?: string;
  status?: string;
  orderBy?: string;
  direction?: 'asc' | 'desc';
  top?: number;
  skip?: number;
  user_id?: number;
}

class AdminService {
  private buildQueryParams(filters: SearchFilters): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });
    return params.toString();
  }

  async getEmployees(filters: SearchFilters = {}): Promise<Employee[]> {
    const queryParams = this.buildQueryParams(filters);
    const response = await fetch(`${API_BASE_URL}/admin/employees?${queryParams}`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch employees');
    }

    return response.json();
  }

  async getLeaves(filters: SearchFilters = {}): Promise<AdminLeave[]> {
    const queryParams = this.buildQueryParams(filters);
    const response = await fetch(`${API_BASE_URL}/admin/leaves?${queryParams}`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch leaves');
    }

    return response.json();
  }

  async getTours(filters: SearchFilters = {}): Promise<AdminTour[]> {
    const queryParams = this.buildQueryParams(filters);
    const response = await fetch(`${API_BASE_URL}/admin/tours?${queryParams}`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch tours');
    }

    return response.json();
  }

  async updateLeaveStatus(leaveId: number, status: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/request/leave/${leaveId}/status`, {
      method: 'PATCH',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update leave status');
    }
  }

  async updateTourStatus(tourId: number, status: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/request/tour/${tourId}/status`, {
      method: 'PATCH',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update tour status');
    }
  }
}

export const adminService = new AdminService();
