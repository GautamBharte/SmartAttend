# 1. Register Employee
~~~bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "password": "password"}'
~~~

# 2. Register Admin
~~~bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin User", "email": "admin@example.com", "password": "adminpass", "role": "admin"}'
~~~

# 3. Login (get token)
~~~bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "password"}'
~~~

# Set the token variable (replace with actual token from login)
~~~bash
export TOKEN="your_jwt_token_here"
~~~

# 4. Check-in
~~~bash
curl -X POST http://localhost:8000/attendance/check-in \
  -H "Authorization: Bearer $TOKEN"
~~~

# 5. Check-out
~~~bash
curl -X POST http://localhost:8000/attendance/check-out \
  -H "Authorization: Bearer $TOKEN"
~~~

# 6. Get Attendance History
~~~bash
curl -X GET http://localhost:8000/attendance/history \
  -H "Authorization: Bearer $TOKEN"
~~~

# 7. Apply for Leave
~~~bash
curl -X POST http://localhost:8000/request/leave/apply \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2025-06-24", "end_date": "2025-06-25", "reason": "Personal work"}'
~~~

# 8. Apply for Tour
~~~bash
curl -X POST http://localhost:8000/request/tour/apply \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2025-06-26", "end_date": "2025-06-27", "location": "Delhi", "reason": "Client meeting"}'

# 9. Get Leave History
~~~bash
curl -X GET http://localhost:8000/request/leave \
  -H "Authorization: Bearer $TOKEN"
~~~

# 10. Get Tour History
~~~bash
curl -X GET http://localhost:8000/request/tour \
  -H "Authorization: Bearer $TOKEN"
~~~

# 11. Approve Leave (Admin only, leave ID = 1)
~~~bash
curl -X PATCH http://localhost:8000/request/leave/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
~~~

# 12. Reject Tour (Admin only, tour ID = 1)
~~~bash
curl -X PATCH http://localhost:8000/request/tour/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "rejected"}'
~~~
