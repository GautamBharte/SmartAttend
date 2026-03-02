from app.extensions import db


class WhatsAppConfig(db.Model):
    """Stores phone numbers that receive WhatsApp notifications."""
    __tablename__ = 'whatsapp_config'

    id = db.Column(db.Integer, primary_key=True)
    phone_number = db.Column(db.String(20), nullable=False, unique=True)
    label = db.Column(db.String(100), nullable=True)  # optional friendly name
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def __repr__(self):
        return f"<WhatsAppConfig {self.phone_number}>"
