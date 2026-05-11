"""
SOMAKID AI Engine - Progression Routes
HTTP endpoints for managing child learning progress and achievements.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse

from ..deps import get_progression_service, get_memory_repository
from ...services.progression_service import ProgressionService
from ...repositories.memory_repository import MemoryRepository
from ...core.config import settings
from ...core.exceptions import (
    ValidationException,
    ChildProfileException,
)
from ...core.logging_config import get_logger
from ...models.schemas import ProgressionRequete

logger = get_logger(__name__)

router = APIRouter()


# =============================================================================
# Routes
# =============================================================================

@router.get(
    "/{session_id}",
    summary="Get Child Progress",
    description="Get complete progress data for a child's session.",
    response_description="Child progress with level, points, badges, and discoveries.",
)
async def get_progress(
    session_id: str,
    child_id: Optional[str] = None,
    progression_service: ProgressionService = Depends(get_progression_service),
):
    """
    Get full progress data for a child session.

    Args:
        session_id: Session identifier.
        child_id: Optional child identifier.
        progression_service: Injected progression service.

    Returns:
        Complete progression data.

    Raises:
        HTTPException: If session is not found.
    """
    try:
        progress = progression_service.get_progress(
            session_id=session_id,
            child_id=child_id,
        )

        return JSONResponse(
            content={
                "success": True,
                "data": progress.model_dump(),
            }
        )

    except ChildProfileException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)


@router.post(
    "/points/add",
    summary="Add Points",
    description="Add points to a child's progression.",
)
async def add_points(
    request: ProgressionRequete,
    progression_service: ProgressionService = Depends(get_progression_service),
):
    """
    Add points to a child's progress.

    Args:
        request: Points addition request with session and score.
        progression_service: Injected progression service.

    Returns:
        Updated progress summary.

    Raises:
        HTTPException: If validation fails.
    """
    try:
        result = progression_service.add_points(
            session_id=request.identifiant_session,
            points=request.score,
            source=request.module,
        )

        return JSONResponse(
            content={
                "success": True,
                "data": result,
            }
        )

    except ValidationException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)


@router.get(
    "/{session_id}/level",
    summary="Level Information",
    description="Get detailed level information for a session.",
)
async def get_level_info(
    session_id: str,
    progression_service: ProgressionService = Depends(get_progression_service),
):
    """
    Get level progression details.

    Args:
        session_id: Session identifier.
        progression_service: Injected progression service.

    Returns:
        Level details including progress percentage.

    Raises:
        HTTPException: If session is not found.
    """
    try:
        progress = progression_service.get_progress(session_id=session_id)
        level_info = progression_service.get_level_info(progress.points_total)

        return JSONResponse(
            content={
                "success": True,
                "data": level_info,
            }
        )

    except ChildProfileException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)


@router.get(
    "/{session_id}/badges",
    summary="Earned Badges",
    description="Get badges earned by a child.",
)
async def get_badges(
    session_id: str,
    progression_service: ProgressionService = Depends(get_progression_service),
):
    """
    Get badges earned by the child.

    Args:
        session_id: Session identifier.
        progression_service: Injected progression service.

    Returns:
        List of earned badges.
    """
    try:
        badges = progression_service.get_earned_badges(session_id=session_id)

        return JSONResponse(
            content={
                "success": True,
                "data": badges,
                "total": len(badges),
            }
        )

    except ChildProfileException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)


@router.get(
    "/badges/available",
    summary="All Available Badges",
    description="Get the list of all badges that can be earned.",
)
async def get_available_badges(
    progression_service: ProgressionService = Depends(get_progression_service),
):
    """
    Get all available badge definitions.

    Args:
        progression_service: Injected progression service.

    Returns:
        List of all badge definitions.
    """
    badges = progression_service.get_all_badges()

    return JSONResponse(
        content={
            "success": True,
            "data": badges,
            "total": len(badges),
        }
    )


@router.get(
    "/sessions/active",
    summary="Active Sessions",
    description="List active sessions (for admin monitoring).",
)
async def list_active_sessions(
    max_age_hours: int = Query(default=24, ge=1, le=168),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    """
    List active sessions within the specified time window.

    Args:
        max_age_hours: Maximum age in hours for a session to be considered active.
        memory_repo: Injected memory repository.

    Returns:
        List of active session summaries.
    """
    sessions = memory_repo.list_active_sessions(max_age_hours=max_age_hours)

    return JSONResponse(
        content={
            "success": True,
            "data": sessions,
            "total": len(sessions),
        }
    )