"""
Migration: Add new columns for WhatsApp integration, overtime, and notification toggles.

Run:  python scripts/migrate_whatsapp_overtime.py
"""
from app.app import create_app
from app.extensions import db

def migrate():
    app = create_app()
    with app.app_context():
        conn = db.engine.raw_connection()
        cursor = conn.cursor()

        # ── 1. Add phone_number to users ─────────────────────────
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN phone_number VARCHAR(20)")
            print("✅ Added phone_number to users table.")
        except Exception:
            print("ℹ️  users.phone_number already exists.")

        # ── 2. Add is_overtime to attendance ──────────────────────
        try:
            cursor.execute("ALTER TABLE attendance ADD COLUMN is_overtime BOOLEAN NOT NULL DEFAULT 0")
            print("✅ Added is_overtime to attendance table.")
        except Exception:
            print("ℹ️  attendance.is_overtime already exists.")

        # ── 3. Add evening_reminder_time to whatsapp_schedule_config ──
        try:
            cursor.execute("ALTER TABLE whatsapp_schedule_config ADD COLUMN evening_reminder_time VARCHAR(5) NOT NULL DEFAULT '18:30'")
            print("✅ Added evening_reminder_time to whatsapp_schedule_config table.")
        except Exception:
            print("ℹ️  whatsapp_schedule_config.evening_reminder_time already exists.")

        # ── 4. Add notification toggle columns to whatsapp_schedule_config ──
        toggles = [
            ("reminder_enabled", "1"),
            ("morning_report_enabled", "1"),
            ("evening_reminder_enabled", "1"),
            ("evening_report_enabled", "1"),
            ("midnight_alert_enabled", "1"),
            ("checkin_alert_enabled", "1"),
            ("checkout_alert_enabled", "1"),
        ]
        for col, default in toggles:
            try:
                cursor.execute(f"ALTER TABLE whatsapp_schedule_config ADD COLUMN {col} BOOLEAN NOT NULL DEFAULT {default}")
                print(f"✅ Added {col} to whatsapp_schedule_config table.")
            except Exception:
                print(f"ℹ️  whatsapp_schedule_config.{col} already exists.")

        conn.commit()
        conn.close()

        # ── 5. Create new tables if they don't exist ─────────────
        db.create_all()
        print("✅ Ensured all tables exist (whatsapp_config, whatsapp_schedule_config, etc).")

        print("✅ Migration complete.")

if __name__ == "__main__":
    migrate()
