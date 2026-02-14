"""
Daily attendance report — generates and emails a summary of all employees'
attendance for the current office day.

Scheduled to run at OFFICE_END_HOUR + 4 hours (≈ 10 PM local).
"""

import logging
from datetime import datetime
from app.office_config import (
    office_today, OFFICE_TZ, OFFICE_TIMEZONE_NAME,
    OFFICE_END_HOUR, OFFICE_END_MINUTE,
)
from app.models.user import User
from app.models.attendance import Attendance
from app.mail import send_html_email, is_mail_configured

logger = logging.getLogger("smartattend.daily_report")

# ── Schedule time (office end + 4 h) ─────────────────────────────────
REPORT_HOUR = (OFFICE_END_HOUR + 4) % 24   # e.g. 18 + 4 = 22 (10 PM)
REPORT_MINUTE = OFFICE_END_MINUTE           # keep same minute offset


def _format_local(dt_utc) -> str:
    """Convert a naive-UTC datetime to office-local HH:MM AM/PM string."""
    if dt_utc is None:
        return "—"
    aware = dt_utc.replace(tzinfo=datetime.now().astimezone().tzinfo)
    # Treat the stored value as UTC, then convert to office tz
    from datetime import timezone as tz
    utc_aware = dt_utc.replace(tzinfo=tz.utc)
    local = utc_aware.astimezone(OFFICE_TZ)
    return local.strftime("%-I:%M %p")


def generate_report_html() -> tuple[str, str]:
    """
    Build the daily report.
    Returns (subject, html_body).
    """
    today = office_today()
    today_str = today.strftime("%A, %B %d, %Y")  # e.g. "Tuesday, February 10, 2026"

    # Fetch all employees (non-admin)
    employees = User.query.filter(User.role != 'admin').order_by(User.name).all()

    rows = []
    present_count = 0
    absent_count = 0

    for emp in employees:
        record = Attendance.query.filter_by(user_id=emp.id, date=today).first()

        if record and record.check_in_time:
            present_count += 1
            status = "Present"
            status_color = "#16a34a"  # green
            entry = _format_local(record.check_in_time)
            exit_time = _format_local(record.check_out_time) if record.check_out_time else "Still in office"
        else:
            absent_count += 1
            status = "Absent"
            status_color = "#dc2626"  # red
            entry = "—"
            exit_time = "—"

        rows.append({
            "name": emp.name,
            "email": emp.email,
            "status": status,
            "status_color": status_color,
            "entry": entry,
            "exit": exit_time,
        })

    total = len(employees)
    subject = f"📋 Daily Attendance Report — {today_str}"

    # ── HTML template ─────────────────────────────────────────────────
    employee_rows = ""
    for i, r in enumerate(rows):
        bg = "#f9fafb" if i % 2 == 0 else "#ffffff"
        employee_rows += f"""
        <tr style="background-color:{bg};">
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">{r['name']}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">
            <span style="display:inline-block;padding:2px 10px;border-radius:9999px;
                         font-size:12px;font-weight:600;color:#fff;background:{r['status_color']};">
              {r['status']}
            </span>
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">{r['entry']}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">{r['exit']}</td>
        </tr>"""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
      <div style="max-width:680px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:28px 32px;color:#fff;">
          <h1 style="margin:0;font-size:22px;">📋 Daily Attendance Report</h1>
          <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">{today_str} &middot; {OFFICE_TIMEZONE_NAME}</p>
        </div>

        <!-- Summary cards -->
        <div style="display:flex;padding:20px 32px 10px;gap:16px;">
          <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#16a34a;">{present_count}</div>
            <div style="font-size:12px;color:#15803d;margin-top:2px;">Present</div>
          </div>
          <div style="flex:1;background:#fef2f2;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#dc2626;">{absent_count}</div>
            <div style="font-size:12px;color:#b91c1c;margin-top:2px;">Absent</div>
          </div>
          <div style="flex:1;background:#eff6ff;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#2563eb;">{total}</div>
            <div style="font-size:12px;color:#1d4ed8;margin-top:2px;">Total</div>
          </div>
        </div>

        <!-- Table -->
        <div style="padding:16px 32px 28px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="text-align:left;padding:10px 14px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Name</th>
                <th style="text-align:left;padding:10px 14px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Status</th>
                <th style="text-align:left;padding:10px 14px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Entry Time</th>
                <th style="text-align:left;padding:10px 14px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Exit Time</th>
              </tr>
            </thead>
            <tbody>
              {employee_rows if employee_rows else '<tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;">No employees found</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
          SmartAttend &middot; Auto-generated report &middot; {datetime.now(OFFICE_TZ).strftime("%-I:%M %p %Z")}
        </div>
      </div>
    </body>
    </html>
    """

    return subject, html


def send_daily_report():
    """Generate the report and email it. Called by the scheduler."""
    from app.app import app

    with app.app_context():
        if not is_mail_configured():
            logger.warning("SMTP not configured — skipping.")
            return

        logger.info("Generating report for %s …", office_today())
        subject, html = generate_report_html()
        send_html_email(subject, html)
        logger.info("Daily report sent.")
