# SmartAttend - Release Notes

## Overview
SmartAttend is a comprehensive office attendance, leave, and tour tracking system with a modern web interface and robust backend API.

---

## 🎯 Core Features

### Authentication & User Management
- **User Registration**: Employee and admin account creation
- **Secure Login**: JWT-based authentication with token expiration
- **Password Management**:
  - Password reset via OTP email verification
  - Password change with OTP verification
  - Secure password hashing
- **Profile Management**:
  - Update name and email
  - Email change with OTP verification to new email address
  - Profile viewing

### Attendance Tracking
- **Check-In/Check-Out**: One-click attendance marking
- **Attendance History**: Complete historical attendance records
- **Today's Status**: Real-time attendance status (not checked in, checked in, completed)
- **Weekly Hours Calculation**: Automatic calculation of weekly working hours
- **Attendance Calendar**: Visual contribution calendar showing work days, leaves, tours, and holidays
- **Timezone Support**: Office timezone-aware attendance tracking (default: Asia/Kolkata)

### Leave Management
- **Leave Application**: Apply for paid or unpaid leave with date range selection
- **Leave Balance Tracking**: 
  - Automatic calculation of available paid leaves
  - Track used, pending, and available leave balance
  - Year-based leave balance management
- **Working Days Calculation**: Automatically excludes weekends and holidays from leave days
- **Leave History**: View all past and pending leave requests
- **Leave Status**: Track pending, approved, and rejected leave requests
- **Leave Types**: Support for paid and unpaid leave types

### Tour Management
- **Tour Application**: Apply for business tours with location and reason
- **Tour History**: View all past and pending tour requests
- **Tour Status**: Track pending, approved, and rejected tour requests
- **Date Range Support**: Multi-day tour requests

### Holiday Management
- **Holiday Calendar**: View all holidays for any year
- **Indian Public Holidays**: Pre-seeded gazetted holidays for India (2025-2026)
- **Holiday Types**: Support for gazetted and other holiday types
- **Admin Holiday Management**: Add, view, and delete holidays
- **Holiday Seeding**: Bulk import holidays for a year

### Weekend Configuration
- **Customizable Weekends**: Configure which days are considered weekends (default: Sunday)
- **Working Days Calculation**: Automatically accounts for weekend configuration when calculating leave days

---

## 👨‍💼 Admin Features

### Employee Management
- **Employee List**: View all employees with today's attendance status
- **Add Employee**: Manual employee registration
- **Bulk Employee Upload**: CSV-based bulk employee import
  - CSV template download
  - Validation and error reporting
  - Duplicate detection
- **Employee Search & Filtering**: Advanced filtering and search capabilities
- **Pagination**: Efficient data pagination for large employee lists
- **Sorting**: Sort by any field in ascending or descending order

### Leave & Tour Request Management
- **Request Overview**: View all leave and tour requests across all employees
- **Approve/Reject Requests**: Admin approval workflow for leave and tour requests
- **Advanced Filtering**: Filter by status, date range, employee, and more
- **Request Details**: View complete request information including dates, reasons, and status

### Leave Balance Management
- **View Leave Balance**: Check any employee's leave balance for any year
- **Adjust Leave Balance**: Admin can modify total paid leaves for employees
- **Balance Calculation**: Automatic calculation of used and pending leaves

### Daily Attendance Report
- **Automated Daily Reports**: Scheduled email reports sent after office hours
- **Manual Report Trigger**: On-demand report generation
- **Report Preview**: HTML preview of daily attendance report
- **Report Contents**:
  - Present/absent count summary
  - Employee-wise attendance with check-in/check-out times
  - Formatted email with professional styling
- **Email Integration**: SMTP-based email delivery

### System Configuration
- **Weekend Configuration**: Set which days are weekends (Monday=0, Sunday=6)
- **Office Timezone**: Configurable office timezone (default: Asia/Kolkata)
- **Office Hours**: Configurable office start and end times

---

## 🎨 Frontend Features

### User Interface
- **Modern React UI**: Built with React 19, TypeScript, and Tailwind CSS
- **Dark Mode Support**: Full dark mode theme support
- **Responsive Design**: Mobile-friendly responsive layout
- **Component Library**: Radix UI components for accessible, polished UI
- **Real-time Updates**: Auto-refresh on date changes and tab focus

### Dashboard
- **Overview Dashboard**: 
  - Today's attendance status with quick actions
  - Weekly hours summary
  - Pending requests count
  - Leave balance display
- **Quick Actions**: One-click check-in/check-out buttons
- **Activity Calendar**: GitHub-style contribution calendar showing:
  - Work days (color-coded by hours worked)
  - Leave days
  - Tour days
  - Holidays
  - Weekends
  - Year selector for historical view

### Attendance Panel
- **Check-In/Check-Out Interface**: Dedicated attendance management panel
- **Attendance History Table**: Detailed attendance records with dates and times
- **Status Indicators**: Visual status indicators for attendance states

### Leave & Tour Panels
- **Request Forms**: Intuitive forms for applying leave and tour requests
- **Request History**: Table view of all requests with status badges
- **Date Pickers**: Calendar-based date selection
- **Validation**: Client-side validation with helpful error messages

