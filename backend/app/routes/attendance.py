from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta, timezone, time as dt_time
from app.app import db
from app.models.attendance import Attendance
from app.models.user import User
from app.office_config import office_today, utc_now, to_utc_iso, OFFICE_TZ
from app.whatsapp import send_whatsapp_async
from app.models.whatsapp_schedule import WhatsAppScheduleConfig
import jwt
import os
from datetime import timezone as tz
from functools import wraps

attendance_bp = Blueprint('attendance', __name__)
SECRET_KEY = os.getenv("SECRET_KEY", "secret-dev")


def _parse_custom_time(time_str: str, for_date: date) -> datetime:
    """Parse a custom time string and return a naive UTC datetime.

    Accepts:
      - "HH:MM" (interpreted as office-local time on for_date)
      - ISO 8601 string (e.g. "2026-03-02T14:30:00+05:30")
    Returns a naive UTC datetime suitable for DB storage.
    """
    import re
    hm_match = re.match(r'^(\d{1,2}):(\d{2})$', time_str.strip())
    if hm_match:
        hour, minute = int(hm_match.group(1)), int(hm_match.group(2))
        local_dt = datetime.combine(for_date, dt_time(hour, minute), tzinfo=OFFICE_TZ)
        return local_dt.astimezone(timezone.utc).replace(tzinfo=None)
    else:
        # Try ISO 8601
        parsed = datetime.fromisoformat(time_str)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=OFFICE_TZ)
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        try:
            data = jwt.decode(token.split()[1], SECRET_KEY, algorithms=["HS256"])
            user = User.query.get(data['user_id'])
            if not user:
                raise Exception("User not found")
        except Exception as e:
            return jsonify({'error': 'Invalid or expired token'}), 401
        return f(user, *args, **kwargs)
    return decorated

@attendance_bp.route('/check-in', methods=['POST'])
@token_required
def check_in(user):
    today = office_today()
    record = Attendance.query.filter_by(user_id=user.id, date=today).first()
    if record and record.check_in_time:
        return jsonify({'message': 'Already checked in today'}), 400

    if not record:
        record = Attendance(user_id=user.id, date=today)

    # Accept optional custom time from frontend
    data = request.get_json(silent=True) or {}
    custom_time = data.get('time')  # e.g. "14:30" or ISO string
    if custom_time:
        record.check_in_time = _parse_custom_time(custom_time, today)
    else:
        record.check_in_time = utc_now()

    db.session.add(record)
    db.session.commit()

    # WhatsApp notification: attendence_daily
    wa_config = WhatsAppScheduleConfig.get_current()
    if wa_config.checkin_alert_enabled:
        check_in_local = record.check_in_time.replace(tzinfo=tz.utc).astimezone(OFFICE_TZ)
        send_whatsapp_async(
            template_name="attendence_daily",
            params=[
                "Team",               # {{1}} Admin/recipient name
                user.name,            # {{2}} Employee name
                check_in_local.strftime("%-I:%M %p"),  # {{3}} Check-in time
                "Office",             # {{4}} Location
            ],
        )

    return jsonify({
        'message': 'Check-in successful',
        'check_in_time': to_utc_iso(record.check_in_time)
    }), 200

