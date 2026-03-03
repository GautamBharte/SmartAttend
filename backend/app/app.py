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
    from app.models import user, attendance, leave, tour, otp, holiday, leave_balance, weekend_config, whatsapp_config, whatsapp_schedule

    # Register all route blueprints here
    from app.routes import auth, attendance, leave_tour, admin, webhook

    app.register_blueprint(auth.auth_bp, url_prefix='/auth')
    app.register_blueprint(attendance.attendance_bp, url_prefix='/attendance')
    app.register_blueprint(leave_tour.leave_tour_bp, url_prefix='/request')
    app.register_blueprint(admin.admin_bp)
    app.register_blueprint(webhook.webhook_bp)

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


# ── WhatsApp scheduled jobs (interval-based, reads times from DB) ─────
def _start_whatsapp_scheduler():
    from app.whatsapp import is_whatsapp_configured, send_whatsapp_to_all, send_whatsapp_to_all_personalized, _send_single, truncate_name_list
    from app.office_config import OFFICE_TIMEZONE_NAME, OFFICE_TZ
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    from datetime import datetime

    if not is_whatsapp_configured():
        logger.warning("WhatsApp not configured — WhatsApp scheduled jobs disabled. "
                        "Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env to enable.")
        return

    # Track which jobs already fired this minute to avoid duplicates
    _fired = set()

    def _dispatcher():
        with app.app_context():
            from app.models.whatsapp_schedule import WhatsAppScheduleConfig
            from app.models.user import User
            from app.models.attendance import Attendance
            from app.office_config import office_today

            now = datetime.now(OFFICE_TZ)
            current_hm = now.strftime("%H:%M")

            # Reset the fired set at the start of each new minute
            keys_to_remove = [k for k in _fired if k != current_hm]
            for k in keys_to_remove:
                _fired.discard(k)

            config = WhatsAppScheduleConfig.get_current()
            today = office_today()

            # ── 1. Attendance Reminder → sent to each EMPLOYEE's phone ──
            if config.reminder_enabled and current_hm == config.reminder_time and f"reminder_{current_hm}" not in _fired:
                _fired.add(f"reminder_{current_hm}")
                employees = User.query.filter(User.role != 'admin').all()
                for emp in employees:
                    if not emp.notify_reminder:
                        continue  # employee opted out
                    record = Attendance.query.filter_by(user_id=emp.id, date=today).first()
                    if not record or not record.check_in_time:
                        if not emp.phone_number:
                            continue  # skip employees without a phone number
                        # Calculate minutes until morning report
                        try:
                            mr_h, mr_m = map(int, config.morning_report_time.split(':'))
                            rem_h, rem_m = map(int, config.reminder_time.split(':'))
                            diff = (mr_h * 60 + mr_m) - (rem_h * 60 + rem_m)
                            time_str = f"{diff} minutes" if diff > 0 else "soon"
                        except Exception:
                            time_str = "30 minutes"
                        _send_single(
                            to=emp.phone_number,
                            template_name="daily_attendence_v2",
                            params=[emp.name, time_str],
                        )
                logger.info("Attendance reminders sent to employees.")

            # ── 2. Morning Report ─────────────────────────────────
            if config.morning_report_enabled and current_hm == config.morning_report_time and f"morning_{current_hm}" not in _fired:
                _fired.add(f"morning_{current_hm}")
                employees = User.query.filter(User.role != 'admin').order_by(User.name).all()
                logged_in = []
                absent = []
                for emp in employees:
                    record = Attendance.query.filter_by(user_id=emp.id, date=today).first()
                    if record and record.check_in_time:
                        logged_in.append(emp.name)
                    else:
                        absent.append(emp.name)
                send_whatsapp_to_all_personalized(
                    template_name="daily_attendence_v3",
                    params_fn=lambda label: [
                        label,
                        truncate_name_list(logged_in),
                        truncate_name_list(absent),
                    ],
                )
                logger.info("Morning WhatsApp report sent.")

            # ── 3. Logoff Reminder (v5) → nudge for still-checked-in ─
            if config.logoff_reminder_enabled and current_hm == config.logoff_reminder_time and f"logoff_{current_hm}" not in _fired:
                _fired.add(f"logoff_{current_hm}")
                employees = User.query.filter(User.role != 'admin').all()

                # Compute minutes until evening report
                try:
                    eve_h, eve_m = map(int, config.evening_report_time.split(':'))
                    now_h, now_m = map(int, current_hm.split(':'))
                    diff = (eve_h * 60 + eve_m) - (now_h * 60 + now_m)
                    if diff <= 0:
                        diff = 15  # fallback
                    minutes_label = f"{diff} minutes" if diff != 1 else "1 minute"
                except Exception:
                    minutes_label = "15 minutes"

                for emp in employees:
                    if not emp.notify_checkout:
                        continue  # employee opted out
                    record = Attendance.query.filter_by(user_id=emp.id, date=today).first()
                    if record and record.check_in_time and not record.check_out_time:
                        if record.is_overtime:
                            continue  # overtime workers already know
                        if not emp.phone_number:
                            continue
                        _send_single(
                            to=emp.phone_number,
                            template_name="daily_attendence_v5",
                            params=[emp.name, minutes_label],
                        )
                logger.info("Logoff reminders (v5) sent to employees.")

            # ── 4. Evening Report ─────────────────────────────────
            if config.evening_report_enabled and current_hm == config.evening_report_time and f"evening_{current_hm}" not in _fired:
                _fired.add(f"evening_{current_hm}")
                employees = User.query.filter(User.role != 'admin').order_by(User.name).all()
                total = len(employees)
                logged_out = []
                ghosted = []
                still_online = []
                overtime_workers = []
                for emp in employees:
                    record = Attendance.query.filter_by(user_id=emp.id, date=today).first()
                    if record and record.check_in_time:
                        if record.check_out_time:
                            logged_out.append(emp.name)
                        elif record.is_overtime:
                            overtime_workers.append(emp.name)
                        else:
                            still_online.append(emp.name)
                    else:
                        ghosted.append(emp.name)

                # Merge overtime into still_online display for the template
                all_still_online = still_online + [f"{n} (OT)" for n in overtime_workers]
                send_whatsapp_to_all_personalized(
                    template_name="daily_attendence",
                    params_fn=lambda label: [
                        label,
                        str(total),
                        truncate_name_list(logged_out),
                        truncate_name_list(ghosted),
                        truncate_name_list(all_still_online),
                    ],
                )
                logger.info("EOD WhatsApp wrap-up sent.")

            # ── 5. Midnight Oil Alert → only non-overtime employees ─
            if config.midnight_alert_enabled and current_hm == config.midnight_alert_time and f"midnight_{current_hm}" not in _fired:
                _fired.add(f"midnight_{current_hm}")
                employees = User.query.filter(User.role != 'admin').all()
                for emp in employees:
                    if not emp.notify_midnight:
                        continue  # employee opted out
                    record = Attendance.query.filter_by(user_id=emp.id, date=today).first()
                    if record and record.check_in_time and not record.check_out_time:
                        if record.is_overtime:
                            continue  # skip — employee knowingly working overtime
                        if not emp.phone_number:
                            continue  # skip employees without a phone number
                        _send_single(
                            to=emp.phone_number,
                            template_name="attendence_daily_v3",
                            params=[emp.name],
                        )
                logger.info("Midnight oil alerts sent to non-overtime employees.")

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(
        _dispatcher,
        trigger=IntervalTrigger(seconds=60),
        id="whatsapp_dispatcher",
        replace_existing=True,
        misfire_grace_time=120,
    )
    scheduler.start()
    logger.info("WhatsApp interval dispatcher started (checks every 60s, timezone=%s)", OFFICE_TIMEZONE_NAME)


# Avoid double-scheduling when Flask reloader is active
if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
    _start_scheduler()
    _start_whatsapp_scheduler()


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000, debug=True)
