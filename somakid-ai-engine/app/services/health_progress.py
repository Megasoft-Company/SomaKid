"""
SOMAKID AI Engine - Health Progress Helpers
Lightweight, self-contained aggregate progress, badge and challenge tracking for the
Sante module. Deliberately decoupled from ProgressionService's session_id-keyed badge
logic (used by the Environnement module) to avoid touching that existing flow — health
progress is tracked per child_id under its own memory key.
"""

from typing import Dict, Any, List
from datetime import datetime, timezone

from ..core.config import AVAILABLE_BADGES
from ..repositories.memory_repository import MemoryRepository

HEALTH_BADGE_CONDITION_TYPES = {
    "health_lessons_completed", "health_quiz_completed",
    "hygiene_streak_days", "health_points",
}


def _key(child_id: str) -> str:
    return f"health_progress:{child_id}"


def load_health_progress(memory: MemoryRepository, child_id: str) -> Dict[str, Any]:
    data = memory.load_progress(_key(child_id))
    data.setdefault("lessons_completed", 0)
    data.setdefault("quiz_completed", 0)
    data.setdefault("points", 0)
    data.setdefault("badges", [])
    data.setdefault("challenges", {})
    data.setdefault("time_spent_seconds", 0)
    return data


def save_health_progress(memory: MemoryRepository, child_id: str, data: Dict[str, Any]) -> None:
    memory.save_progress(_key(child_id), data)


def check_and_award_health_badges(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Mutates data['badges'] in place with any newly-earned health badges and returns them."""
    earned_ids = {b.get("id") for b in data.get("badges", [])}
    stats = {
        "health_lessons_completed": data.get("lessons_completed", 0),
        "health_quiz_completed": data.get("quiz_completed", 0),
        "hygiene_streak_days": data.get("challenges", {}).get("handwashing_7_days", {}).get("progress", 0),
        "health_points": data.get("points", 0),
    }
    new_badges = []
    for badge_def in AVAILABLE_BADGES:
        condition = badge_def.get("condition", {})
        if condition.get("type") not in HEALTH_BADGE_CONDITION_TYPES:
            continue
        if badge_def["id"] in earned_ids:
            continue
        if stats.get(condition["type"], 0) >= condition["value"]:
            new_badges.append({**badge_def, "obtenu_le": datetime.now(timezone.utc).isoformat()})
    if new_badges:
        data["badges"] = data.get("badges", []) + new_badges
    return new_badges


def add_lesson_completed(memory: MemoryRepository, child_id: str, points: int) -> List[Dict[str, Any]]:
    data = load_health_progress(memory, child_id)
    data["lessons_completed"] += 1
    data["points"] += points
    new_badges = check_and_award_health_badges(data)
    save_health_progress(memory, child_id, data)
    return new_badges


def bump_challenge_progress(
    memory: MemoryRepository,
    child_id: str,
    challenge_id: str,
    target_value: int,
    target_metric: str = "",
    increment: int = 1,
    points_on_complete: int = 0,
) -> Dict[str, Any]:
    data = load_health_progress(memory, child_id)
    challenges = data.setdefault("challenges", {})
    entry = challenges.setdefault(challenge_id, {"progress": 0, "completed": False, "completed_at": None})

    newly_completed = False
    if not entry["completed"]:
        entry["progress"] = min(entry["progress"] + increment, target_value)
        if entry["progress"] >= target_value:
            entry["completed"] = True
            entry["completed_at"] = datetime.now(timezone.utc).isoformat()
            newly_completed = True
            data["points"] += points_on_complete

        # Feed the underlying badge counter this challenge represents, if any.
        if target_metric == "health_quiz_completed":
            data["quiz_completed"] = data.get("quiz_completed", 0) + increment

    new_badges = check_and_award_health_badges(data)
    save_health_progress(memory, child_id, data)
    return {"entry": entry, "newly_completed": newly_completed, "new_badges": new_badges}
