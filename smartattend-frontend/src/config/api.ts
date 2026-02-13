// Toggle between real API and dummy data
export const USE_DUMMY_API = false;

export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  DUMMY_DELAY: 500, // Simulate network delay for dummy responses
};

// ── Office configuration (must match backend/app/office_config.py) ──
export const OFFICE = {
  TIMEZONE: 'Asia/Kolkata',      // IANA timezone string
  START: '10:00',                // 10:00 AM local time
  END: '18:00',                  // 6:00 PM local time
};

/**
 * Format a UTC ISO string (with trailing Z) into the office timezone.
 * Returns a human-readable time like "10:15 AM".
 */
export function formatOfficeTime(utcIso: string): string {
  return new Date(utcIso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: OFFICE.TIMEZONE,
  });
}

/**
 * Format a UTC ISO string into a date string in the office timezone.
 * Returns e.g. "Mon, Feb 10, 2026".
 */
export function formatOfficeDate(utcIso: string): string {
  return new Date(utcIso).toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: OFFICE.TIMEZONE,
  });
}
