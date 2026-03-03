from app.extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)  # WhatsApp number for direct alerts
    role = db.Column(db.String(20), default='employee')  # employee or admin
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Notification preferences (employees can opt out of specific alerts)
    notify_reminder = db.Column(db.Boolean, nullable=False, default=True)     # Attendance reminder
    notify_checkout = db.Column(db.Boolean, nullable=False, default=True)     # Evening checkout reminder
    notify_midnight = db.Column(db.Boolean, nullable=False, default=True)     # Midnight oil alert

    def __repr__(self):
        return f"<User {self.email}>"
