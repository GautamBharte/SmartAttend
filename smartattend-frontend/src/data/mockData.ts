
// Mock data for dummy API mode
export const mockUsers = {
    'admin@gmail.com': {
      id: 1,
      name: 'Admin User',
      email: 'admin@gmail.com',
      role: 'admin',
      password: 'admin123'
    },
    'john@example.com': {
      id: 2,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'employee',
      password: 'password123'
    },
    'jane@example.com': {
      id: 3,
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'employee',
      password: 'password123'
    }
  };
  
  export const mockEmployees = [
    { id: 2, name: 'John Doe', email: 'john@example.com', role: 'employee', status: 'active' },
    { id: 3, name: 'Jane Smith', email: 'jane@example.com', role: 'employee', status: 'active' },
    { id: 4, name: 'Bob Wilson', email: 'bob@example.com', role: 'employee', status: 'active' },
  ];
  
  export const mockAttendanceHistory = [
    {
      id: 1,
      date: '2025-06-20',
      check_in_time: '2025-06-20T09:00:00Z',
      check_out_time: '2025-06-20T18:00:00Z',
      hours_worked: 9
    },
    {
      id: 2,
      date: '2025-06-21',
      check_in_time: '2025-06-21T08:45:00Z',
      check_out_time: '2025-06-21T17:30:00Z',
      hours_worked: 8.75
    },
    {
      id: 3,
      date: '2025-06-22',
      check_in_time: '2025-06-22T09:15:00Z',
      check_out_time: null,
      hours_worked: null
    }
  ];
  
  export const mockLeaveRequests = [
    {
      id: 1,
      employee_id: 2,
      employee_name: 'John Doe',
      start_date: '2025-06-25',
      end_date: '2025-06-26',
      reason: 'Personal work',
      status: 'pending',
      applied_on: '2025-06-23T10:00:00Z'
    },
    {
      id: 2,
      employee_id: 3,
      employee_name: 'Jane Smith',
      start_date: '2025-06-28',
      end_date: '2025-06-29',
      reason: 'Family function',
      status: 'approved',
      applied_on: '2025-06-22T14:30:00Z'
    }
  ];
  
  export const mockTourRequests = [
    {
      id: 1,
      employee_id: 2,
      employee_name: 'John Doe',
      start_date: '2025-07-01',
      end_date: '2025-07-03',
      location: 'Delhi',
      reason: 'Client meeting',
      status: 'pending',
      applied_on: '2025-06-23T11:00:00Z'
    }
  ];
  
  // Generate calendar data for the last 6 months
  export const generateCalendarData = () => {
    const data: { [key: string]: { type: 'work' | 'leave' | 'tour', intensity: number } } = {};
    const today = new Date();
    
    for (let i = 0; i < 180; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Random data generation
      const random = Math.random();
      if (random > 0.7) {
        data[dateStr] = { type: 'work', intensity: Math.floor(random * 4) + 1 };
      } else if (random > 0.9) {
        data[dateStr] = { type: 'leave', intensity: 1 };
      } else if (random > 0.95) {
        data[dateStr] = { type: 'tour', intensity: 1 };
      }
    }
    
    return data;
  };
  