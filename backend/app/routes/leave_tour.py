from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.leave import Leave
from app.models.tour import Tour
from app.models.user import User
from app.models.holiday import Holiday
from app.models.leave_balance import LeaveBalance, ANNUAL_PAID_LEAVES
from app.holidays import count_working_days
from app.office_config import office_today
from datetime import datetime, date
from functools import wraps
import jwt
import os

leave_tour_bp = Blueprint('leave_tour', __name__)
SECRET_KEY = os.getenv("SECRET_KEY", "secret-dev")

def admin_required(f):
    @wraps(f)
    def wrapper(user, *args, **kwargs):
        if user.role != 'admin':
            return jsonify({"error": "Admin access required"}), 403
        return f(user, *args, **kwargs)
    return wrapper

def token_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Missing token"}), 401
        try:
            data = jwt.decode(token.split()[1], SECRET_KEY, algorithms=["HS256"])
            user = User.query.get(data["user_id"])
        except:
            return jsonify({"error": "Invalid token"}), 401
        return f(user, *args, **kwargs)
    return wrapper


# ── Helpers ────────────────────────────────────────────────────────────

def _get_or_create_balance(user_id: int, year: int) -> LeaveBalance:
    """Return (or auto-create) the LeaveBalance row for this user+year."""
    bal = LeaveBalance.query.filter_by(user_id=user_id, year=year).first()
    if not bal:
        bal = LeaveBalance(user_id=user_id, year=year, total_leaves=ANNUAL_PAID_LEAVES)
        db.session.add(bal)
        db.session.flush()
    return bal


def _compute_balance(user_id: int, year: int):
    """Compute leave balance summary for *user_id* in *year*."""
    bal = _get_or_create_balance(user_id, year)

    # Sum working_days from approved paid leaves in this year
    used = db.session.query(
        db.func.coalesce(db.func.sum(Leave.working_days), 0)
    ).filter(
        Leave.user_id == user_id,
        Leave.leave_type == 'paid',
        Leave.status == 'approved',
        db.extract('year', Leave.start_date) == year,
    ).scalar()

    # Sum working_days from pending paid leaves in this year
    pending = db.session.query(
        db.func.coalesce(db.func.sum(Leave.working_days), 0)
    ).filter(
        Leave.user_id == user_id,
        Leave.leave_type == 'paid',
        Leave.status == 'pending',
        db.extract('year', Leave.start_date) == year,
    ).scalar()

    available = bal.total_leaves - used - pending

    return {
        'year': year,
        'total': bal.total_leaves,
        'used': int(used),
        'pending': int(pending),
        'available': max(int(available), 0),
    }


# ── Leave endpoints ───────────────────────────────────────────────────

@leave_tour_bp.route('/leave/balance', methods=['GET'])
@token_required
def leave_balance(user):
    """Return the employee's paid-leave balance for the requested year."""
    year = request.args.get('year', default=office_today().year, type=int)
    balance = _compute_balance(user.id, year)
    return jsonify(balance), 200


@leave_tour_bp.route('/leave/apply', methods=['POST'])
@token_required
def apply_leave(user):
    data = request.get_json()
    start = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    end = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    reason = data.get('reason', '')
    leave_type = data.get('leave_type', 'paid')  # paid | unpaid

    if start > end:
        return jsonify({'error': 'Start date must be before end date'}), 400

    # Calculate working days (exclude Sundays + holidays)
    working_days = count_working_days(start, end)

    if working_days == 0:
        return jsonify({'error': 'Selected dates contain no working days (only Sundays / holidays)'}), 400

    # Validate balance for paid leaves
    if leave_type == 'paid':
        year = start.year
        balance = _compute_balance(user.id, year)
        if working_days > balance['available']:
            return jsonify({
                'error': (
                    f'Insufficient paid leave balance. '
                    f'Requested {working_days} day(s), available {balance["available"]} day(s).'
                ),
                'balance': balance,
            }), 400

    leave = Leave(
        user_id=user.id,
        start_date=start,
        end_date=end,
        reason=reason,
        leave_type=leave_type,
        working_days=working_days,
    )
    db.session.add(leave)
    db.session.commit()

    return jsonify({
        'message': f'Leave applied ({working_days} working day(s))',
        'working_days': working_days,
    }), 201


