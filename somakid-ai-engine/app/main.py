"""
SOMAKID AI Engine - Main Application Entry Point
FastAPI application for climate education and biodiversity awareness.
Clean Code Architecture with dependency injection and structured logging.
"""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from .core.config import settings
from .core.logging_config import logger, log_request
from .core.security import limiter
from .api.middleware.error_handler import register_exception_handlers
from .api.middleware.rate_limit import configure_rate_limiting

# Import route modules
from .api.routes import health as health_routes
from .api.routes import vision as vision_routes
from .api.routes import quiz as quiz_routes
from .api.routes import chat as chat_routes
from .api.routes import voice as voice_routes
from .api.routes import progression as progression_routes


# =============================================================================
# Application Lifecycle
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle events.
    
    Startup:
    - Validate configuration
    - Create required directories
    - Initialize connections
    
    Shutdown:
    - Close connections
    - Save pending data
    """
    # --- Startup ---
    logger.info(
        "application_starting",
        environment=settings.ENVIRONMENT.value,
        version="1.0.0",
    )

    try:
        settings.validate_configuration()
        settings.create_directories()
        logger.info("configuration_validated")
        
        summary = settings.display_summary()
        logger.info("configuration_summary", summary=summary)
        
    except Exception as e:
        logger.error("startup_failed", error=str(e))
        raise

    yield

    # --- Shutdown ---
    logger.info("application_shutting_down")


# =============================================================================
# Application Creation
# =============================================================================

app = FastAPI(
    title="SOMAKID AI Engine",
    description=(
        "AI-powered educational platform for climate awareness, "
        "biodiversity education, and children's resilience.\n\n"
        "## Core Modules\n"
        "- **Biodiversity Explorer**: Species identification from images\n"
        "- **Climate Resilience Academy**: Gamified educational quizzes\n"
        "- **SOMA Tutor Chat**: Interactive AI conversations\n"
        "- **Voice Support**: Text-to-speech and speech-to-text\n"
        "- **Progression Tracking**: Learning progress and achievements\n\n"
        "## Supported Languages\n"
        "- French (fr)\n"
        "- Lingala (ln)\n"
        "- Swahili (sw)"
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    openapi_url="/openapi.json" if settings.is_development else None,
    contact={
        "name": "SOMAKID AI Team",
        "email": "contact@somakid.ai",
    },
    license_info={
        "name": "MIT",
    },
)


# =============================================================================
# Middleware Registration
# =============================================================================

# CORS
app.add_middleware(
    CORSMiddleware,
    **settings.cors_config,
)

# GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Rate Limiting
configure_rate_limiting(app)

# Error Handling
register_exception_handlers(app)


# =============================================================================
# Request Logging Middleware
# =============================================================================

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """
    Log all HTTP requests with duration and status code.
    Adds request tracing headers.
    """
    start_time = time.time()

    # Generate unique request ID
    from .utils.helpers import generate_short_id
    request_id = generate_short_id("req")
    request.state.request_id = request_id

    try:
        response = await call_next(request)

        duration_ms = (time.time() - start_time) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

        log_request(
            logger,
            method=request.method,
            path=request.url.path,
            duration_ms=duration_ms,
            status_code=response.status_code,
        )

        return response

    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            "unhandled_request_error",
            method=request.method,
            path=request.url.path,
            duration_ms=round(duration_ms, 2),
            error=str(e),
        )
        raise


# =============================================================================
# Route Registration
# =============================================================================

# Root endpoint
@app.get(
    "/",
    summary="API Root",
    description="Entry point for SOMAKID AI Engine API.",
    tags=["Root"],
)
async def root(request: Request):
    """Root endpoint returning API information."""
    return {
        "service": "SOMAKID AI Engine",
        "version": "1.0.0",
        "description": "Intelligent Tutor for Climate, Biodiversity and Children's Resilience",
        "documentation": "/docs" if settings.is_development else None,
        "health": "/health",
        "modules": [
            {"name": "Biodiversity Explorer", "prefix": "/api/v1/vision"},
            {"name": "Climate Academy", "prefix": "/api/v1/quiz"},
            {"name": "SOMA Chat", "prefix": "/api/v1/chat"},
            {"name": "Voice Support", "prefix": "/api/v1/voice"},
            {"name": "Progression", "prefix": "/api/v1/progression"},
        ],
        "supported_languages": settings.supported_languages_list,
        "environment": settings.ENVIRONMENT.value,
        "timestamp": request.state.request_id if hasattr(request.state, 'request_id') else None,
    }


@app.get(
    "/ping",
    summary="Ping",
    description="Ultra-lightweight health check endpoint.",
    tags=["Health"],
)
async def ping():
    """Lightweight ping for load balancers and monitoring."""
    return {"pong": True}


# Include routers
app.include_router(health_routes.router, prefix="/health", tags=["Health"])
app.include_router(vision_routes.router, prefix="/api/v1/vision", tags=["Vision - Image Analysis"])
app.include_router(quiz_routes.router, prefix="/api/v1/quiz", tags=["Quiz - Climate Academy"])
app.include_router(chat_routes.router, prefix="/api/v1/chat", tags=["Chat - SOMA Tutor"])
app.include_router(voice_routes.router, prefix="/api/v1/voice", tags=["Voice - TTS & STT"])
app.include_router(progression_routes.router, prefix="/api/v1/progression", tags=["Progression - Tracking"])


# =============================================================================
# Run Configuration
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    logger.info(
        "starting_uvicorn_server",
        host=settings.HOST,
        port=settings.PORT,
        workers=settings.WORKERS if settings.is_production else 1,
    )

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        workers=settings.WORKERS if settings.is_production else 1,
        reload=settings.is_development,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=settings.is_development,
    )