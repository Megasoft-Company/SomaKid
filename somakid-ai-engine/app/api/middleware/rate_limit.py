"""
SOMAKID AI Engine - Rate Limiting Middleware
Configures per-route and global rate limiting using slowapi.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from ...core.config import settings
from ...core.security import limiter
from ...core.logging_config import get_logger
from ...utils.helpers import build_error_response

logger = get_logger(__name__)


# =============================================================================
# Rate Limit Error Handler
# =============================================================================

async def rate_limit_exceeded_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """
    Custom handler for rate limit exceeded errors.

    Args:
        request: Incoming request that exceeded the limit.
        exc: Rate limit exception.

    Returns:
        429 JSON response with retry information.
    """
    logger.warning(
        "rate_limit_exceeded",
        client_ip=request.client.host if request.client else "unknown",
        path=request.url.path,
    )

    return JSONResponse(
        status_code=429,
        content=build_error_response(
            error_code="RATE_LIMIT_EXCEEDED",
            message="Too many requests. Please slow down.",
            details={
                "retry_after_seconds": settings.RATE_LIMIT_PERIOD,
                "limit": f"{settings.RATE_LIMIT_REQUESTS} requests per {settings.RATE_LIMIT_PERIOD} seconds",
            },
        ),
        headers={
            "Retry-After": str(settings.RATE_LIMIT_PERIOD),
            "X-RateLimit-Limit": str(settings.RATE_LIMIT_REQUESTS),
            "X-RateLimit-Period": str(settings.RATE_LIMIT_PERIOD),
        },
    )


# =============================================================================
# Rate Limit Configuration Registration
# =============================================================================

def configure_rate_limiting(app: FastAPI) -> None:
    """
    Configure rate limiting on the FastAPI application.

    Args:
        app: FastAPI application instance.
    """
    app.state.limiter = limiter
    app.add_exception_handler(429, rate_limit_exceeded_handler)

    logger.info(
        "rate_limiting_configured",
        requests_per_period=settings.RATE_LIMIT_REQUESTS,
        period_seconds=settings.RATE_LIMIT_PERIOD,
    )