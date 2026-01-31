import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient

from app.main import app


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health_check(self):
        """Test basic health check"""
        with TestClient(app) as client:
            response = client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert "database" in data
            assert "version" in data


class TestAuth:
    """Test authentication endpoints"""
    
    def test_verify_appwrite_token_mock(self):
        """Test Appwrite token verification with mock token"""
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/auth/verify",
                json={"appwrite_token": "mock_token"}
            )
            # Should return error since we don't have Appwrite connection
            assert response.status_code == 401
    
    def test_exchange_token_mock(self):
        """Test token exchange endpoint"""
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/auth/exchange",
                json={"appwrite_token": "mock_token"}
            )
            # Should return mock token
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data


class TestWorkspaces:
    """Test workspace endpoints"""
    
    def test_get_workspaces_unauthorized(self):
        """Test getting workspaces without auth"""
        with TestClient(app) as client:
            response = client.get("/api/v1/workspaces/")
            # Should return 401 since no auth
            assert response.status_code == 401
    
    def test_get_workspaces_empty(self):
        """Test getting workspaces with auth but no workspaces"""
        with TestClient(app) as client:
            # Mock auth header
            headers = {"Authorization": "Bearer mock_token"}
            response = client.get("/api/v1/workspaces/", headers=headers)
            # Should return empty list for now
            assert response.status_code == 200
            data = response.json()
            assert data == []


if __name__ == "__main__":
    pytest.main([__file__])