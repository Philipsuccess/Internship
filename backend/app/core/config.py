from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Determine base directory of the backend to reliably locate the .env file
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""
    GEMINI_API_KEY: str = Field(default="")
    MODEL_NAME: str = Field(default="gemini-3.5-flash-lite")
    FALLBACK_MODELS: str = Field(
        default="gemini-3.1-flash-lite,gemini-3-flash-preview,gemini-3.8-flash"
    )
    # Context Management Safeguards: max previous turns passed to model
    MAX_HISTORY_MESSAGES: int = Field(default=20)
    
    # Configurable Chatbot Persona & System Instruction
    CHATBOT_PERSONA: str = Field(default="default")
    CUSTOM_SYSTEM_INSTRUCTION: Optional[str] = Field(default=None)

    # Server & Environment Configuration
    ENVIRONMENT: str = Field(default="development")
    LOG_LEVEL: str = Field(default="INFO")
    HOST: str = Field(default="127.0.0.1")
    PORT: int = Field(default=8000)
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,https://internship-iota-three.vercel.app/"
    )
    ENABLE_DOCS: bool = Field(default=True)
    SECURITY_HEADERS: bool = Field(default=True)
    RATE_LIMIT_PER_MINUTE: int = Field(default=60)

    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated origin strings into a list for FastAPI CORS."""
        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def fallback_models_list(self) -> List[str]:
        """Parse fallback model names into a list."""
        return [
            model.strip()
            for model in self.FALLBACK_MODELS.split(",")
            if model.strip()
        ]

settings = Settings()
