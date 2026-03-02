import os
import logging
from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.extensions import db
from dotenv import load_dotenv
load_dotenv()

# ── Logging setup ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("smartattend")

def create_app(test_config=None):
    app = Flask(__name__)
    if test_config:
        app.config.update(test_config)
    else:
        app.config.from_object(Config)

    db.init_app(app)
    CORS(app)

    # Register models (even if unused directly, this ensures Alembic sees them)
    from app.models import user, attendance, leave, tour, otp, holiday, leave_balance, weekend_config, whatsapp_config

    # Register all route blueprints here
    from app.routes import auth, attendance, leave_tour, admin

    app.register_blueprint(auth.auth_bp, url_prefix='/auth')
    app.register_blueprint(attendance.attendance_bp, url_prefix='/attendance')
    app.register_blueprint(leave_tour.leave_tour_bp, url_prefix='/request')
    app.register_blueprint(admin.admin_bp)

    @app.route('/ping')
    def ping():
        return {'message': 'pong'}, 200

    @app.route('/config')
    def office_config():
        from app.office_config import (
            OFFICE_TIMEZONE_NAME,
            OFFICE_START_HOUR, OFFICE_START_MINUTE,
            OFFICE_END_HOUR, OFFICE_END_MINUTE,
        )
        return {
            'timezone': OFFICE_TIMEZONE_NAME,
            'office_start': f"{OFFICE_START_HOUR:02d}:{OFFICE_START_MINUTE:02d}",
            'office_end': f"{OFFICE_END_HOUR:02d}:{OFFICE_END_MINUTE:02d}",
        }, 200

    return app

app = create_app()


# ── Daily report scheduler ────────────────────────────────────────────
# Only start the scheduler in the main process (not in Flask reloader's
# child process) and not during testing.
def _start_scheduler():
    from app.daily_report import send_daily_report, REPORT_HOUR, REPORT_MINUTE
    from app.office_config import OFFICE_TIMEZONE_NAME
    from app.mail import is_mail_configured
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

    if not is_mail_configured():
        logger.warning("SMTP not configured — daily report disabled. "
                        "Set SMTP_HOST, SMTP_USER, SMTP_PASS, REPORT_RECIPIENTS in .env to enable.")
        return

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(
        send_daily_report,
        trigger=CronTrigger(
            hour=REPORT_HOUR,
            minute=REPORT_MINUTE,
            timezone=OFFICE_TIMEZONE_NAME,
        ),
        id="daily_attendance_report",
        replace_existing=True,
        misfire_grace_time=3600,  # still run if up to 1 hour late
    )
    scheduler.start()
    logger.info("Daily report scheduled at %02d:%02d %s", REPORT_HOUR, REPORT_MINUTE, OFFICE_TIMEZONE_NAME)


