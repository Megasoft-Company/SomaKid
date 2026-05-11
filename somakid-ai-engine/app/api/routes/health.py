"""
SOMAKID AI Engine - Health Check Routes
Provides endpoints for service health monitoring and diagnostics.
"""

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ..deps import get_gemini_client, get_memory_repository
from ...services.gemini_client import GeminiClient
from ...repositories.memory_repository import MemoryRepository
from ...core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Track application start time
START_TIME = datetime.now(timezone.utc)


# =============================================================================
# Routes
# =============================================================================

@router.get(
    "/live",
    summary="Liveness Check",
    description="Simple check to verify the service is running.",
)
async def liveness_check():
    """
    Lightweight endpoint for container orchestration liveness probes.
    Returns 200 if the process is alive.
    """
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get(
    "/ready",
    summary="Readiness Check",
    description="Comprehensive check to verify the service is ready to handle requests.",
)
async def readiness_check(
    gemini_client: GeminiClient = Depends(get_gemini_client),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    """
    Endpoint for container orchestration readiness probes.
    Verifies all external dependencies are available.

    Args:
        gemini_client: Injected Gemini client.
        memory_repo: Injected memory repository.

    Returns:
        Health status with component details.
    """
    components = {}

    # Check Gemini API
    try:
        gemini_health = await gemini_client.health_check()
        components["gemini_api"] = {
            "status": gemini_health["status"],
            "latency_ms": gemini_health.get("latency_ms"),
        }
    except Exception as e:
        components["gemini_api"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    # Check Memory Repository
    try:
        memory_ok = memory_repo.health_check()
        components["memory_repository"] = {
            "status": "healthy" if memory_ok else "unhealthy",
        }
    except Exception as e:
        components["memory_repository"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    # Determine overall status
    all_healthy = all(
        comp.get("status") == "healthy"
        for comp in components.values()
    )

    status_code = 200 if all_healthy else 503

    uptime_seconds = (datetime.now(timezone.utc) - START_TIME).total_seconds()

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_healthy else "degraded",
            "service": "SOMAKID AI Engine",
            "version": "1.0.0",
            "uptime_seconds": int(uptime_seconds),
            "components": components,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@router.get(
    "",
    summary="Full Health Check",
    description="Returns complete health status of all components.",
)
async def health_check(
    gemini_client: GeminiClient = Depends(get_gemini_client),
):
    """
    Complete health check endpoint for monitoring systems.

    Args:
        gemini_client: Injected Gemini client.

    Returns:
        Comprehensive health status.
    """
    gemini_health = await gemini_client.health_check()
    uptime_seconds = (datetime.now(timezone.utc) - START_TIME).total_seconds()

    return {
        "status": "operational",
        "service": "SOMAKID AI Engine",
        "version": "1.0.0",
        "environment": "development",
        "model": gemini_health.get("model", "unknown"),
        "uptime_seconds": int(uptime_seconds),
        "gemini_api": gemini_health,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }