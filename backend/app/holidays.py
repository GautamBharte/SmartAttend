"""
Holidays utility — seed Indian public holidays and compute working days.
"""

from datetime import date, timedelta
from app.extensions import db
from app.models.holiday import Holiday

# ── Indian Gazetted Holidays ────────────────────────────────────────
# These are the standard gazetted holidays observed by most Indian
# companies.  Lunar / religious holidays shift each year; admins can
# add, remove or update them via the admin API.

INDIAN_HOLIDAYS: dict[int, list[tuple[str, str]]] = {
    2025: [
        ("2025-01-26", "Republic Day"),
        ("2025-03-14", "Holi"),
        ("2025-03-31", "Eid ul-Fitr"),
        ("2025-04-10", "Mahavir Jayanti"),
        ("2025-04-14", "Dr. Ambedkar Jayanti"),
        ("2025-04-18", "Good Friday"),
        ("2025-05-01", "May Day"),
        ("2025-05-12", "Buddha Purnima"),
        ("2025-06-07", "Eid ul-Adha"),
        ("2025-08-15", "Independence Day"),
        ("2025-08-16", "Janmashtami"),
        ("2025-10-02", "Mahatma Gandhi Jayanti"),
        ("2025-10-02", "Dussehra"),  # same date in 2025
        ("2025-10-20", "Diwali"),
        ("2025-11-05", "Guru Nanak Jayanti"),
        ("2025-12-25", "Christmas"),
    ],
    2026: [
        ("2026-01-26", "Republic Day"),
        ("2026-03-04", "Holi"),
        ("2026-03-21", "Eid ul-Fitr"),
        ("2026-03-30", "Mahavir Jayanti"),
        ("2026-04-03", "Good Friday"),
        ("2026-04-14", "Dr. Ambedkar Jayanti"),
        ("2026-05-01", "May Day"),
        ("2026-05-02", "Buddha Purnima"),
        ("2026-05-28", "Eid ul-Adha"),
        ("2026-08-15", "Independence Day"),
        ("2026-08-25", "Janmashtami"),
        ("2026-10-02", "Mahatma Gandhi Jayanti"),
        ("2026-10-12", "Dussehra"),
        ("2026-10-31", "Diwali"),
        ("2026-11-19", "Guru Nanak Jayanti"),
        ("2026-12-25", "Christmas"),
    ],
}


def seed_holidays(year: int | None = None) -> int:
    """Insert holidays for *year* (default: all years in the dict).
    Skips dates that already exist.  Returns count of newly created rows.
    """
    years = [year] if year else list(INDIAN_HOLIDAYS.keys())
    created = 0

    for y in years:
        entries = INDIAN_HOLIDAYS.get(y, [])
        for date_str, name in entries:
            d = date.fromisoformat(date_str)
            if not Holiday.query.filter_by(date=d).first():
                db.session.add(Holiday(date=d, name=name, holiday_type='gazetted'))
                created += 1

    if created:
        db.session.commit()

    return created


def get_holidays_set(year: int) -> set[date]:
    """Return a set of holiday dates for the given year (for fast lookup)."""
    holidays = Holiday.query.filter(
        db.extract('year', Holiday.date) == year
    ).all()
    return {h.date for h in holidays}


def count_working_days(start: date, end: date) -> int:
    """
    Count business days between *start* and *end* (inclusive),
    excluding weekends (as configured) and gazetted holidays.
    """
    if start > end:
        return 0

    # Get weekend configuration
    from app.models.weekend_config import WeekendConfig
    weekend_config = WeekendConfig.get_current()
    weekend_days = weekend_config.get_weekend_set()

    # Collect holiday dates that fall in the range
    years = set()
    d = start
    while d <= end:
        years.add(d.year)
        d += timedelta(days=365)
    years.add(end.year)

    holiday_dates: set[date] = set()
    for y in years:
        holiday_dates |= get_holidays_set(y)

    count = 0
    current = start
    while current <= end:
        # weekday() returns: Monday=0, Tuesday=1, ..., Sunday=6
        if current.weekday() not in weekend_days and current not in holiday_dates:
            count += 1
        current += timedelta(days=1)

    return count

