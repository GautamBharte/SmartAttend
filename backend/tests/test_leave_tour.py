from tests.utils import register_user, login_user

def test_leave_and_tour(client):
    register_user(client, "Emp", "emp@test.com", "pass")
    register_user(client, "Admin", "admin@test.com", "pass", "admin")

    emp_token = login_user(client, "emp@test.com", "pass")
    admin_token = login_user(client, "admin@test.com", "pass")

    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Apply Leave
    leave_res = client.post("/request/leave/apply", headers=emp_headers, json={
        "start_date": "2025-06-24",
        "end_date": "2025-06-25",
        "reason": "Test Leave"
    })
    assert leave_res.status_code == 201

    # Apply Tour
    tour_res = client.post("/request/tour/apply", headers=emp_headers, json={
        "start_date": "2025-06-26",
        "end_date": "2025-06-27",
        "location": "Delhi",
        "reason": "Test Tour"
    })
    assert tour_res.status_code == 201

    # Admin approves leave ID 1
    res_approve = client.patch("/request/leave/1/status", headers=admin_headers, json={"status": "approved"})
    assert res_approve.status_code == 200

    # Admin rejects tour ID 1
    res_reject = client.patch("/request/tour/1/status", headers=admin_headers, json={"status": "rejected"})
    assert res_reject.status_code == 200
