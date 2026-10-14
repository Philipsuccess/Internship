import sys
import asyncio
import logging
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from google.genai import errors
from app.main import app
from app.services.gemini_service import gemini_service
from app.schemas.chat import HistoryMessage
from app.core.logging_config import SensitiveDataFilter

from app.api.chat import rate_limiter

class TestChatEndpoint(unittest.TestCase):
    """Comprehensive test suite for POST /api/chat endpoint."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        rate_limiter.reset()

    def test_ip_rate_limiting_exceeded(self):
        """Verify that rapid consecutive requests exceeding rpm return HTTP 429 with Retry-After header."""
        with patch.object(rate_limiter, 'rpm', 2):
            # 1st request succeeds
            with patch.object(gemini_service, 'generate_response', return_value="OK"):
                r1 = self.client.post("/api/chat", json={"message": "First"})
                self.assertEqual(r1.status_code, 200)

                # 2nd request succeeds
                r2 = self.client.post("/api/chat", json={"message": "Second"})
                self.assertEqual(r2.status_code, 200)

                # 3rd request blocked by rate limiter
                r3 = self.client.post("/api/chat", json={"message": "Third"})
                self.assertEqual(r3.status_code, 429)
                self.assertIn("Too many requests from your IP", r3.json()["detail"])
                self.assertIn("retry-after", r3.headers)

    # 1. Missing / Invalid Configuration Tests
    def test_missing_api_key_behavior(self):
        """Verify that when API key is missing or is the placeholder, clean 500 error is returned."""
        with patch.object(gemini_service, '_api_key', 'placeholder_api_key'):
            response = self.client.post(
                "/api/chat",
                json={"message": "Hello AI", "conversation_history": []},
            )
            self.assertEqual(response.status_code, 500)
            data = response.json()
            self.assertIn("Gemini API key is not configured", data["detail"])
            self.assertNotIn("traceback", data)

    def test_invalid_api_key_error(self):
        """Verify that an invalid API key returns HTTP 500 configuration error without leaking the key."""
        mock_client = MagicMock()
        api_error = errors.APIError(400, {"error": {"message": "API key not valid. Please pass a valid API key. [AIzaSyFAKEKEY12345]"}})
        mock_client.aio.models.generate_content = AsyncMock(side_effect=api_error)

        with patch.object(gemini_service, 'get_client', return_value=mock_client):
            response = self.client.post("/api/chat", json={"message": "Testing invalid key"})
            self.assertEqual(response.status_code, 500)
            data = response.json()
            self.assertIn("invalid or unauthorized", data["detail"].lower())
            self.assertNotIn("AIzaSy", data["detail"])
            self.assertNotIn("traceback", data)

    # 2. Input Validation & Empty Messages Tests
    def test_invalid_request_empty_body(self):
        """Verify 422 error on empty payload."""
        response = self.client.post("/api/chat", json={})
        self.assertEqual(response.status_code, 422)

    def test_invalid_request_empty_message(self):
        """Verify 422 error when message is empty string."""
        response = self.client.post("/api/chat", json={"message": "", "conversation_history": []})
        self.assertEqual(response.status_code, 422)

    def test_invalid_request_whitespace_message(self):
        """Verify 422 error when message is whitespace-only."""
        response = self.client.post("/api/chat", json={"message": "    ", "conversation_history": []})
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertIn("empty or whitespace-only", data["detail"])

    def test_extremely_long_message_rejected(self):
        """Verify HTTP 422 when message exceeds MAX_MESSAGE_LENGTH (10,000 chars)."""
        long_msg = "A" * 10001
        response = self.client.post("/api/chat", json={"message": long_msg})
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertIn("at most 10000 characters", data["detail"])

    def test_malformed_request_invalid_history_type(self):
        """Verify HTTP 422 when conversation_history is not a valid list."""
        response = self.client.post(
            "/api/chat",
            json={"message": "Hi", "conversation_history": "invalid_string"}
        )
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertIn("conversation_history", data["detail"])

    def test_malformed_request_invalid_role(self):
        """Verify HTTP 422 when a history message has an unsupported role."""
        response = self.client.post(
            "/api/chat",
            json={
                "message": "Hi",
                "conversation_history": [{"role": "unsupported_role", "content": "hello"}]
            }
        )
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertIn("role", data["detail"])

    # 3. Conversation History & Normal Dialogue Tests
    def test_successful_gemini_response_with_history(self):
        """Confirm successful response generation and conversation history formatting."""
        mock_response = MagicMock()
        mock_response.text = "Hello! I am Gemini, ready to help you learn."
        mock_response.candidates = []

        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        with patch.object(gemini_service, 'get_client', return_value=mock_client):
            payload = {
                "message": "What is Python?",
                "conversation_history": [
                    {"role": "user", "content": "Hi there"},
                    {"role": "assistant", "content": "Hello! How can I assist you today?"}
                ]
            }
            response = self.client.post("/api/chat", json=payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["response"], "Hello! I am Gemini, ready to help you learn.")

            mock_client.aio.models.generate_content.assert_called_once()
            call_kwargs = mock_client.aio.models.generate_content.call_args.kwargs
            self.assertIn("contents", call_kwargs)
            contents = call_kwargs["contents"]
            self.assertEqual(len(contents), 3)
            self.assertEqual(contents[0].role, "user")
            self.assertEqual(contents[1].role, "model")
            self.assertEqual(contents[2].role, "user")

    def test_consecutive_user_turns_merged(self):
        """Verify that multiple consecutive user messages are merged into a single user turn."""
        mock_response = MagicMock()
        mock_response.text = "Handled consecutive turns!"
        mock_response.candidates = []

        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        with patch.object(gemini_service, 'get_client', return_value=mock_client):
            payload = {
                "message": "Second user message",
                "conversation_history": [
                    {"role": "user", "content": "First user message"}
                ]
            }
            response = self.client.post("/api/chat", json=payload)
            self.assertEqual(response.status_code, 200)
            call_kwargs = mock_client.aio.models.generate_content.call_args.kwargs
            contents = call_kwargs["contents"]
            self.assertEqual(len(contents), 1)
            self.assertEqual(contents[0].role, "user")
            self.assertIn("First user message", contents[0].parts[0].text)
            self.assertIn("Second user message", contents[0].parts[0].text)

    def test_sliding_window_history_safeguard(self):
        """Verify that conversation history exceeding MAX_HISTORY_MESSAGES is cleanly truncated."""
        mock_response = MagicMock()
        mock_response.text = "Answer bounded by sliding window"
        mock_response.candidates = []

        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        history = []
        for i in range(30):
            role = "user" if i % 2 == 0 else "assistant"
            history.append({"role": role, "content": f"Message turn {i}"})

        with patch.object(gemini_service, 'get_client', return_value=mock_client):
            with patch("app.core.config.settings.MAX_HISTORY_MESSAGES", 6):
                response = self.client.post(
                    "/api/chat",
                    json={
                        "message": "Latest query",
                        "conversation_history": history
                    }
                )
                self.assertEqual(response.status_code, 200)
                call_kwargs = mock_client.aio.models.generate_content.call_args.kwargs
                contents = call_kwargs["contents"]
                all_text = " ".join([p.text for c in contents for p in c.parts])
                self.assertNotIn("Message turn 0", all_text)
                self.assertIn("Message turn 28", all_text)
                self.assertIn("Latest query", all_text)

    def test_session_id_passthrough(self):
        """Verify session_id is preserved in response for future database persistence integration."""
        mock_response = MagicMock()
        mock_response.text = "Session active"
        mock_response.candidates = []

        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        with patch.object(gemini_service, 'get_client', return_value=mock_client):
            response = self.client.post(
                "/api/chat",
                json={
                    "message": "Hello session",
                    "session_id": "session-xyz-123"
                }
            )
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["session_id"], "session-xyz-123")

    def test_system_instruction_and_persona_injection(self):
        """Verify that configurable system instruction and persona are injected via types.GenerateContentConfig."""
        mock_response = MagicMock()
        mock_response.text = "As your student tutor, let me guide you step by step."
        mock_response.candidates = []

        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        with patch.object(gemini_service, 'get_client', return_value=mock_client):
            response = self.client.post(
                "/api/chat", 
                json={
                    "message": "Can you explain photosynthesis?",
                    "persona": "student_tutor"
                }
            )
            self.assertEqual(response.status_code, 200)
            call_kwargs = mock_client.aio.models.generate_content.call_args.kwargs
            self.assertIn("config", call_kwargs)
            config = call_kwargs["config"]
            self.assertIsNotNone(config.system_instruction)
            self.assertIn("student tutor", config.system_instruction.lower())

    # 4. API Error & Resilience Tests
    def test_automatic_model_fallback_on_503(self):
        """Verify that when primary model returns 503, fallback model is tried and succeeds."""
        mock_success = MagicMock()
        mock_success.text = "Response from fallback model!"
        mock_success.candidates = []

        err_503 = errors.APIError(503, {"error": {"message": "Primary model experiencing high demand."}})

        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(side_effect=[err_503, mock_success])

        with patch.object(gemini_service, 'get_client', return_value=mock_client):
            response = self.client.post("/api/chat", json={"message": "Testing fallback"})
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["response"], "Response from fallback model!")
            self.assertEqual(mock_client.aio.models.generate_content.call_count, 2)

    def test_gemini_api_rate_limit_failure(self):
        """Verify HTTP 429 when Gemini returns quota/rate limit error."""
        mock_client = MagicMock()
        api_error = errors.APIError(429, {"error": {"message": "Resource has been exhausted (e.g. check quota)."}})
        mock_client.aio.models.generate_content = AsyncMock(side_effect=api_error)

        with patch.object(gemini_service, 'get_client', return_value=mock_client):
            response = self.client.post("/api/chat", json={"message": "Testing rate limit"})
            self.assertEqual(response.status_code, 429)
            data = response.json()
            self.assertIn("rate limit or quota exceeded", data["detail"].lower())

    def test_gemini_api_safety_block(self):
        """Verify HTTP 400 when response is blocked by safety filters."""
        mock_response = MagicMock()
        mock_response.text = None
        mock_candidate = MagicMock()
        mock_candidate.finish_reason = "SAFETY"
        mock_response.candidates = [mock_candidate]

        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        with patch.object(gemini_service, 'get_client', return_value=mock_client):
            response = self.client.post("/api/chat", json={"message": "Harmful query"})
            self.assertEqual(response.status_code, 400)
            data = response.json()
            self.assertIn("safety guidelines", data["detail"].lower())

    def test_gemini_upstream_generic_api_error(self):
        """Verify HTTP 502 Bad Gateway when Gemini returns an unhandled upstream API error."""
        mock_client = MagicMock()
        api_error = errors.APIError(500, {"error": {"message": "Internal error in Gemini cluster"}})
        mock_client.aio.models.generate_content = AsyncMock(side_effect=api_error)

        with patch.object(gemini_service, 'get_client', return_value=mock_client):
            response = self.client.post("/api/chat", json={"message": "Testing upstream 500"})
            self.assertEqual(response.status_code, 502)
            data = response.json()
            self.assertIn("temporarily unavailable", data["detail"].lower())

    def test_gemini_upstream_network_failure(self):
        """Verify HTTP 502 Bad Gateway when network connection to Gemini fails."""
        mock_client = MagicMock()
        network_err = ConnectionResetError("Connection closed by peer: api.generativelanguage.googleapis.com")
        mock_client.aio.models.generate_content = AsyncMock(side_effect=network_err)

        with patch.object(gemini_service, 'get_client', return_value=mock_client):
            response = self.client.post("/api/chat", json={"message": "Testing network failure"})
            self.assertEqual(response.status_code, 502)
            data = response.json()
            self.assertIn("temporarily unavailable", data["detail"].lower())

    def test_chat_timeout_handling(self):
        """Verify HTTP 504 Gateway Timeout when generation exceeds server budget."""
        async def slow_generation(*args, **kwargs):
            await asyncio.sleep(40)
            return "too late"

        with patch.object(gemini_service, 'generate_response', side_effect=slow_generation):
            with patch("app.api.chat.REQUEST_TIMEOUT_SECONDS", 0.1):
                response = self.client.post("/api/chat", json={"message": "Will time out"})
                self.assertEqual(response.status_code, 504)
                data = response.json()
                self.assertIn("took too long to respond", data["detail"].lower())

    def test_unexpected_backend_exception_handled_cleanly(self):
        """Verify HTTP 500 when an unhandled server exception occurs, preventing stack trace leaks."""
        with patch.object(gemini_service, 'generate_response', side_effect=RuntimeError("Secret internal database crash!")):
            response = self.client.post("/api/chat", json={"message": "Trigger unexpected crash"})
            self.assertEqual(response.status_code, 500)
            data = response.json()
            self.assertIn("internal server error", data["detail"].lower())
            self.assertNotIn("Secret internal database crash", str(data))
            self.assertNotIn("traceback", data)

    def test_sensitive_data_logging_filter(self):
        """Verify SensitiveDataFilter scrubs API keys from log records, arguments, and tracebacks."""
        log_filter = SensitiveDataFilter()
        test_logger = logging.getLogger("test_redaction")
        test_logger.addFilter(log_filter)

        fake_key = "AIzaSySecretTestKey1234567890abcdefgh"
        record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname="test.py",
            lineno=10,
            msg=f"Request failed with key: {fake_key}",
            args=(),
            exc_info=None
        )
        log_filter.filter(record)
        self.assertNotIn(fake_key, record.msg)
        self.assertIn("[REDACTED_API_KEY]", record.msg)

if __name__ == "__main__":
    unittest.main()
