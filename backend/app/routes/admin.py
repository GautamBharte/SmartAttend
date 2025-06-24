from flask import Blueprint, request, jsonify
from app.models.user import User
from app.models.leave import Leave
from app.models.tour import Tour
from app.app import db
from app.routes.auth import token_required
import jwt, os
from functools import wraps

admin_bp = Blueprint('admin', __name__)
SECRET_KEY = os.getenv("SECRET_KEY", "secret-dev")

def admin_required(f):
    @wraps(f)
    @token_required
    def wrapper(user, *args, **kwargs):
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return wrapper

def apply_filters(query, model):
    # Pagination
    top = request.args.get("top", type=int)
    skip = request.args.get("skip", type=int)

    # Ordering
    order_by = request.args.get("orderBy", "id")
    direction = request.args.get("direction", "asc")

    # Search (basic)
    search = request.args.get("search")
    if search and hasattr(model, "name"):
        query = query.filter(model.name.ilike(f"%{search}%"))

    # Field-based filters
    for key in request.args:
        if hasattr(model, key) and key not in ['top', 'skip', 'orderBy', 'direction', 'search']:
            value = request.args.get(key)
            query = query.filter(getattr(model, key) == value)

    # Order
    if hasattr(model, order_by):
        column = getattr(model, order_by)
        query = query.order_by(column.desc() if direction == "desc" else column.asc())

    # Pagination
    if skip:
        query = query.offset(skip)
    if top:
        query = query.limit(top)

    return query

@admin_bp.route("/admin/employees", methods=["GET"])
@admin_required
def get_employees():
    query = User.query.filter(User.role == "employee")
    query = apply_filters(query, User)
    employees = query.all()
    return jsonify([{
        "id": emp.id,
        "name": emp.name,
        "email": emp.email,
        "created_at": emp.created_at.isoformat()
    } for emp in employees]), 200


@admin_bp.route("/admin/leaves", methods=["GET"])
@admin_required
def get_leaves():
    query = Leave.query
    query = apply_filters(query, Leave)
    leaves = query.all()
    return jsonify([{
        "id": leave.id,
        "user_id": leave.user_id,
        "start_date": leave.start_date.isoformat(),
        "end_date": leave.end_date.isoformat(),
        "status": leave.status,
        "reason": leave.reason
    } for leave in leaves]), 200


@admin_bp.route("/admin/tours", methods=["GET"])
@admin_required
def get_tours():
    query = Tour.query
    query = apply_filters(query, Tour)
    tours = query.all()
    return jsonify([{
        "id": tour.id,
        "user_id": tour.user_id,
        "start_date": tour.start_date.isoformat(),
        "end_date": tour.end_date.isoformat(),
        "location": tour.location,
        "status": tour.status,
        "reason": tour.reason
    } for tour in tours]), 200
