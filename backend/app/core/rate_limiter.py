import time
from collections import defaultdict
from threading import Lock
from typing import Tuple

class InMemoryRateLimiter:
    """Thread-safe in-memory sliding window rate limiter per client IP.
    
    Protects the API gateway from automated flooding attacks and prevents
    excessive Gemini API quota consumption without introducing third-party dependencies.
    """

    def __init__(self, requests_per_minute: int = 60, window_seconds: float = 60.0):
        self.rpm = requests_per_minute
        self.window = window_seconds
        self._clients = defaultdict(list)
        self._lock = Lock()

    def is_allowed(self, client_id: str) -> Tuple[bool, int]:
        """Check if request from client_id is within the configured rate limit.
        
        Args:
            client_id: Unique client identifier (e.g., client IP address)
            
        Returns:
            Tuple of (allowed: bool, retry_after_seconds: int)
        """
        if self.rpm <= 0:
            # 0 or negative disables rate limiting
            return True, 0

        now = time.time()
        cutoff = now - self.window

        with self._lock:
            # Retain only timestamps within the active sliding window
            timestamps = [t for t in self._clients[client_id] if t > cutoff]
            if len(timestamps) >= self.rpm:
                oldest_timestamp = timestamps[0]
                retry_after = max(1, int(oldest_timestamp + self.window - now))
                return False, retry_after

            timestamps.append(now)
            self._clients[client_id] = timestamps
            return True, 0

    def reset(self):
        """Reset rate limiter state (used between test runs)."""
        with self._lock:
            self._clients.clear()
