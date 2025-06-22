import os

class Config:
    SQLALCHEMY_DATABASE_URI = 'postgresql://officeuser:officepass@db:5432/office_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False