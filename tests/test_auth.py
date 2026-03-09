from fastapi.testclient import TestClient
from src.core.config import settings

def test_register_user(client: TestClient):
    response = client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "test@example.com",
            "password": "Password123!",
            "full_name": "Test User",
            "tenant_name": "Test Tenant"
        },
    )
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"
    assert "tenant_id" in response.json()

def test_login_user(client: TestClient):
    # Primeiro registra
    client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "login@example.com",
            "password": "Password123!",
            "full_name": "Login User",
            "tenant_name": "Login Tenant"
        },
    )
    
    # Tenta Login
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": "login@example.com", "password": "Password123!"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

def test_get_me(client: TestClient):
    # Registro e Login
    email = "me@example.com"
    client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Me User",
            "tenant_name": "Me Tenant"
        },
    )
    login_res = client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": email, "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    
    # Acesso rota protegida
    response = client.get(
        f"{settings.API_V1_STR}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == email

def test_login_invalid_password(client: TestClient):
    email = "wrong@example.com"
    client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Wrong User",
            "tenant_name": "Wrong Tenant"
        },
    )
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": email, "password": "WrongPassword"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"
