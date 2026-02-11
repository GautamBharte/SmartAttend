from app.extensions import db

# Corporate default: 21 paid leaves per year
ANNUAL_PAID_LEAVES = 21


class LeaveBalance(db.Model):
    """Tracks per-employee, per-year paid-leave allocation."""
    __tablename__ = 'leave_balances'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    total_leaves = db.Column(db.Integer, nullable=False, default=ANNUAL_PAID_LEAVES)

    user = db.relationship("User", backref="leave_balances")

    __table_args__ = (
        db.UniqueConstraint('user_id', 'year', name='uq_user_year'),
    )

    def __repr__(self):
        return f"<LeaveBalance user={self.user_id} year={self.year} total={self.total_leaves}>"

