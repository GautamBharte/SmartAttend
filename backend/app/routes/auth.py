from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from app.routes.attendance import token_required
from app.app import db
from app.models.user import User
from app.models.otp import OTP as OTPModel
from app.mail import send_html_email, is_smtp_configured
import jwt
import datetime
import os

auth_bp = Blueprint('auth', __name__)

SECRET_KEY = os.getenv("SECRET_KEY", "secret-dev")


# ── Registration / Login ──────────────────────────────────────────────

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'employee')

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


# ── Profile (name / email) ────────────────────────────────────────────

@auth_bp.route('/profile', methods=['PATCH'])
@token_required
def update_profile(user):
    """Update profile fields that don't need OTP (currently just name).
    Email changes go through the /request-email-otp → /verify-otp-change-email flow.
    """
    data = request.get_json()
    name = data.get("name")

    if name:
        user.name = name

    db.session.commit()
    return jsonify({
        "message": "Profile updated",
        "name": user.name,
        "email": user.email,
    }), 200


@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_profile(user):
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat(),
    }), 200


# ── OTP email templates ────────────────────────────────────────────────

def _otp_email_html(code: str, name: str, purpose_title: str, purpose_desc: str) -> str:
    """Build a styled HTML email body for any OTP purpose."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
      <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:24px 28px;color:#fff;">
          <h1 style="margin:0;font-size:20px;">{purpose_title}</h1>
        </div>
        <div style="padding:24px 28px;">
          <p style="margin:0 0 16px;color:#374151;">Hi <strong>{name}</strong>,</p>
          <p style="margin:0 0 20px;color:#374151;">{purpose_desc} It expires in <strong>10 minutes</strong>.</p>
          <div style="text-align:center;margin:24px 0;">
            <span style="display:inline-block;font-size:32px;letter-spacing:8px;font-weight:700;color:#4f46e5;
                         background:#eef2ff;border:2px dashed #a5b4fc;border-radius:8px;padding:12px 28px;">
              {code}
            </span>
          </div>
          <p style="margin:0;color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div style="background:#f8fafc;padding:14px 28px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
          SmartAttend &middot; Do not share this code with anyone
        </div>
      </div>
    </body>
    </html>
    """


# ── Forgot / reset password (unauthenticated, OTP to email) ──────────

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send a 6-digit OTP to the user's email so they can reset their password."""
    if not is_smtp_configured():
        return jsonify({'error': 'Email service is not configured. Contact your administrator.'}), 503

    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't reveal whether the email exists — always return success
        return jsonify({'message': f'If an account with that email exists, an OTP has been sent.'}), 200

    otp = OTPModel.generate(user.id, purpose='forgot_password')

    html = _otp_email_html(
        otp.code, user.name,
        "🔑 Password Reset OTP",
        "Use the code below to reset your SmartAttend password.",
    )
    send_html_email(
        subject="Your SmartAttend password reset OTP",
        html_body=html,
        recipients=[user.email],
    )

    return jsonify({'message': f'If an account with that email exists, an OTP has been sent.'}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Verify OTP and set a new password — no login required."""
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    otp_code = data.get('otp')
    new_password = data.get('new_password')

    if not all([email, otp_code, new_password]):
        return jsonify({'error': 'Email, OTP, and new password are required'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Invalid email or OTP'}), 400

    if not OTPModel.verify(user.id, otp_code, purpose='forgot_password'):
        return jsonify({'error': 'Invalid or expired OTP'}), 400

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({'message': 'Password reset successfully. You can now log in with your new password.'}), 200


# ── OTP-based password change ─────────────────────────────────────────

@auth_bp.route('/request-otp', methods=['POST'])
@token_required
def request_otp(user):
    """Send a 6-digit OTP to the logged-in user's email for password change."""
    if not is_smtp_configured():
        return jsonify({'error': 'Email service is not configured. Contact your administrator.'}), 503

    otp = OTPModel.generate(user.id, purpose='password_change')

    html = _otp_email_html(
        otp.code, user.name,
        "🔐 Password Change OTP",
        "Use the code below to change your password.",
    )
    send_html_email(
        subject="Your SmartAttend password change OTP",
        html_body=html,
        recipients=[user.email],
    )

    return jsonify({'message': f'OTP sent to {user.email}'}), 200


@auth_bp.route('/verify-otp-change-password', methods=['POST'])
@token_required
def verify_otp_change_password(user):
    """Verify the OTP and change the user's password in one step."""
    data = request.get_json()
    otp_code = data.get('otp')
    new_password = data.get('new_password')

    if not otp_code or not new_password:
        return jsonify({'error': 'OTP and new password are required'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if not OTPModel.verify(user.id, otp_code, purpose='password_change'):
        return jsonify({'error': 'Invalid or expired OTP'}), 400

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({'message': 'Password changed successfully'}), 200


# ── OTP-based email change ────────────────────────────────────────────

@auth_bp.route('/request-email-otp', methods=['POST'])
@token_required
def request_email_otp(user):
    """Send a 6-digit OTP to the NEW email address for verification."""
    if not is_smtp_configured():
        return jsonify({'error': 'Email service is not configured. Contact your administrator.'}), 503

    data = request.get_json()
    new_email = (data.get('new_email') or '').strip().lower()

    if not new_email:
        return jsonify({'error': 'New email is required'}), 400

    if new_email == user.email:
        return jsonify({'error': 'New email is the same as current email'}), 400

    if User.query.filter_by(email=new_email).first():
        return jsonify({'error': 'This email is already in use'}), 400

    otp = OTPModel.generate(user.id, purpose='email_change')

    html = _otp_email_html(
        otp.code, user.name,
        "📧 Email Change Verification",
        f"Use the code below to verify your new email address <strong>{new_email}</strong>.",
    )
    # Send to the NEW email so the user proves they own it
    send_html_email(
        subject="Verify your new SmartAttend email",
        html_body=html,
        recipients=[new_email],
    )

    return jsonify({'message': f'OTP sent to {new_email}'}), 200


@auth_bp.route('/verify-otp-change-email', methods=['POST'])
@token_required
def verify_otp_change_email(user):
    """Verify the OTP and update the user's email."""
    data = request.get_json()
    otp_code = data.get('otp')
    new_email = (data.get('new_email') or '').strip().lower()

    if not otp_code or not new_email:
        return jsonify({'error': 'OTP and new email are required'}), 400

    if User.query.filter_by(email=new_email).first():
        return jsonify({'error': 'This email is already in use'}), 400

    if not OTPModel.verify(user.id, otp_code, purpose='email_change'):
        return jsonify({'error': 'Invalid or expired OTP'}), 400

    user.email = new_email
    db.session.commit()

    return jsonify({
        'message': 'Email changed successfully',
        'email': user.email,
    }), 200
