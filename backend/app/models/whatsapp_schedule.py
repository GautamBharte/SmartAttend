from app.extensions import db


class WhatsAppScheduleConfig(db.Model):
    """Single-row config storing WhatsApp notification schedule times (HH:MM format)
    and per-notification enabled/disabled toggles."""
    __tablename__ = 'whatsapp_schedule_config'

    id = db.Column(db.Integer, primary_key=True)

    # Schedule times
    reminder_time = db.Column(db.String(5), nullable=False, default='10:30')
    morning_report_time = db.Column(db.String(5), nullable=False, default='11:00')
    logoff_reminder_time = db.Column(db.String(5), nullable=False, default='18:45')
    evening_report_time = db.Column(db.String(5), nullable=False, default='19:00')
    midnight_alert_time = db.Column(db.String(5), nullable=False, default='23:00')

    # Per-notification toggles (all enabled by default)
    reminder_enabled = db.Column(db.Boolean, nullable=False, default=True)
    morning_report_enabled = db.Column(db.Boolean, nullable=False, default=True)
    logoff_reminder_enabled = db.Column(db.Boolean, nullable=False, default=True)
    evening_report_enabled = db.Column(db.Boolean, nullable=False, default=True)
    midnight_alert_enabled = db.Column(db.Boolean, nullable=False, default=True)
    checkin_alert_enabled = db.Column(db.Boolean, nullable=False, default=True)
    checkout_alert_enabled = db.Column(db.Boolean, nullable=False, default=True)

    @classmethod
    def get_current(cls):
        """Return the current schedule config, creating defaults if none exists."""
        config = cls.query.first()
        if not config:
            config = cls()
            db.session.add(config)
            db.session.commit()
        return config

    def to_dict(self):
        return {
            'reminder_time': self.reminder_time,
            'morning_report_time': self.morning_report_time,
            'logoff_reminder_time': self.logoff_reminder_time,
            'evening_report_time': self.evening_report_time,
            'midnight_alert_time': self.midnight_alert_time,
            'reminder_enabled': self.reminder_enabled,
            'morning_report_enabled': self.morning_report_enabled,
            'logoff_reminder_enabled': self.logoff_reminder_enabled,
            'evening_report_enabled': self.evening_report_enabled,
            'midnight_alert_enabled': self.midnight_alert_enabled,
            'checkin_alert_enabled': self.checkin_alert_enabled,
            'checkout_alert_enabled': self.checkout_alert_enabled,
        }

    def __repr__(self):
        return f"<WhatsAppScheduleConfig id={self.id}>"
