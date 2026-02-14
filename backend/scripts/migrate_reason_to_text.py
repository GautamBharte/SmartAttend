"""
Migration script to change reason fields from VARCHAR(255) to TEXT
Run this once to update the database schema.
"""
from app.app import create_app
from app.extensions import db

def migrate_reason_fields():
    """Change reason columns from VARCHAR(255) to TEXT in leaves and tours tables."""
    app = create_app()
    with app.app_context():
        try:
            # Use raw SQL to alter the column types
            # PostgreSQL syntax
            db.session.execute(db.text("ALTER TABLE leaves ALTER COLUMN reason TYPE TEXT"))
            db.session.execute(db.text("ALTER TABLE tours ALTER COLUMN reason TYPE TEXT"))
            db.session.commit()
            print("✅ Successfully migrated reason fields to TEXT type")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error during migration: {e}")
            raise

if __name__ == "__main__":
    migrate_reason_fields()


