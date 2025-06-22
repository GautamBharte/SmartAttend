def register_user(client, name, email, password, role="user"):
    return client.post("/auth/register", json={
        "name": name,
        "email": email,
        "password": password,
        "role": role
    })

def login_user(client, email, password):
    res = client.post("/auth/login", json={"email": email, "password": password})
    return res.get_json()["token"]
