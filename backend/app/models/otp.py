from app.extensions import db
from datetime import datetime, timedelta


class OTP(db.Model):
    __tablename__ = 'otps'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    code = db.Column(db.String(6), nullable=False)
    purpose = db.Column(db.String(30), nullable=False, default='password_change')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

    # OTP valid for 10 minutes
    OTP_VALIDITY_MINUTES = 10

    @staticmethod
    def generate(user_id: int, purpose: str = 'password_change') -> 'OTP':
        """Create a new 6-digit OTP for the given user, invalidating old ones."""
        import random

        # Invalidate any existing unused OTPs for this user + purpose
        OTP.query.filter_by(user_id=user_id, purpose=purpose, used=False).update({'used': True})
        db.session.flush()

        code = f"{random.randint(0, 999999):06d}"
        otp = OTP(
            user_id=user_id,
            code=code,
            purpose=purpose,
            expires_at=datetime.utcnow() + timedelta(minutes=OTP.OTP_VALIDITY_MINUTES),
        )
        db.session.add(otp)
        db.session.commit()
        return otp

    @staticmethod
    def verify(user_id: int, code: str, purpose: str = 'password_change') -> bool:
        """Verify an OTP. Returns True if valid, False otherwise."""
        otp = (
            OTP.query
            .filter_by(user_id=user_id, code=code, purpose=purpose, used=False)
            .order_by(OTP.created_at.desc())
            .first()
        )
        if not otp:
            return False
        if datetime.utcnow() > otp.expires_at:
            return False

        # Mark as used
        otp.used = True
        db.session.commit()
        return True

    def __repr__(self):
        return f"<OTP user={self.user_id} purpose={self.purpose}>"
