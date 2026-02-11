from app.extensions import db


class Holiday(db.Model):
    """Gazetted / company holidays (e.g. Indian public holidays)."""
    __tablename__ = 'holidays'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True)
    name = db.Column(db.String(128), nullable=False)
    # 'gazetted' for national holidays, 'restricted' for optional
    holiday_type = db.Column(db.String(32), default='gazetted')

    def __repr__(self):
        return f"<Holiday {self.date} {self.name}>"

