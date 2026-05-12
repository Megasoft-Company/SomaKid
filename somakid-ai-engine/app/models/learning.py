"""
SOMAKID AI Engine - Learning Domain Models
Core business entities for the structured learning system.
Represents learning paths, units, lessons, exercises, and child progression.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from enum import Enum


# =============================================================================
# Enumerations
# =============================================================================

class ExerciseType(str, Enum):
    """Types of exercises available in lessons."""
    FILL_BLANK = "fill_blank"
    MATCHING = "matching"
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    OPEN_QUESTION = "open_question"
    IMAGE_IDENTIFICATION = "image_identification"


class LessonType(str, Enum):
    """Types of lessons in the learning path."""
    THEORY = "theory"
    PRACTICE = "practice"
    REVIEW = "review"
    EXAM = "exam"


class PathSubject(str, Enum):
    """Available learning path subjects."""
    BIODIVERSITY = "biodiversity"
    CLIMATE = "climate"
    DISASTERS = "disasters"
    BEHAVIORS = "behaviors"


# =============================================================================
# Value Objects
# =============================================================================

@dataclass(frozen=True)
class TranslatedText:
    """Value object for multilingual text content."""
    fr: str = ""
    en: str = ""
    ln: str = ""
    sw: str = ""

    def get(self, language: str = "fr") -> str:
        """Get text in the requested language."""
        translations = {"fr": self.fr, "en": self.en, "ln": self.ln, "sw": self.sw}
        return translations.get(language, self.fr)

    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary."""
        return {"fr": self.fr, "en": self.en, "ln": self.ln, "sw": self.sw}


@dataclass(frozen=True)
class Difficulty:
    """Value object for exercise/lesson difficulty level."""
    value: int = 1

    def __post_init__(self):
        if not 1 <= self.value <= 5:
            raise ValueError(f"Difficulty must be between 1 and 5, got: {self.value}")

    @property
    def label(self) -> str:
        """Get difficulty label."""
        labels = {
            1: "very_easy",
            2: "easy",
            3: "medium",
            4: "hard",
            5: "expert",
        }
        return labels.get(self.value, "medium")

    @property
    def stars(self) -> str:
        """Get star representation."""
        return "⭐" * self.value


@dataclass(frozen=True)
class Score:
    """Value object for tracking scores."""
    value: int = 0

    def __post_init__(self):
        if self.value < 0:
            raise ValueError("Score cannot be negative")

    @property
    def percentage(self) -> float:
        """Get score as percentage (assumes max 100)."""
        return min(float(self.value), 100.0)

    @property
    def passed(self) -> bool:
        """Check if score meets passing threshold (70%)."""
        return self.value >= 70

    @property
    def grade(self) -> str:
        """Get letter grade."""
        if self.value >= 90:
            return "A"
        elif self.value >= 80:
            return "B"
        elif self.value >= 70:
            return "C"
        elif self.value >= 60:
            return "D"
        return "F"


# =============================================================================
# Domain Entities
# =============================================================================

@dataclass
class LearningPath:
    """Entity representing a complete learning path (e.g., Biodiversity)."""
    id: UUID = field(default_factory=uuid4)
    slug: str = ""
    name: TranslatedText = field(default_factory=TranslatedText)
    description: TranslatedText = field(default_factory=TranslatedText)
    emoji: str = "🌿"
    color: str = "#2D9B6E"
    icon_url: Optional[str] = None
    total_units: int = 5
    order_index: int = 0
    is_published: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def get_name(self, language: str = "fr") -> str:
        """Get path name in the requested language."""
        return self.name.get(language)

    def get_description(self, language: str = "fr") -> str:
        """Get path description in the requested language."""
        return self.description.get(language)

    def to_dict(self, language: str = "fr") -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "id": str(self.id),
            "slug": self.slug,
            "name": self.get_name(language),
            "description": self.get_description(language),
            "emoji": self.emoji,
            "color": self.color,
            "total_units": self.total_units,
            "order_index": self.order_index,
        }


@dataclass
class Unit:
    """Entity representing a unit within a learning path."""
    id: UUID = field(default_factory=uuid4)
    path_id: UUID = field(default_factory=uuid4)
    slug: str = ""
    name: TranslatedText = field(default_factory=TranslatedText)
    description: TranslatedText = field(default_factory=TranslatedText)
    unit_number: int = 1
    total_lessons: int = 4
    required_score: int = 70
    is_locked: bool = True
    is_completed: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def get_name(self, language: str = "fr") -> str:
        """Get unit name in the requested language."""
        return self.name.get(language)

    def can_unlock(self, previous_unit_completed: bool, previous_test_passed: bool) -> bool:
        """Check if this unit can be unlocked."""
        if self.unit_number == 1:
            return True
        return previous_unit_completed and previous_test_passed

    def to_dict(self, language: str = "fr") -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "id": str(self.id),
            "path_id": str(self.path_id),
            "slug": self.slug,
            "name": self.get_name(language),
            "description": self.description.get(language),
            "unit_number": self.unit_number,
            "total_lessons": self.total_lessons,
            "required_score": self.required_score,
            "is_locked": self.is_locked,
            "is_completed": self.is_completed,
        }


