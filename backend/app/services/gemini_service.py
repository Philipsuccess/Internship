import asyncio
import logging
from typing import List, Optional
from google import genai
from google.genai import types, errors
from app.core.config import settings, Settings
from app.core.prompts import get_system_instruction
from app.schemas.chat import HistoryMessage

# Silence internal SDK AFC deprecation warning
try:
    from google.genai.models import AsyncModels, Models
    AsyncModels._logged_afc_warning = True
    Models._logged_afc_warning = True
except Exception:
    pass

logger = logging.getLogger(__name__)

class GeminiServiceError(Exception):
    """Base exception for Gemini service failures."""
    pass

class GeminiConfigurationError(GeminiServiceError):
    """Raised when Gemini API key is missing or improperly configured."""
    pass

class GeminiRateLimitError(GeminiServiceError):
    """Raised when Gemini API quota or rate limit is reached."""
    pass

class GeminiSafetyError(GeminiServiceError):
    """Raised when prompt or response is blocked by safety filters."""
    pass

class GeminiUpstreamError(GeminiServiceError):
    """Raised when Google Gemini API encounters an internal failure."""
    pass

class GeminiService:
    """Service layer encapsulating communication with Google's Gemini API."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self._api_key = api_key
        self.model_name = model_name
        self._client: Optional[genai.Client] = None

    def _resolve_api_key(self) -> str:
        """Resolve API key from explicit instance, current settings, or fresh .env."""
        if self._api_key and self._api_key.strip():
            return self._api_key.strip()
        
        # Check current settings
        current_key = settings.GEMINI_API_KEY.strip()
        if current_key and not self._is_placeholder(current_key):
            return current_key
            
        # Re-read fresh settings in case .env was updated without restart
        try:
            fresh_settings = Settings()
            fresh_key = fresh_settings.GEMINI_API_KEY.strip()
            if fresh_key and not self._is_placeholder(fresh_key):
                return fresh_key
        except Exception:
            pass

        return current_key

    @staticmethod
    def _is_placeholder(key: str) -> bool:
        """Check if key is empty or a template placeholder."""
        invalid_placeholders = {
            "placeholder_api_key",
            "your_gemini_api_key_here",
            "placeholder_until_step_two",
            "",
        }
        return not key or key.strip() in invalid_placeholders

    def get_client(self) -> genai.Client:
        """Get or initialize the Google GenAI client instance."""
        active_key = self._resolve_api_key()
        if self._is_placeholder(active_key):
            logger.error("Attempted to call Gemini API without a valid GEMINI_API_KEY configured.")
            raise GeminiConfigurationError(
                "Gemini API key is not configured. Please set GEMINI_API_KEY in the backend environment."
            )
        
        # Reset client if key changed or not initialized
        if self._client is None or getattr(self._client, "_api_key_used", None) != active_key:
            self._client = genai.Client(api_key=active_key)
            setattr(self._client, "_api_key_used", active_key)
        return self._client

    def _build_contents(
        self, 
        current_message: str, 
        conversation_history: List[HistoryMessage]
    ) -> List[types.Content]:
        """Convert prior conversation history and current message into normalized Gemini types.Content.

        =============================================================================
        CONTEXT MANAGEMENT ARCHITECTURE & SAFEGUARDS:
        -----------------------------------------------------------------------------
        Context management operates collaboratively across four distinct architectural layers:

        1. Frontend Session State (`frontend/src/hooks/useChat.js`):
           - Preserves the user's complete conversation transcript in memory for full visual
             display in the UI and seamless export or clear actions.
           - Prepares an immutable snapshot of prior messages (`currentHistory`) before
             dispatching each user prompt to the backend.

        2. API Contract Boundary (`POST /api/chat`, `ChatRequest` schema):
           - Ingests `message`, `conversation_history`, and `session_id`.
           - Designed modularly with `session_id` so persistent database storage (PostgreSQL,
             Firestore, or Redis) can be seamlessly attached without breaking client contracts.

        3. Backend Sliding Window Safeguard (Enforced here in `_build_contents`):
           - Prevents unbounded token consumption and payload size explosions by applying a
             sliding window: `settings.MAX_HISTORY_MESSAGES` (default: 20 messages).
           - Only the most recent turns are submitted to the Gemini context window. Older
             historical messages are safely trimmed from the API payload while remaining
             intact on the client UI.

        4. Model Protocol Turn Normalization (Enforced here in `_build_contents`):
           - Gemini strictly requires that multi-turn dialog starts with role='user' and
             strictly alternates between 'user' and 'model'.
           - Normalizes incoming roles ('assistant', 'ai', 'bot' -> 'model'; 'human' -> 'user').
           - Drops leading model messages if the trimmed window begins with an assistant reply.
           - Coalesces consecutive turns of the same role (e.g., from retry attempts or rapid
             user sends) using double-newline separation.

        5. System Instruction Isolation (`types.GenerateContentConfig`):
           - System instructions and personas are injected via `GenerateContentConfig.system_instruction`,
             keeping system directives separate from conversational history turns.
        =============================================================================
        """
        raw_turns: List[dict] = []

        # Context Management Safeguard: Enforce sliding window on conversation history
        max_turns = max(1, settings.MAX_HISTORY_MESSAGES)
        bounded_history = (
            conversation_history[-max_turns:] 
            if len(conversation_history) > max_turns 
            else conversation_history
        )

        # 1. Normalize roles from bounded history
        for msg in bounded_history:
            role = "model" if msg.role in ("assistant", "model", "ai", "bot") else "user"
            content = msg.content.strip()
            if not content:
                continue

            # First turn must be from 'user'
            if not raw_turns and role != "user":
                continue

            # Merge consecutive turns of identical role to satisfy Gemini turn-taking requirements
            if raw_turns and raw_turns[-1]["role"] == role:
                raw_turns[-1]["content"] += "\n\n" + content
            else:
                raw_turns.append({"role": role, "content": content})

        # 2. Append current user message
        cleaned_current = current_message.strip()
        if raw_turns and raw_turns[-1]["role"] == "user":
            raw_turns[-1]["content"] += "\n\n" + cleaned_current
        else:
            raw_turns.append({"role": "user", "content": cleaned_current})

        # 3. Build Google GenAI Content types
        return [
            types.Content(
                role=turn["role"],
                parts=[types.Part.from_text(text=turn["content"])]
            )
            for turn in raw_turns
        ]

    def _get_model_candidates(self) -> List[str]:
        """Get ordered list of models to try (primary + resilient fallbacks)."""
        primary = (self.model_name or settings.MODEL_NAME).strip()
        candidates = [primary]
        for fb in settings.fallback_models_list:
            if fb not in candidates:
                candidates.append(fb)
        return candidates

    async def generate_response(
        self, 
        message: str, 
        conversation_history: Optional[List[HistoryMessage]] = None,
        persona: Optional[str] = None,
    ) -> str:
        """Send message and conversation history to Gemini with automatic model fallback."""
        client = self.get_client()
        contents = self._build_contents(message, conversation_history or [])
        models_to_try = self._get_model_candidates()

        # Resolve system instruction for requested persona / default
        active_persona = persona or settings.CHATBOT_PERSONA
        system_instruction = get_system_instruction(
            persona=active_persona,
            custom_override=settings.CUSTOM_SYSTEM_INSTRUCTION,
        )
        config = types.GenerateContentConfig(
            system_instruction=system_instruction
        )

        last_error: Optional[Exception] = None

        for idx, candidate_model in enumerate(models_to_try):
            try:
                logger.info(
                    "Calling Gemini API with model: %s (attempt %d/%d, persona: %s)",
                    candidate_model, idx + 1, len(models_to_try), active_persona
                )

                response = await client.aio.models.generate_content(
                    model=candidate_model,
                    contents=contents,
                    config=config,
                )

                # Check if text is present
                if response.text:
                    if idx > 0:
                        logger.warning(
                            "Primary model succeeded via fallback to: %s", candidate_model
                        )
                    return response.text

                # Check for safety filter blocks
                if hasattr(response, "candidates") and response.candidates:
                    candidate = response.candidates[0]
                    finish_reason = getattr(candidate, "finish_reason", None)
                    if finish_reason and "SAFETY" in str(finish_reason).upper():
                        raise GeminiSafetyError(
                            "The response was blocked by safety guidelines. Please rephrase your request."
                        )

                raise GeminiServiceError(f"Model {candidate_model} generated an empty response.")

            except errors.APIError as err:
                err_msg = getattr(err, "message", None) or str(err)
                status_code = getattr(err, "code", None)
                logger.error("Gemini API error on %s (code %s): %s", candidate_model, status_code, err_msg)

                # 1. Invalid or unauthorized API key (Google returns 401/403 or 400 with API_KEY_INVALID)
                err_msg_lower = err_msg.lower()
                if status_code in (401, 403) or (status_code == 400 and ("api_key" in err_msg_lower or "api key" in err_msg_lower)):
                    raise GeminiConfigurationError(
                        "Authentication failed with Google Gemini API. The configured GEMINI_API_KEY is invalid or unauthorized."
                    ) from err

                # 2. If 503 (High Demand) or 404 (Not Found/Deprecated), try next fallback model in chain
                if status_code in (503, 404) and idx + 1 < len(models_to_try):
                    next_model = models_to_try[idx + 1]
                    logger.warning(
                        "Model %s unavailable (%s). Retrying with fallback %s in 0.5s...",
                        candidate_model, status_code, next_model
                    )
                    await asyncio.sleep(0.5)
                    last_error = err
                    continue

                # 3. Rate limits or quota exhaustion
                if status_code == 429 or "quota" in err_msg_lower:
                    raise GeminiRateLimitError(
                        "Gemini API rate limit or quota exceeded. Please try again shortly."
                    ) from err

                # 4. Other 4xx client errors
                elif status_code and 400 <= status_code < 500:
                    raise GeminiServiceError(
                        "Gemini API rejected the request due to invalid input."
                    ) from err

                # 5. Upstream server errors (5xx)
                else:
                    raise GeminiUpstreamError(
                        "Google Gemini API service error. Please try again later."
                    ) from err

            except (GeminiConfigurationError, GeminiSafetyError, GeminiRateLimitError, GeminiServiceError):
                raise

            except Exception as exc:
                exc_str = str(exc).lower()
                is_network_err = any(term in exc_str for term in ("connect", "connection", "timeout", "dns", "getaddrinfo", "network", "unreachable"))
                
                logger.error("Exception communicating with Gemini: %s", exc, exc_info=True)
                
                # If network connection failure, do not spam retries across all models
                if is_network_err:
                    raise GeminiUpstreamError(
                        "Unable to establish connection to Google Gemini servers. Please check your internet connection."
                    ) from exc

                # If there are fallback models and not safety/config error, try next
                if idx + 1 < len(models_to_try):
                    logger.warning("Attempting next fallback model due to exception...")
                    await asyncio.sleep(0.5)
                    last_error = exc
                    continue

                raise GeminiUpstreamError(
                    "An unexpected error occurred while communicating with the AI service."
                ) from exc

        if last_error:
            raise GeminiUpstreamError(
                "All configured Gemini models are currently unavailable. Please try again shortly."
            ) from last_error

        raise GeminiServiceError("Failed to generate AI response.")

# Singleton instance
gemini_service = GeminiService()