### Admin Panel
- **Tabbed Interface**: Organized tabs for different admin functions
- **Employee Management Tab**: Full CRUD operations for employees
- **Request Management Tabs**: Separate tabs for leave and tour requests
- **Holiday Management Tab**: Calendar-based holiday management
- **Daily Report Tab**: Report generation and preview
- **Search & Filters**: Advanced search and filtering UI
- **Bulk Upload**: Drag-and-drop or file picker for CSV uploads

### Navigation
- **Sidebar Navigation**: Persistent sidebar with navigation items
- **Mobile Menu**: Hamburger menu for mobile devices
- **URL Hash Routing**: Deep linking support with hash-based routing
- **Tab Persistence**: Maintains state when switching between tabs

### Network Status
- **Offline Detection**: Network status indicator
- **Error Handling**: Graceful error handling with toast notifications

---

## 🔧 Technical Features

### Backend
- **Flask REST API**: RESTful API built with Flask
- **PostgreSQL Database**: Robust relational database
- **JWT Authentication**: Secure token-based authentication
- **Database Models**: Well-structured SQLAlchemy models
- **Timezone Handling**: Proper UTC storage with timezone-aware operations
- **Email Service**: SMTP-based email notifications
- **OTP System**: Secure OTP generation and verification for sensitive operations
- **Error Handling**: Comprehensive error handling and validation

### Frontend
- **React Query**: Efficient data fetching and caching
- **Form Validation**: Zod-based form validation
- **Type Safety**: Full TypeScript support
- **State Management**: React hooks and context for state management
- **API Service Layer**: Centralized API service with dual-mode support
- **Date Handling**: date-fns for date manipulation and formatting

### Deployment
- **Docker Support**: Dockerized backend and frontend
- **Production Dockerfile**: Optimized production builds
- **Ansible Deployment**: Automated deployment with Ansible playbooks
- **Nginx Configuration**: Production-ready Nginx configuration templates
- **Environment Configuration**: Flexible environment variable configuration

### Testing
- **Test Suite**: Comprehensive test coverage
- **Test Utilities**: Helper utilities for testing
- **Test Scripts**: Automated test running scripts

---

## 📧 Email Features

- **OTP Emails**: Styled HTML emails for OTP delivery
- **Password Reset Emails**: Secure password reset via email
- **Daily Reports**: Automated daily attendance reports
- **Email Templates**: Professional HTML email templates
- **SMTP Configuration**: Flexible SMTP server configuration

---

## 🔒 Security Features

- **Password Hashing**: Secure password storage with Werkzeug
- **JWT Tokens**: Secure token-based authentication
- **OTP Verification**: Time-limited OTP codes for sensitive operations
- **Role-Based Access Control**: Admin and employee role separation
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: SQLAlchemy ORM protection
- **CORS Support**: Configurable CORS settings

---

## 📊 Data & Reporting

- **CSV Export**: Employee data export capabilities
- **CSV Import**: Bulk employee import via CSV
- **Daily Reports**: Automated attendance summaries
- **Historical Data**: Complete historical records
- **Analytics**: Weekly hours, leave balance, and attendance statistics

---

## 🌐 Internationalization & Localization

- **Timezone Support**: Full timezone awareness (default: Asia/Kolkata)
- **Date Formatting**: Office timezone-aware date and time display
- **Indian Holidays**: Pre-configured Indian public holidays

---

## 🚀 Performance & Scalability

- **Pagination**: Efficient data pagination
- **Lazy Loading**: Component lazy loading for better performance
- **Caching**: React Query caching for API responses
- **Optimized Queries**: Efficient database queries
- **Background Jobs**: Scheduled tasks for daily reports

---

## 📱 User Experience

- **Toast Notifications**: User-friendly success/error notifications
- **Loading States**: Clear loading indicators
- **Error Messages**: Helpful error messages
- **Form Validation**: Real-time form validation feedback
- **Auto-refresh**: Automatic data refresh on relevant events
- **Keyboard Navigation**: Accessible keyboard navigation
- **Tooltips**: Helpful tooltips for calendar and UI elements

---

## 🔄 Workflow Features

- **Approval Workflow**: Admin approval for leave and tour requests
- **Status Tracking**: Real-time status updates
- **Request History**: Complete audit trail
- **Balance Validation**: Automatic leave balance validation before approval

---

## 📝 Documentation

- **API Documentation**: Comprehensive API endpoint documentation
- **README**: Project setup and usage instructions
- **Code Comments**: Well-documented codebase

---

## 🛠️ Developer Features

- **Feature Flags**: Enable/disable features via configuration
- **Environment Variables**: Flexible configuration via environment variables
- **Database Migrations**: Database migration support
- **Development Tools**: Hot reload, linting, and formatting tools

---

## Version Information

**Tech Stack:**
- Backend: Flask, PostgreSQL, SQLAlchemy
- Frontend: React 19, TypeScript, Tailwind CSS, Vite
- Authentication: JWT
- Email: SMTP
- Deployment: Docker, Ansible, Nginx

**Default Configuration:**
- Timezone: Asia/Kolkata
- Office Hours: 10:00 AM - 6:00 PM
- Weekend: Sunday
- Annual Paid Leaves: 21 days

---

*For detailed API documentation, see `docs/apis.md`*
*For setup instructions, see `README.md`*
