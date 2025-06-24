# 1. Register Employee
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "password": "password"}'
# ✅ 201 Created
# {
#   "message": "User registered successfully"
# }
# ❌ 400 Email Exists or Missing Fields
# {
#   "error": "Email already registered"
# }

# 2. Register Admin
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin User", "email": "admin@example.com", "password": "adminpass", "role": "admin"}'
# ✅ 201 Created
# {
#   "message": "User registered successfully"
# }

# 3. Login (get token)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "password"}'
# ✅ 200 OK
# {
#   "access_token": "<JWT_TOKEN>",
#   "user": {
#     "id": 1,
#     "name": "John Doe",
#     "email": "john@example.com",
#     "role": "employee"
#   }
# }
# ❌ 401 Unauthorized
# {
#   "error": "Invalid email or password"
# }

# 4. Change Password
curl -X POST http://localhost:8000/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"current_password": "password", "new_password": "newpass"}'
# ✅ 200 OK
# {
#   "message": "Password changed successfully"
# }
# ❌ 403 Forbidden
# {
#   "error": "Current password is incorrect"
# }

# 5. Forgot Password
curl -X POST http://localhost:8000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
# ✅ 200 OK
# {
#   "message": "Reset token generated",
#   "reset_token": "abcdef123456..."
# }
# ❌ 404 Not Found
# {
#   "error": "User not found"
# }

# 6. Edit Profile
curl -X PATCH http://localhost:8000/auth/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name", "email": "new@email.com"}'
# ✅ 200 OK
# {
#   "message": "Profile updated",
#   "name": "New Name",
#   "email": "new@email.com"
# }
# ❌ 400 Conflict
# {
#   "error": "Email already in use"
# }

# 7. Check-in
curl -X POST http://localhost:8000/attendance/check-in \
  -H "Authorization: Bearer <token>"
# ✅ 200 OK
# {
#   "message": "Check-in successful",
#   "check_in_time": "2025-06-21T07:23:45.000Z"
# }
# ❌ 400 Already Checked In
# {
#   "message": "Already checked in today"
# }

# 8. Check-out
curl -X POST http://localhost:8000/attendance/check-out \
  -H "Authorization: Bearer <token>"
# ✅ 200 OK
# {
#   "message": "Check-out successful",
#   "check_out_time": "2025-06-21T16:45:22.000Z"
# }
# ❌ 400 Not Checked In Yet
# {
#   "message": "You must check-in before check-out"
# }

# 9. Get Attendance History
curl -X GET http://localhost:8000/attendance/history \
  -H "Authorization: Bearer <token>"
# ✅ 200 OK
# {
#   "attendance": [
#     {
#       "date": "2025-06-21",
#       "check_in_time": "07:23:45",
#       "check_out_time": "16:45:22"
#     },
#     ...
#   ]
# }

# 10. Get Today’s Attendance Status
curl -X GET http://localhost:8000/attendance/status \
  -H "Authorization: Bearer <token>"
# ✅ 200 OK
# {
#   "date": "2025-06-21",
#   "check_in_time": "07:23:45",
#   "check_out_time": null,
#   "status": "Checked In"
# }

# 11. Apply for Leave
curl -X POST http://localhost:8000/request/leave/apply \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2025-06-24", "end_date": "2025-06-25", "reason": "Personal work"}'
# ✅ 201 Created
# {
#   "message": "Leave request submitted"
# }

# 12. Apply for Tour
curl -X POST http://localhost:8000/request/tour/apply \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2025-06-26", "end_date": "2025-06-27", "location": "Delhi", "reason": "Client meeting"}'
# ✅ 201 Created
# {
#   "message": "Tour request submitted"
# }

# 13. Get Leave History
curl -X GET http://localhost:8000/request/leave \
  -H "Authorization: Bearer <token>"
# ✅ 200 OK
# {
#   "leaves": [
#     {
#       "id": 1,
#       "start_date": "2025-06-24",
#       "end_date": "2025-06-25",
#       "reason": "Personal work",
#       "status": "pending"
#     },
#     ...
#   ]
# }

# 14. Get Tour History
curl -X GET http://localhost:8000/request/tour \
  -H "Authorization: Bearer <token>"
# ✅ 200 OK
# {
#   "tours": [
#     {
#       "id": 1,
#       "start_date": "2025-06-26",
#       "end_date": "2025-06-27",
#       "location": "Delhi",
#       "reason": "Client meeting",
#       "status": "pending"
#     },
#     ...
#   ]
# }

# 15. Approve Leave (Admin only, leave ID = 1)
curl -X PATCH http://localhost:8000/request/leave/1/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
# ✅ 200 OK
# {
#   "message": "Leave status updated"
# }
# ❌ 403 Forbidden (Non-admin)
# {
#   "error": "Permission denied"
# }

# 16. Reject Tour (Admin only, tour ID = 1)
curl -X PATCH http://localhost:8000/request/tour/1/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "rejected"}'
# ✅ 200 OK
# {
#   "message": "Tour status updated"
# }
