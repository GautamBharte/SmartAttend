"""
Lightweight email helper using Python's built-in smtplib.
SMTP settings are read from environment variables.
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("smartattend.mail")


def _clean_env_var(value: str | None, default: str = "") -> str:
    """Clean environment variable by stripping whitespace and trailing '=' characters.
    
    Docker-compose sometimes adds trailing '=' to env vars, so we strip them.
    """
    if value is None:
        return default
    return value.rstrip("=").strip()


# ── SMTP configuration (set in .env / docker-compose) ────────────────
SMTP_HOST = _clean_env_var(os.getenv("SMTP_HOST"), "")            # e.g. smtp.gmail.com
SMTP_PORT = int(_clean_env_var(os.getenv("SMTP_PORT"), "587"))       # 587 for TLS, 465 for SSL
SMTP_USER = _clean_env_var(os.getenv("SMTP_USER"), "")             # sender email
SMTP_PASS = _clean_env_var(os.getenv("SMTP_PASS"), "")             # app password / SMTP password
SMTP_USE_TLS = _clean_env_var(os.getenv("SMTP_USE_TLS"), "true").lower() in ("true", "1", "yes")
REPORT_RECIPIENTS = [
    addr.strip()
    for addr in _clean_env_var(os.getenv("REPORT_RECIPIENTS"), "").split(",")
    if addr.strip()
]


def is_smtp_configured() -> bool:
    """Return True if core SMTP settings (host, user, pass) are present."""
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASS)


def is_mail_configured() -> bool:
    """Return True if all required SMTP settings including recipients are present."""
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASS and REPORT_RECIPIENTS)


def send_html_email(subject: str, html_body: str, recipients: list[str] | None = None):
    """
    Send an HTML email to one or more recipients.
    Falls back to REPORT_RECIPIENTS if none specified.
    """
    to_addrs = recipients or REPORT_RECIPIENTS
    if not to_addrs:
        logger.warning("No recipients configured – skipping send.")
        return

    if not is_smtp_configured():
        logger.warning("SMTP not configured – skipping send.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = ", ".join(to_addrs)
    msg.attach(MIMEText(html_body, "html"))

    try:
        if SMTP_PORT == 465:
            # SSL
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, to_addrs, msg.as_string())
        else:
            # STARTTLS (default)
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                if SMTP_USE_TLS:
                    server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, to_addrs, msg.as_string())
        logger.info("Email sent to %s", to_addrs)
    except Exception as e:
        logger.error("Failed to send email: %s", e)


# ── Leave notification emails ────────────────────────────────────────

def _leave_type_label(leave_type: str) -> str:
    return "Paid Leave" if leave_type == "paid" else "Unpaid Leave"


def _status_color(status: str) -> str:
    return {
        "approved": "#16a34a",
        "rejected": "#dc2626",
        "pending":  "#d97706",
    }.get(status, "#6b7280")


def _status_emoji(status: str) -> str:
    return {
        "approved": "✅",
        "rejected": "❌",
        "pending":  "⏳",
    }.get(status, "")


def send_leave_application_email(
    employee_name: str,
    employee_email: str,
    leave_type: str,
    start_date,
    end_date,
    working_days: int,
    reason: str,
):
    """Notify admin recipients that an employee has applied for leave."""
    if not is_smtp_configured() or not REPORT_RECIPIENTS:
        logger.warning("SMTP / recipients not configured – skipping leave notification.")
        return

    type_label = _leave_type_label(leave_type)
    subject = f"📝 New Leave Application — {employee_name} ({type_label})"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
      <div style="max-width:560px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:28px 32px;color:#fff;">
          <h1 style="margin:0;font-size:20px;">📝 New Leave Application</h1>
          <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">An employee has applied for leave</p>
        </div>

        <!-- Details -->
        <div style="padding:24px 32px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:10px 0;color:#6b7280;width:140px;">Employee</td>
              <td style="padding:10px 0;font-weight:600;">{employee_name}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6;">Email</td>
              <td style="padding:10px 0;border-top:1px solid #f3f4f6;">{employee_email}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6;">Leave Type</td>
              <td style="padding:10px 0;border-top:1px solid #f3f4f6;">
                <span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;color:#fff;background:{'#2563eb' if leave_type == 'paid' else '#7c3aed'};">
                  {type_label}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6;">From</td>
              <td style="padding:10px 0;border-top:1px solid #f3f4f6;">{start_date.strftime('%B %d, %Y')}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6;">To</td>
              <td style="padding:10px 0;border-top:1px solid #f3f4f6;">{end_date.strftime('%B %d, %Y')}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6;">Working Days</td>
              <td style="padding:10px 0;border-top:1px solid #f3f4f6;font-weight:600;">{working_days} day(s)</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6;">Reason</td>
              <td style="padding:10px 0;border-top:1px solid #f3f4f6;">{reason or '—'}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="background:#fffbeb;padding:16px 32px;text-align:center;font-size:13px;color:#92400e;border-top:1px solid #fde68a;">
          ⏳ This leave is <strong>pending approval</strong>. Please review it in the SmartAttend admin panel.
        </div>
      </div>
    </body>
    </html>
    """

    send_html_email(subject, html, REPORT_RECIPIENTS)


