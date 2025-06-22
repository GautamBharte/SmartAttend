from tests.utils import register_user, login_user

def test_check_in_and_out(client):
    register_user(client, "Emp", "emp@test.com", "pass")
    token = login_user(client, "emp@test.com", "pass")

    headers = {"Authorization": f"Bearer {token}"}
    res_in = client.post("/attendance/check-in", headers=headers)
    assert res_in.status_code == 200

    res_out = client.post("/attendance/check-out", headers=headers)
    assert res_out.status_code == 200
