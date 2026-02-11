
import { authService } from './authService';

const API_BASE_URL = 'http://localhost:8000';

export interface Employee {
  id: number;
  name: string;
  email: string;
  created_at: string;
  today_status: 'checked_in' | 'checked_out' | 'absent';
  check_in_time: string | null;
  check_out_time: string | null;
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

  async bulkUploadEmployees(file: File): Promise<BulkUploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/admin/employees/bulk-upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }, // no Content-Type — FormData sets it
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Bulk upload failed');
    }
    return data;
  }

  getCsvTemplateUrl(): string {
    return `${API_BASE_URL}/admin/employees/csv-template`;
  }

  async sendDailyReport(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/send-daily-report`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send daily report');
    }
    return data;
  }

  getPreviewReportUrl(): string {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/admin/preview-daily-report?token=${token}`;
  }
}

export interface BulkUploadResult {
  message: string;
  created: { row: number; email: string; name: string }[];
  skipped: { row: number; email: string; reason: string }[];
  errors: { row: number; email: string; reason: string }[];
  summary: {
    total_rows: number;
    created: number;
    skipped: number;
    errors: number;
  };
}

export const adminService = new AdminService();
