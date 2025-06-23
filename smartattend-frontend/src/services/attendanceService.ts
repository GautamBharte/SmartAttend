
import { authService } from './authService';

const API_BASE_URL = 'http://localhost:8000';

class AttendanceService {
  async checkIn() {
    const response = await fetch(`${API_BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Check-in failed');
    }

    return response.json();
  }

  async checkOut() {
    const response = await fetch(`${API_BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Check-out failed');
    }

    return response.json();
  }

  async getHistory() {
    const response = await fetch(`${API_BASE_URL}/attendance/history`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch attendance history');
    }

    return response.json();
  }
}

export const attendanceService = new AttendanceService();
