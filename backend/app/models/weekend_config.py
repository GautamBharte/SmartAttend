from app.extensions import db

class WeekendConfig(db.Model):
    """Stores which days of the week are considered weekends (non-working days)."""
    __tablename__ = 'weekend_config'

    id = db.Column(db.Integer, primary_key=True)
    # Store as comma-separated string: "0,6" means Sunday (0) and Saturday (6) are weekends
    # Python weekday: Monday=0, Tuesday=1, ..., Sunday=6
    weekend_days = db.Column(db.String(20), default='6', nullable=False)  # Default: Sunday only

    def get_weekend_set(self) -> set[int]:
        """Return a set of weekday integers (0=Monday, 6=Sunday)."""
        if not self.weekend_days:
            return {6}  # Default to Sunday only
        return {int(d.strip()) for d in self.weekend_days.split(',') if d.strip().isdigit()}

    @staticmethod
    def get_current() -> 'WeekendConfig':
        """Get the current weekend config (singleton pattern)."""
        config = WeekendConfig.query.first()
        if not config:
            config = WeekendConfig(weekend_days='6')  # Default: Sunday only
            db.session.add(config)
            db.session.commit()
        return config

    def __repr__(self):
        return f"<WeekendConfig weekend_days={self.weekend_days}>"

