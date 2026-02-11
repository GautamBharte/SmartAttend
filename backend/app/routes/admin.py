from flask import Blueprint, request, jsonify, Response
from werkzeug.security import generate_password_hash
from app.models.user import User
from app.models.leave import Leave
from app.models.tour import Tour
from app.models.attendance import Attendance
from app.models.holiday import Holiday
from app.models.leave_balance import LeaveBalance, ANNUAL_PAID_LEAVES
from app.models.weekend_config import WeekendConfig
from app.app import db
from app.routes.auth import token_required
from app.office_config import office_today, to_utc_iso
from app.holidays import seed_holidays
from datetime import date, datetime
import jwt, os, csv, io
from functools import wraps

admin_bp = Blueprint('admin', __name__)
SECRET_KEY = os.getenv("SECRET_KEY", "secret-dev")

def admin_required(f):
    @wraps(f)
    @token_required
    def wrapper(user, *args, **kwargs):
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return wrapper

def apply_filters(query, model):
    # Pagination
    top = request.args.get("top", type=int)
    skip = request.args.get("skip", type=int)

    # Ordering
    order_by = request.args.get("orderBy", "id")
    direction = request.args.get("direction", "asc")

    # Search (basic)
    search = request.args.get("search")
    if search and hasattr(model, "name"):
        query = query.filter(model.name.ilike(f"%{search}%"))

    # Field-based filters
    for key in request.args:
        if hasattr(model, key) and key not in ['top', 'skip', 'orderBy', 'direction', 'search']:
            value = request.args.get(key)
            query = query.filter(getattr(model, key) == value)

    # Order
    if hasattr(model, order_by):
        column = getattr(model, order_by)
        query = query.order_by(column.desc() if direction == "desc" else column.asc())

    # Pagination
    if skip:
        query = query.offset(skip)
    if top:
        query = query.limit(top)

    return query

@admin_bp.route("/admin/employees", methods=["GET"])
@admin_required
def get_employees():
    query = User.query.filter(User.role == "employee")
    query = apply_filters(query, User)
    employees = query.all()

    today = office_today()
    result = []
    for emp in employees:
        record = Attendance.query.filter_by(user_id=emp.id, date=today).first()
        if record and record.check_in_time:
            today_status = "checked_out" if record.check_out_time else "checked_in"
        else:
            today_status = "absent"

        result.append({
            "id": emp.id,
            "name": emp.name,
            "email": emp.email,
            "created_at": emp.created_at.isoformat(),
            "today_status": today_status,
            "check_in_time": to_utc_iso(record.check_in_time) if record else None,
            "check_out_time": to_utc_iso(record.check_out_time) if record else None,
        })

    return jsonify(result), 200


@admin_bp.route("/admin/leaves", methods=["GET"])
@admin_required
def get_leaves():
    query = Leave.query
    query = apply_filters(query, Leave)
    leaves = query.all()
    return jsonify([{
        "id": leave.id,
        "user_id": leave.user_id,
        "start_date": leave.start_date.isoformat(),
        "end_date": leave.end_date.isoformat(),
        "status": leave.status,
        "reason": leave.reason,
        "leave_type": leave.leave_type or "paid",
        "working_days": leave.working_days or 0,
    } for leave in leaves]), 200


@admin_bp.route("/admin/tours", methods=["GET"])
@admin_required
def get_tours():
    query = Tour.query
    query = apply_filters(query, Tour)
    tours = query.all()
    return jsonify([{
        "id": tour.id,
        "user_id": tour.user_id,
        "start_date": tour.start_date.isoformat(),
        "end_date": tour.end_date.isoformat(),
        "location": tour.location,
        "status": tour.status,
        "reason": tour.reason
    } for tour in tours]), 200


# ── CSV Bulk Upload ───────────────────────────────────────────────────
REQUIRED_CSV_COLUMNS = {'name', 'email', 'password'}
OPTIONAL_CSV_COLUMNS = {'role'}


