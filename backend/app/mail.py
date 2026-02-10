"""
Lightweight email helper using Python's built-in smtplib.
SMTP settings are read from environment variables.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


# ── SMTP configuration (set in .env / docker-compose) ────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "")            # e.g. smtp.gmail.com
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))       # 587 for TLS, 465 for SSL
SMTP_USER = os.getenv("SMTP_USER", "")             # sender email
SMTP_PASS = os.getenv("SMTP_PASS", "")             # app password / SMTP password
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
REPORT_RECIPIENTS = [
    addr.strip()
    for addr in os.getenv("REPORT_RECIPIENTS", "").split(",")
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
        print("[mail] No recipients configured – skipping send.")
        return

    if not is_smtp_configured():
        print("[mail] SMTP not configured – skipping send.")
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
        print(f"[mail] Daily report sent to {to_addrs}")
    except Exception as e:
        print(f"[mail] Failed to send email: {e}")
