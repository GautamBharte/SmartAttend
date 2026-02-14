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
    from app.models import user, attendance, leave, tour, otp, holiday, leave_balance, weekend_config

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


# Avoid double-scheduling when Flask reloader is active
if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
    _start_scheduler()


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000, debug=True)
