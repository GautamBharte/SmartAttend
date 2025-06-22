from app.extensions import db
from datetime import date

class Tour(db.Model):
    __tablename__ = 'tours'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    location = db.Column(db.String(128), nullable=False)
    reason = db.Column(db.String(255))
    status = db.Column(db.String(32), default='pending')  # pending, approved, rejected

    user = db.relationship("User", backref="tours")
