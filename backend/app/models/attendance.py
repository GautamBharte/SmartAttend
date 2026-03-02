from app.extensions import db
from datetime import datetime

class Attendance(db.Model):
    __tablename__ = 'attendance'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    check_in_time = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)
    is_overtime = db.Column(db.Boolean, default=False, nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)

    user = db.relationship("User", backref="attendance_records")
