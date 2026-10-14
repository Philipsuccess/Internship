import logging
import re
from typing import Optional
from app.core.config import settings

class SensitiveDataFilter(logging.Filter):
    """Logging filter that scrubs sensitive Gemini API keys and credentials from all log outputs."""

    # Common patterns for Gemini API keys:
    # 1. AIzaSy... (legacy 39-character format)
    # 2. AQ.... (modern project API key format, ~53 chars)
    KEY_PATTERNS = [
        re.compile(r'AIza[0-9A-Za-z\-_]{20,}'),
        re.compile(r'AQ\.[0-9A-Za-z\-_]{20,}'),
        re.compile(r'(?:key|api_key)=([A-Za-z0-9_\-\.]+)', re.IGNORECASE),
    ]

    def filter(self, record: logging.LogRecord) -> bool:
        # Scrub msg
        if isinstance(record.msg, str):
            record.msg = self.scrub_text(record.msg)

        # Scrub args if present
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: self.scrub_value(v) for k, v in record.args.items()}
            elif isinstance(record.args, tuple):
                record.args = tuple(self.scrub_value(v) for v in record.args)

        # Scrub exc_text if formatted
        if getattr(record, 'exc_text', None) and isinstance(record.exc_text, str):
            record.exc_text = self.scrub_text(record.exc_text)

        return True

    @classmethod
    def scrub_value(cls, val):
        if isinstance(val, str):
            return cls.scrub_text(val)
        return val

    @classmethod
    def scrub_text(cls, text: str) -> str:
        if not text:
            return text

        # Specifically scrub the active configured API key if present
        active_key = settings.GEMINI_API_KEY.strip()
        if active_key and len(active_key) > 8 and active_key in text:
            text = text.replace(active_key, "[REDACTED_API_KEY]")

        # Scrub general pattern matches
        for pattern in cls.KEY_PATTERNS:
            text = pattern.sub("[REDACTED_API_KEY]", text)

        return text

def setup_logging():
    """Configure application-wide logging with the sensitive data redaction filter."""
    sensitive_filter = SensitiveDataFilter()
    
    # Configure logging level from settings
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    
    # Attach to root logger and specific app loggers
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    if not any(isinstance(f, SensitiveDataFilter) for f in root_logger.filters):
        root_logger.addFilter(sensitive_filter)

    for handler in root_logger.handlers:
        if not any(isinstance(f, SensitiveDataFilter) for f in handler.filters):
            handler.addFilter(sensitive_filter)

    app_logger = logging.getLogger("app")
    app_logger.setLevel(level)
    if not any(isinstance(f, SensitiveDataFilter) for f in app_logger.filters):
        app_logger.addFilter(sensitive_filter)