@attendance_bp.route('/check-out', methods=['POST'])
@token_required
def check_out(user):
    today = office_today()
    record = Attendance.query.filter_by(user_id=user.id, date=today).first()
    if not record or not record.check_in_time:
        return jsonify({'message': 'You must check-in before check-out'}), 400
    if record.check_out_time:
        return jsonify({'message': 'Already checked out today'}), 400

    # Accept optional custom time from frontend
    data = request.get_json(silent=True) or {}
    custom_time = data.get('time')  # e.g. "18:30" or ISO string
    if custom_time:
        record.check_out_time = _parse_custom_time(custom_time, today)
    else:
        record.check_out_time = utc_now()

    db.session.commit()

    # Compute total hours
    delta = record.check_out_time - record.check_in_time
    total_hours = round(delta.total_seconds() / 3600, 1)

    # WhatsApp notification: attendence_daily_v2
    wa_config = WhatsAppScheduleConfig.get_current()
    if wa_config.checkout_alert_enabled:
        check_out_local = record.check_out_time.replace(tzinfo=tz.utc).astimezone(OFFICE_TZ)
        send_whatsapp_async(
            template_name="attendence_daily_v2",
            params=[
                "Team",               # {{1}} Admin/recipient name
                user.name,            # {{2}} Employee name
                check_out_local.strftime("%-I:%M %p"),  # {{3}} Check-out time
                f"{total_hours}h",    # {{4}} Total hours
            ],
        )

    return jsonify({
        'message': 'Check-out successful',
        'check_out_time': to_utc_iso(record.check_out_time)
    }), 200


@attendance_bp.route('/overtime', methods=['POST'])
@token_required
def toggle_overtime(user):
    """Toggle overtime flag for today's attendance record."""
    today = office_today()
    record = Attendance.query.filter_by(user_id=user.id, date=today).first()
    if not record or not record.check_in_time:
        return jsonify({'error': 'You must be checked in to mark overtime'}), 400
    if record.check_out_time:
        return jsonify({'error': 'Already checked out for the day'}), 400

    record.is_overtime = not record.is_overtime
    db.session.commit()

    return jsonify({
        'message': f"Overtime {'enabled' if record.is_overtime else 'disabled'}",
        'is_overtime': record.is_overtime,
    }), 200

@attendance_bp.route('/history', methods=['GET'])
@token_required
def attendance_history(user):
    records = Attendance.query.filter_by(user_id=user.id).order_by(Attendance.date.desc()).all()
    history = []

    for record in records:
        history.append({
            'date': record.date.isoformat(),
            'check_in_time': to_utc_iso(record.check_in_time),
            'check_out_time': to_utc_iso(record.check_out_time)
        })

    return jsonify({'history': history}), 200

@attendance_bp.route('/weekly-hours', methods=['GET'])
@token_required
def weekly_hours(user):
    today = office_today()
    # Monday = 0 … Sunday = 6
    week_start = today - timedelta(days=today.weekday())  # Monday
    week_end = week_start + timedelta(days=6)             # Sunday

    records = Attendance.query.filter(
        Attendance.user_id == user.id,
        Attendance.date >= week_start,
        Attendance.date <= week_end,
    ).all()

    total_seconds = 0
    now_utc = datetime.now(timezone.utc)

    for r in records:
        if not r.check_in_time:
            continue
        check_in = r.check_in_time
        if r.check_out_time:
            check_out = r.check_out_time
        elif r.date == today:
            # Still checked in today — count hours up to "now"
            check_out = now_utc.replace(tzinfo=None)  # match naive UTC stored in DB
        else:
            continue  # past day without check-out — skip
        total_seconds += (check_out - check_in).total_seconds()

    total_hours = round(total_seconds / 3600, 1)

    return jsonify({
        'weekly_hours': total_hours,
        'week_start': week_start.isoformat(),
        'week_end': week_end.isoformat(),
    }), 200

@attendance_bp.route('/status', methods=['GET'])
@token_required
def attendance_status(user):
    today = office_today()
    record = Attendance.query.filter_by(user_id=user.id, date=today).first()

    if not record:
        return jsonify({'status': 'not_checked_in'}), 200
    elif record.check_in_time and not record.check_out_time:
        return jsonify({
            'status': 'checked_in_only',
            'check_in_time': to_utc_iso(record.check_in_time),
            'is_overtime': record.is_overtime,
        }), 200
    elif record.check_in_time and record.check_out_time:
        return jsonify({
            'status': 'checked_in_and_out',
            'check_in_time': to_utc_iso(record.check_in_time),
            'check_out_time': to_utc_iso(record.check_out_time),
            'is_overtime': record.is_overtime,
        }), 200
    else:
        return jsonify({'status': 'inconsistent_record'}), 500