@leave_tour_bp.route('/leave', methods=['GET'])
@token_required
def view_leaves(user):
    leaves = Leave.query.filter_by(user_id=user.id).order_by(Leave.start_date.desc()).all()
    return jsonify([{
        'id': l.id,
        'start_date': l.start_date.isoformat(),
        'end_date': l.end_date.isoformat(),
        'reason': l.reason,
        'status': l.status,
        'leave_type': l.leave_type or 'paid',
        'working_days': l.working_days or 0,
        'created_at': l.created_at.isoformat() if l.created_at else None,
    } for l in leaves]), 200


@leave_tour_bp.route('/leave/<int:leave_id>/status', methods=['PATCH'])
@token_required
@admin_required
def update_leave_status(admin_user, leave_id):
    data = request.get_json()
    status = data.get('status')  # 'approved' or 'rejected'
    if status not in ['approved', 'rejected']:
        return jsonify({'error': 'Invalid status'}), 400

    leave = Leave.query.get_or_404(leave_id)
    leave.status = status
    db.session.commit()
    return jsonify({'message': f'Leave marked as {status}'}), 200


# ── Holiday endpoints ─────────────────────────────────────────────────

@leave_tour_bp.route('/holidays', methods=['GET'])
@token_required
def list_holidays(user):
    """Return holidays for the requested year."""
    year = request.args.get('year', default=office_today().year, type=int)
    holidays = Holiday.query.filter(
        db.extract('year', Holiday.date) == year
    ).order_by(Holiday.date).all()

    return jsonify([{
        'date': h.date.isoformat(),
        'name': h.name,
        'type': h.holiday_type,
    } for h in holidays]), 200


@leave_tour_bp.route('/weekend-config', methods=['GET'])
@token_required
def get_weekend_config(user):
    """Return current weekend configuration (read-only for employees)."""
    from app.models.weekend_config import WeekendConfig
    config = WeekendConfig.get_current()
    weekend_days = config.get_weekend_set()
    return jsonify({
        'weekend_days': list(weekend_days),
    }), 200


# ── Tour endpoints ────────────────────────────────────────────────────

@leave_tour_bp.route('/tour/apply', methods=['POST'])
@token_required
def apply_tour(user):
    data = request.get_json()
    start = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    end = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    location = data.get('location')
    reason = data.get('reason', '')

    if not location:
        return jsonify({'error': 'Location required'}), 400

    tour = Tour(user_id=user.id, start_date=start, end_date=end, location=location, reason=reason)
    db.session.add(tour)
    db.session.commit()
    return jsonify({'message': 'Tour applied'}), 201


@leave_tour_bp.route('/tour', methods=['GET'])
@token_required
def view_tours(user):
    tours = Tour.query.filter_by(user_id=user.id).order_by(Tour.start_date.desc()).all()
    return jsonify([{
        'id': t.id,
        'start_date': t.start_date.isoformat(),
        'end_date': t.end_date.isoformat(),
        'location': t.location,
        'reason': t.reason,
        'status': t.status
    } for t in tours]), 200


@leave_tour_bp.route('/tour/<int:tour_id>/status', methods=['PATCH'])
@token_required
@admin_required
def update_tour_status(admin_user, tour_id):
    data = request.get_json()
    status = data.get('status')  # 'approved' or 'rejected'
    if status not in ['approved', 'rejected']:
        return jsonify({'error': 'Invalid status'}), 400

    tour = Tour.query.get_or_404(tour_id)
    tour.status = status
    db.session.commit()
    return jsonify({'message': f'Tour marked as {status}'}), 200
