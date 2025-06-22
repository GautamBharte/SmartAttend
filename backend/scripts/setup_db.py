from app.app import create_app
from app.extensions import db
from app.models.user import User
import os
from werkzeug.security import generate_password_hash
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()  # load from .env

def setup_base_data():
    app = create_app()
    with app.app_context():
        db.create_all()

        admin_email = os.getenv("ADMIN_EMAIL")
        admin_name = os.getenv("ADMIN_NAME")
        admin_password = os.getenv("ADMIN_PASSWORD")

        if not all([admin_email, admin_name, admin_password]):
            print("❌ Missing ADMIN_* environment variables.")
            return

        if not User.query.filter_by(email=admin_email).first():
            admin = User(
                name=admin_name,
                email=admin_email,
                password_hash=generate_password_hash(admin_password),
                role="admin",
                created_at=datetime.utcnow()
            )
            db.session.add(admin)
            db.session.commit()
            print("✅ Admin user created.")
        else:
            print("ℹ️ Admin already exists.")

        print("✅ Database setup complete.")

if __name__ == "__main__":
    setup_base_data()