# ── WhatsApp scheduled jobs ───────────────────────────────────────────
def _start_whatsapp_scheduler():
    from app.whatsapp import is_whatsapp_configured, send_whatsapp_to_all, _send_single
    from app.office_config import (
        OFFICE_TIMEZONE_NAME, OFFICE_TZ,
        OFFICE_START_HOUR, OFFICE_START_MINUTE,
        OFFICE_END_HOUR, OFFICE_END_MINUTE,
    )
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

    if not is_whatsapp_configured():
        logger.warning("WhatsApp not configured — WhatsApp scheduled jobs disabled. "
                        "Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env to enable.")
        return

    scheduler = BackgroundScheduler(daemon=True)

    # ── 1. Morning Report (daily_attendence_v3) — at office start + 1 hour ─
    morning_hour = (OFFICE_START_HOUR + 1) % 24
    morning_minute = OFFICE_START_MINUTE

    def _send_morning_report():
        with app.app_context():
            from app.models.user import User
            from app.models.attendance import Attendance
            from app.office_config import office_today

            today = office_today()
            employees = User.query.filter(User.role != 'admin').order_by(User.name).all()

            logged_in = []
            absent = []
            for emp in employees:
                record = Attendance.query.filter_by(user_id=emp.id, date=today).first()
                if record and record.check_in_time:
                    logged_in.append(emp.name)
                else:
                    absent.append(emp.name)

            logged_str = ", ".join(logged_in) if logged_in else "None"
            absent_str = ", ".join(absent) if absent else "None"

            send_whatsapp_to_all(
                template_name="daily_attendence_v3",
                params=["Team", logged_str, absent_str],
            )
            logger.info("Morning WhatsApp report sent.")

    scheduler.add_job(
        _send_morning_report,
        trigger=CronTrigger(hour=morning_hour, minute=morning_minute, timezone=OFFICE_TIMEZONE_NAME),
        id="whatsapp_morning_report",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # ── 2. Attendance Reminder (daily_attendence_v2) — 30 min before morning report
    reminder_hour = OFFICE_START_HOUR
    reminder_minute = OFFICE_START_MINUTE + 30
    if reminder_minute >= 60:
        reminder_hour = (reminder_hour + 1) % 24
        reminder_minute -= 60

    def _send_attendance_reminder():
        with app.app_context():
            from app.models.user import User
            from app.models.attendance import Attendance
            from app.office_config import office_today

            today = office_today()
            employees = User.query.filter(User.role != 'admin').all()

            for emp in employees:
                record = Attendance.query.filter_by(user_id=emp.id, date=today).first()
                if not record or not record.check_in_time:
                    # Send reminder to the employee's own number if stored
                    # For now, send to all admin numbers about the absent employee
                    send_whatsapp_to_all(
                        template_name="daily_attendence_v2",
                        params=[emp.name, "30 minutes"],
                    )
            logger.info("Attendance reminders sent.")

    scheduler.add_job(
        _send_attendance_reminder,
        trigger=CronTrigger(hour=reminder_hour, minute=reminder_minute, timezone=OFFICE_TIMEZONE_NAME),
        id="whatsapp_attendance_reminder",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # ── 3. End of Day Wrap-Up (daily_attendence) — at office end + 1 hour ─
    eod_hour = (OFFICE_END_HOUR + 1) % 24
    eod_minute = OFFICE_END_MINUTE

    def _send_eod_wrapup():
        with app.app_context():
            from app.models.user import User
            from app.models.attendance import Attendance
            from app.office_config import office_today

            today = office_today()
            employees = User.query.filter(User.role != 'admin').order_by(User.name).all()

            total = len(employees)
            logged_out = []
            ghosted = []
            still_online = []

            for emp in employees:
                record = Attendance.query.filter_by(user_id=emp.id, date=today).first()
                if record and record.check_in_time:
                    if record.check_out_time:
                        logged_out.append(emp.name)
                    else:
                        still_online.append(emp.name)
                else:
                    ghosted.append(emp.name)

            send_whatsapp_to_all(
                template_name="daily_attendence",
                params=[
                    "Team",
                    str(total),
                    ", ".join(logged_out) if logged_out else "None",
                    ", ".join(ghosted) if ghosted else "None",
                    ", ".join(still_online) if still_online else "None",
                ],
            )
            logger.info("EOD WhatsApp wrap-up sent.")

    scheduler.add_job(
        _send_eod_wrapup,
        trigger=CronTrigger(hour=eod_hour, minute=eod_minute, timezone=OFFICE_TIMEZONE_NAME),
        id="whatsapp_eod_wrapup",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # ── 4. Midnight Oil Alert (attendence_daily_v3) — at 11 PM ─────────
    def _send_midnight_alert():
        with app.app_context():
            from app.models.user import User
            from app.models.attendance import Attendance
            from app.office_config import office_today

            today = office_today()
            employees = User.query.filter(User.role != 'admin').all()

            for emp in employees:
                record = Attendance.query.filter_by(user_id=emp.id, date=today).first()
                if record and record.check_in_time and not record.check_out_time:
                    # Still checked in — send alert to all admin numbers
                    send_whatsapp_to_all(
                        template_name="attendence_daily_v3",
                        params=[emp.name],
                    )
            logger.info("Midnight oil alerts sent.")

    scheduler.add_job(
        _send_midnight_alert,
        trigger=CronTrigger(hour=23, minute=0, timezone=OFFICE_TIMEZONE_NAME),
        id="whatsapp_midnight_alert",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    scheduler.start()
    logger.info("WhatsApp scheduled jobs started (morning=%02d:%02d, reminder=%02d:%02d, eod=%02d:%02d, midnight=23:00 %s)",
                morning_hour, morning_minute, reminder_hour, reminder_minute, eod_hour, eod_minute, OFFICE_TIMEZONE_NAME)


# Avoid double-scheduling when Flask reloader is active
if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
    _start_scheduler()
    _start_whatsapp_scheduler()


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000, debug=True)
