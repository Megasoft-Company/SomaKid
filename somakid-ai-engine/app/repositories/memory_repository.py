"""
SOMAKID AI Engine - Memory Repository
Handles session data persistence in the local filesystem.
Manages child progress, conversation history, and session state.
"""

import json
import os
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

from ..core.logging_config import get_logger, log_error

logger = get_logger(__name__)


# =============================================================================
# Memory Repository
# =============================================================================

class MemoryRepository:
    """
    Repository for persisting session data and child progress.
    Stores data as JSON files in the data/memory directory.
    """

    def __init__(self, data_dir: Path):
        """
        Initialize the memory repository.

        Args:
            data_dir: Path to the memory data directory.
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        logger.info("memory_repository_initialized", data_dir=str(self.data_dir))

    # =========================================================================
    # Progress Management
    # =========================================================================

    def save_progress(self, session_id: str, data: Dict[str, Any]) -> bool:
        """
        Save progress data for a session.

        Args:
            session_id: Session identifier.
            data: Progress data to save.

        Returns:
            True if saved successfully.
        """
        try:
            file_path = self._get_session_path(session_id)

            # Load existing data and merge
            existing = {}
            if file_path.exists():
                existing = json.loads(file_path.read_text(encoding="utf-8"))

            merged = {**existing, **data}
            merged["updated_at"] = datetime.now(timezone.utc).isoformat()

            # Write atomically
            temp_path = file_path.with_suffix(".tmp")
            temp_path.write_text(
                json.dumps(merged, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            temp_path.replace(file_path)

            return True

        except Exception as e:
            log_error(logger, "Failed to save progress", exception=e, session_id=session_id)
            return False

    def load_progress(self, session_id: str) -> Dict[str, Any]:
        """
        Load progress data for a session.

        Args:
            session_id: Session identifier.

        Returns:
            Progress data dictionary. Returns empty dict with defaults if not found.
        """
        try:
            file_path = self._get_session_path(session_id)

            if file_path.exists():
                return json.loads(file_path.read_text(encoding="utf-8"))

            # Return default progress structure
            return {
                "session_id": session_id,
                "total_points": 0,
                "level": 1,
                "title": "Junior Explorer",
                "badges": [],
                "species_discovered": [],
                "quiz_completed": 0,
                "correct_answers": 0,
                "total_messages": 0,
                "total_time_seconds": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

        except json.JSONDecodeError:
            logger.warning("corrupted_progress_file", session_id=session_id)
            return {
                "session_id": session_id,
                "total_points": 0,
                "level": 1,
                "title": "Junior Explorer",
            }
        except Exception as e:
            log_error(logger, "Failed to load progress", exception=e, session_id=session_id)
            return {"session_id": session_id}

    def delete_progress(self, session_id: str) -> bool:
        """
        Delete progress data for a session.

        Args:
            session_id: Session identifier.

        Returns:
            True if deleted successfully.
        """
        try:
            file_path = self._get_session_path(session_id)
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            log_error(logger, "Failed to delete progress", exception=e)
            return False

    # =========================================================================
    # Session Management
    # =========================================================================

    def list_active_sessions(self, max_age_hours: int = 24) -> List[Dict[str, Any]]:
        """
        List active sessions (updated within the specified hours).

        Args:
            max_age_hours: Maximum age in hours to consider a session active.

        Returns:
            List of active session summaries.
        """
        active_sessions = []
        cutoff = datetime.now(timezone.utc)

        try:
            for file_path in self.data_dir.glob("session_*.json"):
                try:
                    data = json.loads(file_path.read_text(encoding="utf-8"))
                    updated_at = data.get("updated_at", data.get("created_at", ""))

                    if updated_at:
                        last_activity = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                        age_hours = (cutoff - last_activity).total_seconds() / 3600

                        if age_hours <= max_age_hours:
                            active_sessions.append({
                                "session_id": data.get("session_id", file_path.stem),
                                "total_points": data.get("total_points", 0),
                                "level": data.get("level", 1),
                                "title": data.get("title", "Junior Explorer"),
                                "species_count": len(data.get("species_discovered", [])),
                                "quiz_completed": data.get("quiz_completed", 0),
                                "last_activity": updated_at,
                            })
                except Exception:
                    continue

        except Exception as e:
            log_error(logger, "Failed to list sessions", exception=e)

        return sorted(active_sessions, key=lambda s: s.get("last_activity", ""), reverse=True)

    def get_total_sessions_count(self) -> int:
        """
        Get total number of session files.

        Returns:
            Total session count.
        """
        try:
            return len(list(self.data_dir.glob("session_*.json")))
        except Exception:
            return 0

    # =========================================================================
    # Health Check
    # =========================================================================

    def health_check(self) -> bool:
        """
        Check if the memory repository is operational.

        Returns:
            True if the repository is healthy.
        """
        try:
            # Check directory exists and is writable
            test_file = self.data_dir / ".health_check"
            test_file.write_text("ok")
            test_file.unlink()
            return True
        except Exception:
            return False

    # =========================================================================
    # Private Helpers
    # =========================================================================

    def _get_session_path(self, session_id: str) -> Path:
        """
        Get the file path for a session.

        Args:
            session_id: Session identifier.

        Returns:
            Path object for the session file.
        """
        # Sanitize session_id to prevent path traversal
        safe_id = "".join(
            c for c in session_id
            if c.isalnum() or c in "_-"
        )
        return self.data_dir / f"{safe_id}.json"