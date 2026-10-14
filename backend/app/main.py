import logging
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.api.chat import router as chat_router

# Initialize redacted logging on application startuWp
setup_logging()
logger = logging.getLogger(__name__)

is_prod = settings.ENVIRONMENT.lower() == "production"
docs_enabled = settings.ENABLE_DOCS and not is_prod

app = FastAPI(
    title="Educational AI Chatbot API",
    description="FastAPI backend for AI Chatbot using Google Gemini API",
    version="1.0.0",
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
)

# CORS setup to allow communication with the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Attach production security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    if settings.SECURITY_HEADERS:
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# -----------------------------------------------------------------------------
# Global Exception Handlers: Standardize Error Output and Protect Secrets
# -----------------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic schema validation failures with clean, readable error messages."""
    errors = exc.errors()
    if errors:
        first_error = errors[0]
        field_loc = [str(loc) for loc in first_error.get("loc", []) if loc not in ("body",)]
        field_name = " -> ".join(field_loc) if field_loc else "request"
        raw_msg = first_error.get("msg", "Invalid input")
        
        # Format user-friendly message
        if "value_error" in first_error.get("type", ""):
            detail = raw_msg.replace("Value error, ", "")
        else:
            detail = f"Invalid input for {field_name}: {raw_msg}"
    else:
        detail = "Malformed request payload. Please verify JSON structure."

    logger.warning("Request validation rejected: %s", detail)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": detail},
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Ensure HTTP exceptions return standardized JSON responses preserving response headers."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc.detail)},
        headers=exc.headers,
    )

@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all unhandled exceptions to prevent stack trace leaks to the client."""
    logger.error("Unhandled server exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )

# Register chat endpoint under /api -> exposes POST /api/chat
app.include_router(chat_router, prefix="/api", tags=["Chat"])

@app.get("/")
def read_root():
    """Root endpoint providing service metadata."""
    return {
        "service": "Educational AI Chatbot Backend",
        "status": "online",
        "health_check": "/health",
        "chat_endpoint": "/api/chat",
        "docs": "/docs",
    }

@app.get("/health")
def health_check():
    """Health check endpoint confirming that backend is running."""
    return {
        "status": "healthy",
        "message": "Backend server is running successfully",
        "model_configured": settings.MODEL_NAME,
    }
