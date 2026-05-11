"""
SOMAKID AI Engine - Health Check Tests
Tests for health monitoring and readiness endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


# =============================================================================
# Test Client
# =============================================================================

@pytest.fixture
def client():
    """Create test client for the FastAPI application."""
    return TestClient(app)


# =============================================================================
# Test Cases
# =============================================================================

class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_root_endpoint(self, client):
        """Test that root endpoint returns API information."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "SOMAKID AI Engine"
        assert "version" in data
        assert "modules" in data
        assert "supported_languages" in data

    def test_ping_endpoint(self, client):
        """Test that ping endpoint responds quickly."""
        response = client.get("/ping")
        
        assert response.status_code == 200
        data = response.json()
        assert data["pong"] is True

    def test_liveness_check(self, client):
        """Test liveness probe endpoint."""
        response = client.get("/health/live")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"
        assert "timestamp" in data

    def test_readiness_check(self, client):
        """Test readiness probe endpoint."""
        response = client.get("/health/ready")
        
        # May return 200 or 503 depending on external services
        assert response.status_code in [200, 503]
        data = response.json()
        assert "status" in data
        assert "components" in data
        assert "gemini_api" in data["components"]
        assert "memory_repository" in data["components"]

    def test_full_health_check(self, client):
        """Test full health check endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "operational"
        assert data["service"] == "SOMAKID AI Engine"
        assert "gemini_api" in data

    def test_root_response_time(self, client):
        """Test that root endpoint responds within acceptable time."""
        import time
        
        start = time.time()
        response = client.get("/")
        duration = (time.time() - start) * 1000
        
        assert response.status_code == 200
        assert duration < 500  # Should respond within 500ms


class TestErrorHandling:
    """Tests for error handling on non-existent endpoints."""

    def test_404_on_nonexistent_route(self, client):
        """Test that non-existent routes return 404."""
        response = client.get("/api/v1/nonexistent")
        
        assert response.status_code == 404

    def test_405_method_not_allowed(self, client):
        """Test that wrong HTTP methods return 405."""
        response = client.put("/ping")
        
        assert response.status_code == 405

    def test_error_response_format(self, client):
        """Test that error responses follow the standard format."""
        response = client.get("/api/v1/nonexistent")
        
        data = response.json()
        assert "success" in data
        assert data["success"] is False