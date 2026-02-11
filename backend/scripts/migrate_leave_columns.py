"""
Migration script to add new columns to leaves table and create new tables.
Run this once to update the database schema.
"""
from app.app import create_app
from app.extensions import db
from sqlalchemy import text

def migrate():
    app = create_app()
    with app.app_context():
        print("🔄 Starting migration...")

        # Check if columns already exist
        inspector = db.inspect(db.engine)
        leaves_columns = [col['name'] for col in inspector.get_columns('leaves')]

        # Add missing columns to leaves table
        if 'leave_type' not in leaves_columns:
            print("  ➕ Adding 'leave_type' column to leaves table...")
            db.session.execute(text("ALTER TABLE leaves ADD COLUMN leave_type VARCHAR(16) DEFAULT 'paid'"))
            db.session.commit()
            print("  ✅ Added 'leave_type'")

        if 'working_days' not in leaves_columns:
            print("  ➕ Adding 'working_days' column to leaves table...")
            db.session.execute(text("ALTER TABLE leaves ADD COLUMN working_days INTEGER DEFAULT 0"))
            db.session.commit()
            print("  ✅ Added 'working_days'")

        if 'created_at' not in leaves_columns:
            print("  ➕ Adding 'created_at' column to leaves table...")
            db.session.execute(text("ALTER TABLE leaves ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            db.session.commit()
            print("  ✅ Added 'created_at'")

        # Create holidays table if it doesn't exist
        if 'holidays' not in inspector.get_table_names():
            print("  ➕ Creating 'holidays' table...")
            db.session.execute(text("""
                CREATE TABLE holidays (
                    id SERIAL PRIMARY KEY,
                    date DATE NOT NULL UNIQUE,
                    name VARCHAR(128) NOT NULL,
                    holiday_type VARCHAR(32) DEFAULT 'gazetted'
                )
            """))
            db.session.commit()
            print("  ✅ Created 'holidays' table")

        # Create leave_balances table if it doesn't exist
        if 'leave_balances' not in inspector.get_table_names():
            print("  ➕ Creating 'leave_balances' table...")
            db.session.execute(text("""
                CREATE TABLE leave_balances (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    year INTEGER NOT NULL,
                    total_leaves INTEGER NOT NULL DEFAULT 21,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    UNIQUE(user_id, year)
                )
            """))
            db.session.commit()
            print("  ✅ Created 'leave_balances' table")

        # Create weekend_config table if it doesn't exist
        if 'weekend_config' not in inspector.get_table_names():
            print("  ➕ Creating 'weekend_config' table...")
            db.session.execute(text("""
                CREATE TABLE weekend_config (
                    id SERIAL PRIMARY KEY,
                    weekend_days VARCHAR(20) NOT NULL DEFAULT '6'
                )
            """))
            db.session.commit()
            # Insert default config (Sunday only)
            db.session.execute(text("INSERT INTO weekend_config (weekend_days) VALUES ('6')"))
            db.session.commit()
            print("  ✅ Created 'weekend_config' table with default (Sunday only)")

        print("✅ Migration complete!")

if __name__ == "__main__":
    migrate()