@dataclass
class Lesson:
    """Entity representing a single lesson within a unit."""
    id: UUID = field(default_factory=uuid4)
    unit_id: UUID = field(default_factory=uuid4)
    slug: str = ""
    title: TranslatedText = field(default_factory=TranslatedText)
    content: TranslatedText = field(default_factory=TranslatedText)
    summary: TranslatedText = field(default_factory=TranslatedText)
    lesson_type: LessonType = LessonType.THEORY
    key_points: List[TranslatedText] = field(default_factory=list)
    vocabulary: List[Dict[str, str]] = field(default_factory=list)
    exercises: List["Exercise"] = field(default_factory=list)
    fun_fact: TranslatedText = field(default_factory=TranslatedText)
    practical_tip: TranslatedText = field(default_factory=TranslatedText)
    emoji: str = "📚"
    difficulty: Difficulty = field(default_factory=Difficulty)
    estimated_minutes: int = 5
    order_index: int = 0
    is_completed: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def get_title(self, language: str = "fr") -> str:
        """Get lesson title in the requested language."""
        return self.title.get(language)

    def get_content(self, language: str = "fr") -> str:
        """Get lesson content in the requested language."""
        return self.content.get(language)

    def get_exercise_count(self) -> int:
        """Get total number of exercises."""
        return len(self.exercises)

    def is_unlocked(self, previous_lessons_completed: int) -> bool:
        """Check if this lesson is unlocked based on previous completion."""
        if self.order_index == 0:
            return True
        return previous_lessons_completed >= self.order_index

    def to_dict(self, language: str = "fr") -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "id": str(self.id),
            "unit_id": str(self.unit_id),
            "slug": self.slug,
            "title": self.get_title(language),
            "content": self.get_content(language),
            "summary": self.summary.get(language),
            "lesson_type": self.lesson_type.value,
            "key_points": [kp.get(language) for kp in self.key_points],
            "vocabulary": self.vocabulary,
            "exercises": [ex.to_dict(language) for ex in self.exercises],
            "fun_fact": self.fun_fact.get(language),
            "practical_tip": self.practical_tip.get(language),
            "emoji": self.emoji,
            "difficulty": self.difficulty.value,
            "estimated_minutes": self.estimated_minutes,
            "order_index": self.order_index,
            "is_completed": self.is_completed,
        }


@dataclass
class Exercise:
    """Entity representing a single exercise within a lesson."""
    id: UUID = field(default_factory=uuid4)
    lesson_id: Optional[UUID] = None
    exercise_type: ExerciseType = ExerciseType.MULTIPLE_CHOICE
    question: TranslatedText = field(default_factory=TranslatedText)
    options: List[TranslatedText] = field(default_factory=list)
    correct_answer: Any = None
    explanation: TranslatedText = field(default_factory=TranslatedText)
    keywords: List[str] = field(default_factory=list)
    points: int = 5
    order_index: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def get_question(self, language: str = "fr") -> str:
        """Get question in the requested language."""
        return self.question.get(language)

    def get_options(self, language: str = "fr") -> List[str]:
        """Get options in the requested language."""
        return [opt.get(language) for opt in self.options]

    def get_explanation(self, language: str = "fr") -> str:
        """Get explanation in the requested language."""
        return self.explanation.get(language)

    def check_answer(self, user_answer: Any) -> bool:
        """Check if user's answer is correct."""
        if self.exercise_type == ExerciseType.MULTIPLE_CHOICE:
            return str(user_answer) == str(self.correct_answer)

        elif self.exercise_type == ExerciseType.TRUE_FALSE:
            return str(user_answer).lower() == str(self.correct_answer).lower()

        elif self.exercise_type == ExerciseType.FILL_BLANK:
            return str(user_answer).strip().lower() == str(self.correct_answer).strip().lower()

        elif self.exercise_type == ExerciseType.OPEN_QUESTION:
            user_text = str(user_answer).strip().lower()
            if self.keywords:
                matches = sum(1 for kw in self.keywords if kw.lower() in user_text)
                return matches >= len(self.keywords) * 0.5
            return len(user_text) > 10

        elif self.exercise_type == ExerciseType.IMAGE_IDENTIFICATION:
            return str(user_answer).strip().lower() == str(self.correct_answer).strip().lower()

        return False

    def to_dict(self, language: str = "fr") -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "id": str(self.id),
            "exercise_type": self.exercise_type.value,
            "question": self.get_question(language),
            "options": self.get_options(language) if self.exercise_type in (
                ExerciseType.MULTIPLE_CHOICE,
                ExerciseType.MATCHING,
            ) else [],
            "explanation": self.get_explanation(language),
            "points": self.points,
            "order_index": self.order_index,
        }


