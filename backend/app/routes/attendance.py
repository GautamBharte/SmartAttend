from flask import Blueprint, request, jsonify
from datetime import datetime, date
from app.app import db
from app.models.attendance import Attendance
from app.models.user import User
import jwt
import os
from functools import wraps

attendance_bp = Blueprint('attendance', __name__)
SECRET_KEY = os.getenv("SECRET_KEY", "secret-dev")

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
    today = date.today()
    record = Attendance.query.filter_by(user_id=user.id, date=today).first()
    if record and record.check_in_time:
        return jsonify({'message': 'Already checked in today'}), 400

    if not record:
        record = Attendance(user_id=user.id, date=today)

    record.check_in_time = datetime.utcnow()
    db.session.add(record)
    db.session.commit()
    return jsonify({'message': 'Check-in successful', 'check_in_time': record.check_in_time.isoformat()}), 200

@attendance_bp.route('/check-out', methods=['POST'])
@token_required
def check_out(user):
    today = date.today()
    record = Attendance.query.filter_by(user_id=user.id, date=today).first()
    if not record or not record.check_in_time:
        return jsonify({'message': 'You must check-in before check-out'}), 400
    if record.check_out_time:
        return jsonify({'message': 'Already checked out today'}), 400

    record.check_out_time = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Check-out successful', 'check_out_time': record.check_out_time.isoformat()}), 200

@attendance_bp.route('/history', methods=['GET'])
@token_required
def attendance_history(user):
    records = Attendance.query.filter_by(user_id=user.id).order_by(Attendance.date.desc()).all()
    history = []

    for record in records:
        history.append({
            'date': record.date.isoformat(),
            'check_in_time': record.check_in_time.isoformat() if record.check_in_time else None,
            'check_out_time': record.check_out_time.isoformat() if record.check_out_time else None
        })

    return jsonify({'history': history}), 200

@attendance_bp.route('/status', methods=['GET'])
@token_required
def attendance_status(user):
    today = date.today()
    record = Attendance.query.filter_by(user_id=user.id, date=today).first()

    if not record:
        return jsonify({'status': 'not_checked_in'}), 200
    elif record.check_in_time and not record.check_out_time:
        return jsonify({'status': 'checked_in_only', 'check_in_time': record.check_in_time.isoformat()}), 200
    elif record.check_in_time and record.check_out_time:
        return jsonify({
            'status': 'checked_in_and_out',
            'check_in_time': record.check_in_time.isoformat(),
            'check_out_time': record.check_out_time.isoformat()
        }), 200
    else:
        # Very rare edge case: check_out_time without check_in
        return jsonify({'status': 'inconsistent_record'}), 500
