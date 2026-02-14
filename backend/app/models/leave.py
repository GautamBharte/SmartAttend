from app.extensions import db
from datetime import date, datetime


class Leave(db.Model):
    __tablename__ = 'leaves'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.Text)  # Changed from String(255) to Text for longer reasons
    status = db.Column(db.String(32), default='pending')  # pending, approved, rejected
    leave_type = db.Column(db.String(16), default='paid')  # paid, unpaid
    working_days = db.Column(db.Integer, default=0)  # business days (excl. Sundays & holidays)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="leaves")