@admin_bp.route("/admin/employees/csv-template", methods=["GET"])
@admin_required
def csv_template():
    """Return a CSV template file for bulk employee upload."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['name', 'email', 'password', 'role'])
    writer.writerow(['John Doe', 'john@example.com', 'securePass123', 'employee'])
    writer.writerow(['Jane Smith', 'jane@example.com', 'securePass456', 'employee'])

    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=employee_template.csv'}
    )


@admin_bp.route("/admin/employees/bulk-upload", methods=["POST"])
@admin_required
def bulk_upload_employees():
    """
    Accept a CSV file with columns: name, email, password, role (optional).
    Creates employee accounts in bulk.
    Returns a summary of created, skipped (duplicate), and errored rows.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not file.filename or not file.filename.lower().endswith('.csv'):
        return jsonify({'error': 'File must be a .csv'}), 400

    try:
        stream = io.StringIO(file.stream.read().decode('utf-8-sig'))  # handle BOM
        reader = csv.DictReader(stream)
    except Exception as e:
        return jsonify({'error': f'Failed to parse CSV: {str(e)}'}), 400

    # Validate columns
    if reader.fieldnames is None:
        return jsonify({'error': 'CSV file is empty'}), 400

    headers = set(h.strip().lower() for h in reader.fieldnames)
    missing = REQUIRED_CSV_COLUMNS - headers
    if missing:
        return jsonify({
            'error': f'Missing required columns: {", ".join(sorted(missing))}. '
                     f'Required: name, email, password. Optional: role.'
        }), 400

    created = []
    skipped = []
    errors = []

    for row_num, raw_row in enumerate(reader, start=2):  # row 1 = header
        # Normalise keys
        row = {k.strip().lower(): (v.strip() if v else '') for k, v in raw_row.items()}

        name = row.get('name', '')
        email = row.get('email', '')
        password = row.get('password', '')
        role = row.get('role', 'employee').lower() or 'employee'

        # Validate row
        if not name or not email or not password:
            errors.append({'row': row_num, 'email': email or '(empty)', 'reason': 'Missing name, email, or password'})
            continue

        if role not in ('employee', 'admin'):
            role = 'employee'

        # Check for duplicate
        if User.query.filter_by(email=email).first():
            skipped.append({'row': row_num, 'email': email, 'reason': 'Email already exists'})
            continue

        try:
            new_user = User(
                name=name,
                email=email,
                password_hash=generate_password_hash(password),
                role=role,
            )
            db.session.add(new_user)
            created.append({'row': row_num, 'email': email, 'name': name})
        except Exception as e:
            errors.append({'row': row_num, 'email': email, 'reason': str(e)})

    # Commit all at once
    if created:
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

    return jsonify({
        'message': f'{len(created)} employee(s) created successfully',
        'created': created,
        'skipped': skipped,
        'errors': errors,
        'summary': {
            'total_rows': len(created) + len(skipped) + len(errors),
            'created': len(created),
            'skipped': len(skipped),
            'errors': len(errors),
        }
    }), 201 if created else 200


# ── Manual daily report trigger ───────────────────────────────────────

@admin_bp.route("/admin/send-daily-report", methods=["POST"])
@admin_required
def trigger_daily_report():
    """Let an admin manually trigger the daily attendance report email."""
    from app.daily_report import generate_report_html
    from app.mail import send_html_email, is_mail_configured

    if not is_mail_configured():
        return jsonify({'error': 'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, REPORT_RECIPIENTS in .env'}), 400

    subject, html = generate_report_html()
    send_html_email(subject, html)
    return jsonify({'message': 'Daily report sent successfully'}), 200


@admin_bp.route("/admin/preview-daily-report", methods=["GET"])
def preview_daily_report():
    """Return the daily report as HTML for preview (no email sent).
    Accepts token via Authorization header OR ?token= query param (for browser tab).
    """
    from app.daily_report import generate_report_html

    # Support both header and query-param auth (for opening in a new tab)
    token = request.headers.get('Authorization')
    if token:
        token = token.split()[-1]
    else:
        token = request.args.get('token')

    if not token:
        return jsonify({'error': 'Missing token'}), 401

    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user = User.query.get(data['user_id'])
        if not user or user.role != 'admin':
            raise Exception("Not authorized")
    except Exception:
        return jsonify({'error': 'Invalid or expired token'}), 401

    _subject, html = generate_report_html()
    return Response(html, mimetype='text/html')


# ── Holiday management (admin) ────────────────────────────────────────

@admin_bp.route("/admin/holidays", methods=["GET"])
@admin_required
def admin_list_holidays():
    """List holidays for a given year."""
    year = request.args.get('year', default=office_today().year, type=int)
    holidays = Holiday.query.filter(
        db.extract('year', Holiday.date) == year
    ).order_by(Holiday.date).all()

    return jsonify([{
        'id': h.id,
        'date': h.date.isoformat(),
        'name': h.name,
        'type': h.holiday_type,
    } for h in holidays]), 200


@admin_bp.route("/admin/holidays", methods=["POST"])
@admin_required
def admin_add_holiday():
    """Add a new holiday."""
    data = request.get_json()
    d = datetime.strptime(data['date'], '%Y-%m-%d').date()
    name = data.get('name', '')
    holiday_type = data.get('type', 'gazetted')

    if Holiday.query.filter_by(date=d).first():
        return jsonify({'error': 'Holiday already exists on this date'}), 409

    h = Holiday(date=d, name=name, holiday_type=holiday_type)
    db.session.add(h)
    db.session.commit()
    return jsonify({'message': 'Holiday added', 'id': h.id}), 201


