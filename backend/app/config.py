import os

class Config:
    SQLALCHEMY_DATABASE_URI = 'postgresql://officeuser:officepass@localhost:5432/office_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False