@dataclass
class UnitTest:
    """Entity representing a validation test for completing a unit."""
    id: UUID = field(default_factory=uuid4)
    unit_id: UUID = field(default_factory=uuid4)
    child_id: Optional[UUID] = None
    title: TranslatedText = field(default_factory=TranslatedText)
    questions: List[Exercise] = field(default_factory=list)
    passing_score: int = 70
    time_limit_minutes: int = 15
    score: Optional[Score] = None
    passed: bool = False
    attempt_count: int = 0
    completed_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def get_title(self, language: str = "fr") -> str:
        """Get test title in the requested language."""
        return self.title.get(language)

    def calculate_score(self, answers: List[Any]) -> Score:
        """Calculate score based on submitted answers."""
        if not self.questions:
            return Score(0)

        correct_count = 0
        for i, answer in enumerate(answers):
            if i < len(self.questions) and self.questions[i].check_answer(answer):
                correct_count += 1

        percentage = int((correct_count / len(self.questions)) * 100)
        return Score(percentage)

    def is_passed(self, score: Score) -> bool:
        """Check if the score meets the passing threshold."""
        return score.value >= self.passing_score

    def to_dict(self, language: str = "fr") -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "id": str(self.id),
            "unit_id": str(self.unit_id),
            "title": self.get_title(language),
            "total_questions": len(self.questions),
            "passing_score": self.passing_score,
            "time_limit_minutes": self.time_limit_minutes,
            "score": self.score.value if self.score else None,
            "passed": self.passed,
            "attempt_count": self.attempt_count,
        }


@dataclass
class ChildLearningProgress:
    """Aggregate entity tracking a child's progress through learning paths."""
    child_id: UUID = field(default_factory=uuid4)
    path_id: Optional[UUID] = None
    current_unit_number: int = 1
    current_lesson_number: int = 1
    completed_lesson_ids: List[UUID] = field(default_factory=list)
    completed_unit_ids: List[UUID] = field(default_factory=list)
    passed_test_ids: List[UUID] = field(default_factory=list)
    total_points_earned: int = 0
    total_time_spent_seconds: int = 0
    streak_days: int = 0
    last_activity_date: Optional[datetime] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def total_lessons_completed(self) -> int:
        """Get total number of completed lessons."""
        return len(self.completed_lesson_ids)

    @property
    def total_units_completed(self) -> int:
        """Get total number of completed units."""
        return len(self.completed_unit_ids)

    @property
    def total_tests_passed(self) -> int:
        """Get total number of passed tests."""
        return len(self.passed_test_ids)

    def complete_lesson(self, lesson_id: UUID, points: int = 10) -> None:
        """Mark a lesson as completed and add points."""
        if lesson_id not in self.completed_lesson_ids:
            self.completed_lesson_ids.append(lesson_id)
            self.total_points_earned += points
            self._update_activity()

    def complete_unit(self, unit_id: UUID) -> None:
        """Mark a unit as completed."""
        if unit_id not in self.completed_unit_ids:
            self.completed_unit_ids.append(unit_id)
            self.current_unit_number += 1
            self.current_lesson_number = 1
            self._update_activity()

    def pass_test(self, test_id: UUID, score: int) -> None:
        """Record a passed unit test."""
        if test_id not in self.passed_test_ids:
            self.passed_test_ids.append(test_id)
            self._update_activity()

    def add_streak_day(self) -> None:
        """Increment the learning streak."""
        today = datetime.now(timezone.utc).date()
        if self.last_activity_date and self.last_activity_date.date() == today:
            return
        elif self.last_activity_date and (today - self.last_activity_date.date()).days == 1:
            self.streak_days += 1
        else:
            self.streak_days = 1
        self._update_activity()

    def is_unit_unlocked(self, unit_number: int) -> bool:
        """Check if a unit is unlocked."""
        if unit_number <= 1:
            return True
        previous_unit_id = f"unit_{unit_number - 1}"
        return previous_unit_id in [str(uid) for uid in self.completed_unit_ids]

    def get_progress_percentage(self, total_units: int = 5) -> float:
        """Get overall progress percentage for a path."""
        if total_units == 0:
            return 0.0
        return min((self.total_units_completed / total_units) * 100, 100.0)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "child_id": str(self.child_id),
            "path_id": str(self.path_id) if self.path_id else None,
            "current_unit_number": self.current_unit_number,
            "current_lesson_number": self.current_lesson_number,
            "total_lessons_completed": self.total_lessons_completed,
            "total_units_completed": self.total_units_completed,
            "total_tests_passed": self.total_tests_passed,
            "total_points_earned": self.total_points_earned,
            "total_time_spent_seconds": self.total_time_spent_seconds,
            "streak_days": self.streak_days,
            "last_activity_date": self.last_activity_date.isoformat() if self.last_activity_date else None,
        }

    def _update_activity(self) -> None:
        """Update last activity timestamp."""
        self.last_activity_date = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)