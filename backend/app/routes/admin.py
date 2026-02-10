from flask import Blueprint, request, jsonify, Response
from werkzeug.security import generate_password_hash
from app.models.user import User
from app.models.leave import Leave
from app.models.tour import Tour
from app.app import db
from app.routes.auth import token_required
import jwt, os, csv, io
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


# ── CSV Bulk Upload ───────────────────────────────────────────────────
REQUIRED_CSV_COLUMNS = {'name', 'email', 'password'}
OPTIONAL_CSV_COLUMNS = {'role'}


@admin_bp.route("/admin/employees/csv-template", methods=["GET"])
@admin_required
def csv_template():
    """Return a CSV template file for bulk employee upload."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['name', 'email', 'password', 'role'])
    writer.writerow(['John Doe', 'john@example.com', 'securePass123', 'employee'])
    writer.writerow(['Jane Smith', 'jane@example.com', 'securePass456', 'employee'])

    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=employee_template.csv'}
    )


@admin_bp.route("/admin/employees/bulk-upload", methods=["POST"])
@admin_required
def bulk_upload_employees():
    """
    Accept a CSV file with columns: name, email, password, role (optional).
    Creates employee accounts in bulk.
    Returns a summary of created, skipped (duplicate), and errored rows.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not file.filename or not file.filename.lower().endswith('.csv'):
        return jsonify({'error': 'File must be a .csv'}), 400

    try:
        stream = io.StringIO(file.stream.read().decode('utf-8-sig'))  # handle BOM
        reader = csv.DictReader(stream)
    except Exception as e:
        return jsonify({'error': f'Failed to parse CSV: {str(e)}'}), 400

    # Validate columns
    if reader.fieldnames is None:
        return jsonify({'error': 'CSV file is empty'}), 400

    headers = set(h.strip().lower() for h in reader.fieldnames)
    missing = REQUIRED_CSV_COLUMNS - headers
    if missing:
        return jsonify({
            'error': f'Missing required columns: {", ".join(sorted(missing))}. '
                     f'Required: name, email, password. Optional: role.'
        }), 400

    created = []
    skipped = []
    errors = []

    for row_num, raw_row in enumerate(reader, start=2):  # row 1 = header
        # Normalise keys
        row = {k.strip().lower(): (v.strip() if v else '') for k, v in raw_row.items()}

        name = row.get('name', '')
        email = row.get('email', '')
        password = row.get('password', '')
        role = row.get('role', 'employee').lower() or 'employee'

        # Validate row
        if not name or not email or not password:
            errors.append({'row': row_num, 'email': email or '(empty)', 'reason': 'Missing name, email, or password'})
            continue

        if role not in ('employee', 'admin'):
            role = 'employee'

        # Check for duplicate
        if User.query.filter_by(email=email).first():
            skipped.append({'row': row_num, 'email': email, 'reason': 'Email already exists'})
            continue

        try:
            new_user = User(
                name=name,
                email=email,
                password_hash=generate_password_hash(password),
                role=role,
            )
            db.session.add(new_user)
            created.append({'row': row_num, 'email': email, 'name': name})
        except Exception as e:
            errors.append({'row': row_num, 'email': email, 'reason': str(e)})

    # Commit all at once
    if created:
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

    return jsonify({
        'message': f'{len(created)} employee(s) created successfully',
        'created': created,
        'skipped': skipped,
        'errors': errors,
        'summary': {
            'total_rows': len(created) + len(skipped) + len(errors),
            'created': len(created),
            'skipped': len(skipped),
            'errors': len(errors),
        }
    }), 201 if created else 200