@admin_bp.route("/admin/holidays/<int:holiday_id>", methods=["DELETE"])
@admin_required
def admin_delete_holiday(holiday_id):
    """Remove a holiday."""
    h = Holiday.query.get_or_404(holiday_id)
    db.session.delete(h)
    db.session.commit()
    return jsonify({'message': 'Holiday deleted'}), 200


@admin_bp.route("/admin/holidays/seed", methods=["POST"])
@admin_required
def admin_seed_holidays():
    """Seed default Indian public holidays for a year."""
    year = request.get_json().get('year', office_today().year)
    count = seed_holidays(year)
    return jsonify({'message': f'{count} holiday(s) seeded for {year}'}), 201


# ── Leave balance management (admin) ──────────────────────────────────

@admin_bp.route("/admin/leave-balance/<int:user_id>", methods=["GET"])
@admin_required
def admin_get_leave_balance(user_id):
    """View an employee's leave balance."""
    year = request.args.get('year', default=office_today().year, type=int)
    bal = LeaveBalance.query.filter_by(user_id=user_id, year=year).first()

    if not bal:
        bal = LeaveBalance(user_id=user_id, year=year, total_leaves=ANNUAL_PAID_LEAVES)
        db.session.add(bal)
        db.session.commit()

    # Compute used + pending
    used = db.session.query(
        db.func.coalesce(db.func.sum(Leave.working_days), 0)
    ).filter(
        Leave.user_id == user_id,
        Leave.leave_type == 'paid',
        Leave.status == 'approved',
        db.extract('year', Leave.start_date) == year,
    ).scalar()

    pending = db.session.query(
        db.func.coalesce(db.func.sum(Leave.working_days), 0)
    ).filter(
        Leave.user_id == user_id,
        Leave.leave_type == 'paid',
        Leave.status == 'pending',
        db.extract('year', Leave.start_date) == year,
    ).scalar()

    return jsonify({
        'user_id': user_id,
        'year': year,
        'total': bal.total_leaves,
        'used': int(used),
        'pending': int(pending),
        'available': max(bal.total_leaves - int(used) - int(pending), 0),
    }), 200


@admin_bp.route("/admin/leave-balance/<int:user_id>", methods=["PATCH"])
@admin_required
def admin_update_leave_balance(user_id):
    """Admin can adjust the total paid leaves for an employee."""
    data = request.get_json()
    year = data.get('year', office_today().year)
    total = data.get('total_leaves')

    if total is None:
        return jsonify({'error': 'total_leaves is required'}), 400

    bal = LeaveBalance.query.filter_by(user_id=user_id, year=year).first()
    if not bal:
        bal = LeaveBalance(user_id=user_id, year=year, total_leaves=total)
        db.session.add(bal)
    else:
        bal.total_leaves = total

    db.session.commit()
    return jsonify({'message': f'Leave balance updated to {total} for year {year}'}), 200


# ── Weekend configuration (admin) ────────────────────────────────────

@admin_bp.route("/admin/weekend-config", methods=["GET"])
@admin_required
def admin_get_weekend_config():
    """Get current weekend configuration."""
    config = WeekendConfig.get_current()
    weekend_days = config.get_weekend_set()
    return jsonify({
        'weekend_days': list(weekend_days),
        'weekend_days_string': config.weekend_days,
    }), 200


@admin_bp.route("/admin/weekend-config", methods=["PATCH"])
@admin_required
def admin_update_weekend_config():
    """Update weekend configuration.
    Expects: { "weekend_days": [0, 6] } where 0=Monday, 6=Sunday
    """
    data = request.get_json()
    weekend_days_list = data.get('weekend_days', [6])  # Default: Sunday only

    if not isinstance(weekend_days_list, list):
        return jsonify({'error': 'weekend_days must be a list'}), 400

    # Validate: must be integers 0-6
    for day in weekend_days_list:
        if not isinstance(day, int) or day < 0 or day > 6:
            return jsonify({'error': f'Invalid weekday: {day}. Must be 0-6 (Monday=0, Sunday=6)'}), 400

    # Store as comma-separated string
    weekend_days_str = ','.join(str(d) for d in sorted(set(weekend_days_list)))

    config = WeekendConfig.query.first()
    if not config:
        config = WeekendConfig(weekend_days=weekend_days_str)
        db.session.add(config)
    else:
        config.weekend_days = weekend_days_str

    db.session.commit()
    return jsonify({
        'message': 'Weekend configuration updated',
        'weekend_days': sorted(set(weekend_days_list)),
        'weekend_days_string': weekend_days_str,
    }), 200
