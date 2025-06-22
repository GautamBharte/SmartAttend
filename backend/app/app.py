from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.extensions import db  # ✅ import from extensions
from dotenv import load_dotenv
load_dotenv()

def create_app(test_config=None):
    app = Flask(__name__)
    if test_config:
        app.config.update(test_config)
    else:
        app.config.from_object(Config)

    db.init_app(app)
    CORS(app)

    # Register models (even if unused directly, this ensures Alembic sees them)
    from app.models import user, attendance, leave, tour

    # Register all route blueprints here
    from app.routes import auth, attendance, leave_tour

    app.register_blueprint(auth.auth_bp, url_prefix='/auth')
    app.register_blueprint(attendance.attendance_bp, url_prefix='/attendance')
    app.register_blueprint(leave_tour.leave_tour_bp, url_prefix='/request')

    @app.route('/ping')
    def ping():
        return {'message': 'pong'}, 200

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000, debug=True)
