from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.leave import Leave
from app.models.tour import Tour
from app.models.user import User
from datetime import datetime
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

@leave_tour_bp.route('/leave/apply', methods=['POST'])
@token_required
def apply_leave(user):
    data = request.get_json()
    start = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    end = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    reason = data.get('reason', '')

    leave = Leave(user_id=user.id, start_date=start, end_date=end, reason=reason)
    db.session.add(leave)
    db.session.commit()
    return jsonify({'message': 'Leave applied'}), 201

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

@leave_tour_bp.route('/leave', methods=['GET'])
@token_required
def view_leaves(user):
    leaves = Leave.query.filter_by(user_id=user.id).order_by(Leave.start_date.desc()).all()
    return jsonify([{
        'id': l.id,
        'start_date': l.start_date.isoformat(),
        'end_date': l.end_date.isoformat(),
        'reason': l.reason,
        'status': l.status
    } for l in leaves]), 200

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
