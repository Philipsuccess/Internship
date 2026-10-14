import sys
import unittest
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app

class TestHealthEndpoints(unittest.TestCase):
    """Test suite for GET /health and root / endpoints."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_endpoint(self):
        """Verify that GET /health returns 200 and healthy status metadata."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("Backend server is running successfully", data["message"])
        self.assertIn("model_configured", data)

    def test_root_endpoint(self):
        """Verify that GET / returns service status and API endpoint documentation."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertEqual(data["health_check"], "/health")
        self.assertEqual(data["chat_endpoint"], "/api/chat")

if __name__ == "__main__":
    unittest.main()
