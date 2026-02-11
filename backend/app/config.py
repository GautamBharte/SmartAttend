import os

class Config:
    # Use DATABASE_URL from environment if available (set by docker-compose)
    # Otherwise, construct from individual env vars or use defaults
    _database_url = os.getenv('DATABASE_URL')
    if _database_url:
        SQLALCHEMY_DATABASE_URI = _database_url
    else:
        # Fallback: construct from individual environment variables
        POSTGRES_USER = os.getenv('POSTGRES_USER', 'officeuser')
        POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'officepass')
        POSTGRES_DB = os.getenv('POSTGRES_DB', 'office_db')
        SQLALCHEMY_DATABASE_URI = f'postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@db:5432/{POSTGRES_DB}'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False