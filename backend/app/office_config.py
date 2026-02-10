"""
Centralized office configuration.

All time-sensitive logic in the backend should use these settings
so that "today" and "office hours" are always relative to the
configured timezone, while the database stores everything in UTC.
"""

from zoneinfo import ZoneInfo
from datetime import datetime, timezone

# ── Office location / timezone ──────────────────────────────────────
OFFICE_TIMEZONE_NAME = "Asia/Kolkata"           # IANA timezone string
OFFICE_TZ = ZoneInfo(OFFICE_TIMEZONE_NAME)      # reusable ZoneInfo object

# ── Office working hours (in local time) ────────────────────────────
OFFICE_START_HOUR = 10   # 10:00 AM
OFFICE_START_MINUTE = 0
OFFICE_END_HOUR = 18     # 6:00 PM
OFFICE_END_MINUTE = 0


# ── Helper utilities ────────────────────────────────────────────────

def office_today():
    """Return today's date in the office timezone."""
    return datetime.now(OFFICE_TZ).date()


def utc_now():
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)


def to_utc_iso(dt):
    """
    Convert a (possibly naive-UTC) datetime to an ISO-8601 string
    with a trailing 'Z' so the frontend knows it's UTC.
    Returns None if dt is None.
    """
    if dt is None:
        return None
    return dt.isoformat() + "Z"
