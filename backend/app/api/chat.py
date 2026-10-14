import asyncio
import logging
from fastapi import APIRouter, HTTPException, Request, status
from app.core.config import settings
from app.core.rate_limiter import InMemoryRateLimiter
from app.schemas.chat import ChatRequest, ChatResponse, ErrorDetailResponse
from app.services.gemini_service import (
    gemini_service,
    GeminiConfigurationError,
    GeminiRateLimitError,
    GeminiSafetyError,
    GeminiServiceError,
    GeminiUpstreamError,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# 35-second server-side timeout budget for model generation + fallbacks
REQUEST_TIMEOUT_SECONDS = 35

# In-memory rate limiter protecting against excessive API quota drain
rate_limiter = InMemoryRateLimiter(requests_per_minute=settings.RATE_LIMIT_PER_MINUTE)

@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate chat response with Gemini AI",
    responses={
        400: {"model": ErrorDetailResponse, "description": "Bad Request or Safety Filter block"},
        429: {"model": ErrorDetailResponse, "description": "Rate limit / Quota exceeded"},
        500: {"model": ErrorDetailResponse, "description": "Server or Configuration Error"},
        502: {"model": ErrorDetailResponse, "description": "Upstream Gemini Error"},
        504: {"model": ErrorDetailResponse, "description": "Gateway / Generation Timeout"},
    },
)
async def chat_endpoint(request: ChatRequest, client_request: Request) -> ChatResponse:
    """Receive a user message and conversation history, validate the request,
    communicate with Google's Gemini API via the resilient service layer, and return a clean response.
    """
    # 1. Enforce IP-based Rate Limiting
    client_ip = client_request.client.host if client_request.client else "127.0.0.1"
    is_allowed, retry_after = rate_limiter.is_allowed(client_ip)
    if not is_allowed:
        logger.warning("Rate limit exceeded for client %s (retry-after: %ds)", client_ip, retry_after)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests from your IP. Please wait {retry_after} seconds before sending another message.",
            headers={"Retry-After": str(retry_after)},
        )

    try:
        async with asyncio.timeout(REQUEST_TIMEOUT_SECONDS):
            reply_text = await gemini_service.generate_response(
                message=request.message,
                conversation_history=request.conversation_history,
                persona=request.persona,
            )
        return ChatResponse(
            response=reply_text,
            session_id=request.session_id,
        )

    except TimeoutError:
        logger.error("Chat generation timed out after %d seconds", REQUEST_TIMEOUT_SECONDS)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The AI model took too long to respond. Please try again.",
        )

    except GeminiConfigurationError as err:
        logger.error("Configuration error in chat endpoint: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(err),
        )

    except GeminiSafetyError as err:
        logger.warning("Safety block in chat endpoint: %s", err)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )

    except GeminiRateLimitError as err:
        logger.warning("Rate limit in chat endpoint: %s", err)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(err),
        )

    except GeminiUpstreamError as err:
        logger.error("Upstream error in chat endpoint: %s", err)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI service is temporarily unavailable. Please try again shortly.",
        )

    except GeminiServiceError as err:
        logger.error("Gemini service error: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI response. Please try again.",
        )

    except Exception as exc:
        logger.error("Unhandled exception in chat_endpoint: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred. Please try again later.",
        )
