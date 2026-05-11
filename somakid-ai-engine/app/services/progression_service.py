"""
SOMAKID AI Engine - Progression Service
Tracks and manages child learning progress, levels, badges, and achievements.
Calculates level progression and unlocks rewards.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

from ..core.config import (
    settings,
    LEVEL_THRESHOLDS,
    LEVEL_TITLES,
    LEVEL_EMOJIS,
    AVAILABLE_BADGES,
)
from ..core.exceptions import (
    ValidationException,
    ChildProfileException,
)
from ..core.logging_config import get_logger, log_error
from ..models.schemas import ProgressionEnfant, Badge
from ..repositories.memory_repository import MemoryRepository

logger = get_logger(__name__)


# =============================================================================
# Progression Service
# =============================================================================

class ProgressionService:
    """
    Service for managing child learning progression.
    Handles level calculations, badge unlocks, and progress tracking.
    """

    def __init__(self, memory_repo: MemoryRepository):
        """
        Initialize the progression service.

        Args:
            memory_repo: Memory repository for persistence.
        """
        self.memory = memory_repo
        logger.info("progression_service_initialized")

    # =========================================================================
    # Progress Retrieval
    # =========================================================================

    def get_progress(
        self,
        session_id: str,
        child_id: Optional[str] = None,
    ) -> ProgressionEnfant:
        """
        Get complete progress data for a child.

        Args:
            session_id: Session identifier.
            child_id: Optional child identifier.

        Returns:
            Complete progression data.

        Raises:
            ChildProfileException: If session is not found.
        """
        data = self.memory.load_progress(session_id)

        if not data or "session_id" not in data:
            raise ChildProfileException(f"Session '{session_id}' not found.")

        # Calculate derived values
        total_points = data.get("total_points", 0)
        level = self._calculate_level(total_points)
        title = self._get_level_title(level)
        badges = self._get_earned_badges(data)
        new_badges = self._check_new_badges(data)

        # Merge newly earned badges
        if new_badges:
            badges.extend(new_badges)
            self._save_badges(session_id, badges)

        return ProgressionEnfant(
            identifiant_session=session_id,
            identifiant_enfant=child_id or data.get("child_id"),
            points_total=total_points,
            niveau=level,
            titre=title,
            badges=[Badge(**b) if isinstance(b, dict) else b for b in badges],
            especes_decouvertes=data.get("species_discovered", []),
            quiz_completes=data.get("quiz_completed", 0),
            total_messages=data.get("total_messages", 0),
            derniere_activite=data.get("updated_at", data.get("created_at")),
        )

    # =========================================================================
    # Points Management
    # =========================================================================

    def add_points(
        self,
        session_id: str,
        points: int,
        source: str = "activity",
    ) -> Dict[str, Any]:
        """
        Add points to a child's progress.

        Args:
            session_id: Session identifier.
            points: Points to add.
            source: Source of the points (quiz, discovery, chat).

        Returns:
            Updated progress summary with level change info.

        Raises:
            ValidationException: If points value is invalid.
        """
        if points <= 0:
            raise ValidationException("Points must be positive.")

        data = self.memory.load_progress(session_id)
        old_level = self._calculate_level(data.get("total_points", 0))
        new_total = data.get("total_points", 0) + points
        new_level = self._calculate_level(new_total)

        # Update data
        updated_data = {
            **data,
            "total_points": new_total,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Track points by source
        points_by_source = data.get("points_by_source", {})
        points_by_source[source] = points_by_source.get(source, 0) + points
        updated_data["points_by_source"] = points_by_source

        self.memory.save_progress(session_id, updated_data)

        # Check for level up
        leveled_up = new_level > old_level

        result = {
            "session_id": session_id,
            "points_added": points,
            "total_points": new_total,
            "current_level": new_level,
            "leveled_up": leveled_up,
        }

        if leveled_up:
            result["new_title"] = self._get_level_title(new_level)
            result["new_level_emoji"] = LEVEL_EMOJIS.get(new_level, "🌱")
            logger.info(
                "child_leveled_up",
                session_id=session_id,
                old_level=old_level,
                new_level=new_level,
            )

        # Check for new badges
        new_badges = self._check_new_badges(updated_data)
        if new_badges:
            result["new_badges"] = new_badges

        return result

    # =========================================================================
    # Discovery Tracking
    # =========================================================================

    def record_discovery(
        self,
        session_id: str,
        species_name: str,
        points_earned: int = 10,
    ) -> Dict[str, Any]:
        """
        Record a new species discovery.

        Args:
            session_id: Session identifier.
            species_name: Name of the discovered species.
            points_earned: Points earned for this discovery.

        Returns:
            Discovery record result.
        """
        data = self.memory.load_progress(session_id)
        discovered = data.get("species_discovered", [])

        is_new = species_name not in discovered

        if is_new:
            discovered.append(species_name)
            updated_data = {
                **data,
                "species_discovered": discovered,
                "total_points": data.get("total_points", 0) + points_earned,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            self.memory.save_progress(session_id, updated_data)

        return {
            "species": species_name,
            "is_new_discovery": is_new,
            "total_species_discovered": len(discovered),
            "points_earned": points_earned if is_new else 0,
        }

    # =========================================================================
    # Quiz Progress
    # =========================================================================

    def record_quiz_completion(
        self,
        session_id: str,
        is_correct: bool,
        points_earned: int = 0,
    ) -> Dict[str, Any]:
        """
        Record completion of a quiz question.

        Args:
            session_id: Session identifier.
            is_correct: Whether the answer was correct.
            points_earned: Points earned.

        Returns:
            Updated quiz statistics.
        """
        data = self.memory.load_progress(session_id)

        updated_data = {
            **data,
            "quiz_completed": data.get("quiz_completed", 0) + 1,
            "correct_answers": data.get("correct_answers", 0) + (1 if is_correct else 0),
            "total_points": data.get("total_points", 0) + points_earned,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        self.memory.save_progress(session_id, updated_data)

        total_quiz = updated_data["quiz_completed"]
        total_correct = updated_data["correct_answers"]
        accuracy = round((total_correct / total_quiz) * 100, 1) if total_quiz > 0 else 0.0

        return {
            "total_quiz_completed": total_quiz,
            "correct_answers": total_correct,
            "accuracy_percent": accuracy,
            "points_earned": points_earned,
        }

    # =========================================================================
    # Level Calculation
    # =========================================================================

    def get_level_info(self, points: int) -> Dict[str, Any]:
        """
        Get detailed level information for a given point total.

        Args:
            points: Total points accumulated.

        Returns:
            Level details including progression percentage.
        """
        level = self._calculate_level(points)

        # Calculate progress to next level
        current_threshold = LEVEL_THRESHOLDS.get(level, 0)
        next_threshold = LEVEL_THRESHOLDS.get(level + 1)

        if next_threshold and level < 5:
            points_in_level = points - current_threshold
            points_needed = next_threshold - current_threshold
            progress_percent = round((points_in_level / points_needed) * 100, 1)
            points_to_next = next_threshold - points
        else:
            progress_percent = 100.0
            points_to_next = 0

        return {
            "current_level": level,
            "level_title": self._get_level_title(level),
            "level_emoji": LEVEL_EMOJIS.get(level, "🌱"),
            "total_points": points,
            "progress_percent": progress_percent,
            "points_to_next_level": points_to_next,
            "is_max_level": level >= 5,
        }

    # =========================================================================
    # Badge Management
    # =========================================================================

    def get_all_badges(self) -> List[Dict[str, Any]]:
        """
        Get the list of all available badges.

        Returns:
            List of badge definitions.
        """
        return AVAILABLE_BADGES

    def get_earned_badges(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Get badges earned by a child.

        Args:
            session_id: Session identifier.

        Returns:
            List of earned badges.
        """
        data = self.memory.load_progress(session_id)
        return self._get_earned_badges(data)

    # =========================================================================
    # Private Methods
    # =========================================================================

    def _calculate_level(self, points: int) -> int:
        """
        Calculate level based on total points.

        Args:
            points: Total points accumulated.

        Returns:
            Current level (1-5).
        """
        if points >= LEVEL_THRESHOLDS.get(5, 500):
            return 5
        elif points >= LEVEL_THRESHOLDS.get(4, 300):
            return 4
        elif points >= LEVEL_THRESHOLDS.get(3, 150):
            return 3
        elif points >= LEVEL_THRESHOLDS.get(2, 50):
            return 2
        return 1

    def _get_level_title(self, level: int) -> str:
        """
        Get the title for a given level.

        Args:
            level: Level number (1-5).

        Returns:
            Level title string.
        """
        return LEVEL_TITLES.get(level, "Junior Explorer")

    def _get_earned_badges(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get badges already earned from session data.

        Args:
            data: Session data.

        Returns:
            List of earned badges.
        """
        return data.get("badges", [])

    def _check_new_badges(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Check if any new badges should be unlocked.

        Args:
            data: Current session data.

        Returns:
            List of newly unlocked badges.
        """
        earned_ids = {
            b.get("id") if isinstance(b, dict) else b.identifiant
            for b in self._get_earned_badges(data)
        }

        current_stats = {
            "quiz_completed": data.get("quiz_completed", 0),
            "species_discovered": len(data.get("species_discovered", [])),
            "total_points": data.get("total_points", 0),
            "chat_messages": data.get("total_messages", 0),
        }

        new_badges = []
        for badge_def in AVAILABLE_BADGES:
            if badge_def["id"] in earned_ids:
                continue

            condition = badge_def["condition"]
            if condition["type"] in current_stats:
                if current_stats[condition["type"]] >= condition["value"]:
                    badge = {
                        **badge_def,
                        "obtenu_le": datetime.now(timezone.utc).isoformat(),
                    }
                    new_badges.append(badge)

        return new_badges

    def _save_badges(self, session_id: str, badges: List[Dict[str, Any]]) -> None:
        """
        Save updated badges to session data.

        Args:
            session_id: Session identifier.
            badges: List of badges to save.
        """
        data = self.memory.load_progress(session_id)
        data["badges"] = badges
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.memory.save_progress(session_id, data)