def send_leave_status_email(
    employee_name: str,
    employee_email: str,
    leave_type: str,
    start_date,
    end_date,
    working_days: int,
    reason: str,
    new_status: str,
):
    """Notify the employee that their leave status has been updated."""
    if not is_smtp_configured():
        logger.warning("SMTP not configured – skipping leave-status notification.")
        return

    type_label = _leave_type_label(leave_type)
    emoji = _status_emoji(new_status)
    color = _status_color(new_status)
    status_text = new_status.capitalize()

    subject = f"{emoji} Your Leave Has Been {status_text} — {type_label}"

    if new_status == "approved":
        header_gradient = "linear-gradient(135deg,#15803d,#22c55e)"
        banner_bg = "#f0fdf4"
        banner_border = "#bbf7d0"
        banner_color = "#166534"
        banner_msg = "Your leave request has been <strong>approved</strong>. Enjoy your time off!"
    else:
        header_gradient = "linear-gradient(135deg,#b91c1c,#ef4444)"
        banner_bg = "#fef2f2"
        banner_border = "#fecaca"
        banner_color = "#991b1b"
        banner_msg = "Your leave request has been <strong>rejected</strong>. Please contact your admin for details."

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
      <div style="max-width:560px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background:{header_gradient};padding:28px 32px;color:#fff;">
          <h1 style="margin:0;font-size:20px;">{emoji} Leave {status_text}</h1>
          <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">Hi {employee_name}, your leave status has been updated</p>
        </div>

        <!-- Status banner -->
        <div style="margin:20px 32px 0;padding:14px 18px;background:{banner_bg};border:1px solid {banner_border};border-radius:8px;font-size:14px;color:{banner_color};">
          {banner_msg}
        </div>

        <!-- Details -->
        <div style="padding:20px 32px 24px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:10px 0;color:#6b7280;width:140px;">Status</td>
              <td style="padding:10px 0;">
                <span style="display:inline-block;padding:2px 12px;border-radius:9999px;font-size:12px;font-weight:600;color:#fff;background:{color};">
                  {status_text}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6;">Leave Type</td>
              <td style="padding:10px 0;border-top:1px solid #f3f4f6;">{type_label}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6;">From</td>
              <td style="padding:10px 0;border-top:1px solid #f3f4f6;">{start_date.strftime('%B %d, %Y')}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6;">To</td>
              <td style="padding:10px 0;border-top:1px solid #f3f4f6;">{end_date.strftime('%B %d, %Y')}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6;">Working Days</td>
              <td style="padding:10px 0;border-top:1px solid #f3f4f6;">{working_days} day(s)</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6;">Reason</td>
              <td style="padding:10px 0;border-top:1px solid #f3f4f6;">{reason or '—'}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
          SmartAttend &middot; Automated notification
        </div>
      </div>
    </body>
    </html>
    """

    send_html_email(subject, html, [employee_email])
