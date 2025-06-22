from tests.utils import register_user, login_user

def test_register_and_login(client):
    register_user(client, "Admin", "admin@test.com", "pass", "admin")
    token = login_user(client, "admin@test.com", "pass")
    assert token is not None
