from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from app.routes.attendance import token_required
import secrets
from app.app import db
from app.models.user import User
import jwt
import datetime
import os

auth_bp = Blueprint('auth', __name__)

SECRET_KEY = os.getenv("SECRET_KEY", "secret-dev")

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'employee')  # default to employee

    if not all([name, email, password]):
        return jsonify({'error': 'Missing required fields'}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'Email already registered'}), 400

    hashed_pw = generate_password_hash(password)

    new_user = User(name=name, email=email, password_hash=hashed_pw, role=role)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }, SECRET_KEY, algorithm='HS256')

    return jsonify({'token': token})

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password(user):
    data = request.get_json()
    current_pw = data.get("current_password")
    new_pw = data.get("new_password")

    if not all([current_pw, new_pw]):
        return jsonify({"error": "Missing fields"}), 400

    if not check_password_hash(user.password_hash, current_pw):
        return jsonify({"error": "Current password is incorrect"}), 403

    user.password_hash = generate_password_hash(new_pw)
    db.session.commit()

    return jsonify({"message": "Password changed successfully"}), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    # In real app: send OTP or link via email
    reset_token = secrets.token_hex(16)

    return jsonify({"message": "Reset token generated", "reset_token": reset_token}), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get("email")
    new_pw = data.get("new_password")

    if not all([email, new_pw]):
        return jsonify({"error": "Email and new password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.password_hash = generate_password_hash(new_pw)
    db.session.commit()

    return jsonify({"message": "Password reset successfully"}), 200

@auth_bp.route('/profile', methods=['PATCH'])
@token_required
def update_profile(user):
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")

    if email and email != user.email:
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already in use"}), 400
        user.email = email

    if name:
        user.name = name

    db.session.commit()
    return jsonify({"message": "Profile updated", "name": user.name, "email": user.email}), 200

@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_profile(user):
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat()
    }), 200
