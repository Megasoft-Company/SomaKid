"""
SOMAKID AI Engine - Health Challenges & Progress Routes
Defis (challenges) and aggregate progress/badges for the Sante module.
Named 'health_challenges' (not 'health') to avoid clashing with the infra healthcheck
route already mounted at /health.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..deps import get_memory_repository
from ...repositories.memory_repository import MemoryRepository
from ...utils.health_prompts import HEALTH_CHALLENGES, get_health_challenges
from ...services.health_progress import load_health_progress, bump_challenge_progress
from ...core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter()

_CHALLENGE_BY_ID = {ch["id"]: ch for ch in HEALTH_CHALLENGES}


class ChallengeProgressRequest(BaseModel):
    child_id: str = Field(min_length=1)
    increment: int = Field(default=1, ge=1, le=20)


@router.get("")
async def list_health_challenges(
    language: str = Query(default="fr"),
    child_id: Optional[str] = Query(default=None),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    catalog = get_health_challenges(language=language)
    if child_id:
        progress_data = load_health_progress(memory_repo, child_id)
        challenge_progress = progress_data.get("challenges", {})
        for item in catalog:
            entry = challenge_progress.get(item["id"], {"progress": 0, "completed": False})
            item["progress"] = entry.get("progress", 0)
            item["completed"] = entry.get("completed", False)
    return JSONResponse(content={"success": True, "data": catalog, "total": len(catalog)})


@router.post("/{challenge_id}/progress")
async def update_challenge_progress(
    challenge_id: str,
    body: ChallengeProgressRequest,
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    challenge = _CHALLENGE_BY_ID.get(challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail=f"Challenge '{challenge_id}' not found.")

    result = bump_challenge_progress(
        memory_repo,
        child_id=body.child_id,
        challenge_id=challenge_id,
        target_value=challenge["target_value"],
        target_metric=challenge["target_metric"],
        increment=body.increment,
        points_on_complete=challenge["points"],
    )
    logger.info(
        "health_challenge_progress_updated",
        child_id=body.child_id, challenge_id=challenge_id,
        newly_completed=result["newly_completed"],
    )
    return JSONResponse(content={"success": True, "data": result})


@router.get("/analytics/top-questions")
async def get_top_health_questions(
    limit: int = Query(default=20, ge=1, le=100),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    """Most recently asked health questions to SOMA — a simple frequency-independent
    view for the analytics dashboard (cahier item 14)."""
    data = memory_repo.load_progress("health_chat_questions_log")
    questions = data.get("questions", [])
    return JSONResponse(content={"success": True, "data": list(reversed(questions))[:limit]})


@router.get("/{child_id}/summary")
async def get_health_progress_summary(
    child_id: str,
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    data = load_health_progress(memory_repo, child_id)
    return JSONResponse(content={"success": True, "data": {
        "child_id": child_id,
        "lessons_completed": data.get("lessons_completed", 0),
        "quiz_completed": data.get("quiz_completed", 0),
        "points": data.get("points", 0),
        "badges": data.get("badges", []),
        "challenges": data.get("challenges", {}),
        "time_spent_seconds": data.get("time_spent_seconds", 0),
    }})
