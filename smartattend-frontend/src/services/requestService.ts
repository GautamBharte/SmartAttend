import { authService } from './authService';

const API_BASE_URL = 'http://localhost:8000';

class RequestService {
  async applyLeave(leaveData: { start_date: string; end_date: string; reason: string }) {
    const response = await fetch(`${API_BASE_URL}/request/leave/apply`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(leaveData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit leave request');
    }

    return response.json();
  }

  async applyTour(tourData: { start_date: string; end_date: string; location: string; reason: string }) {
    const response = await fetch(`${API_BASE_URL}/request/tour/apply`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(tourData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit tour request');
    }

    return response.json();
  }

  async getLeaveHistory() {
    const response = await fetch(`${API_BASE_URL}/request/leave`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch leave history');
    }

    return response.json();
  }

  async getTourHistory() {
    const response = await fetch(`${API_BASE_URL}/request/tour`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch tour history');
    }

    return response.json();
  }

  async updateLeaveStatus(leaveId: number, status: string) {
    const response = await fetch(`${API_BASE_URL}/request/leave/${leaveId}/status`, {
      method: 'PATCH',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update leave status');
    }

    return response.json();
  }

  async updateTourStatus(tourId: number, status: string) {
    const response = await fetch(`${API_BASE_URL}/request/tour/${tourId}/status`, {
      method: 'PATCH',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update tour status');
    }

    return response.json();
  }
}

export const requestService = new RequestService();
