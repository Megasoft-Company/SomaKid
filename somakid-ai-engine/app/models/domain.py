"""
SOMAKID AI Engine - Domain Models
Core business entities and value objects following DDD principles.
Represents the heart of the SOMAKID AI educational platform.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from enum import Enum


# =============================================================================
# Value Objects
# =============================================================================

@dataclass(frozen=True)
class ScientificName:
    """Value object for a scientific species name."""
    genus: str
    species: str
    author: Optional[str] = None

    def __post_init__(self):
        if not self.genus or not self.genus.strip():
            raise ValueError("Genus cannot be empty")
        if not self.species or not self.species.strip():
            raise ValueError("Species cannot be empty")

    def full_name(self) -> str:
        """Get the full scientific name."""
        name = f"{self.genus.capitalize()} {self.species.lower()}"
        if self.author:
            name += f" ({self.author})"
        return name

    def __str__(self) -> str:
        return self.full_name()


@dataclass(frozen=True)
class ChildPIN:
    """Value object for a child's 4-digit PIN code."""
    value: str

    def __post_init__(self):
        if not self.value.isdigit():
            raise ValueError("PIN must contain only digits")
        if len(self.value) != 4:
            raise ValueError("PIN must be exactly 4 digits")

    def verify(self, other_pin: str) -> bool:
        """Verify if another PIN matches."""
        return self.value == other_pin


@dataclass(frozen=True)
class ChildAge:
    """Value object for a child's age."""
    value: int

    def __post_init__(self):
        if not 3 <= self.value <= 15:
            raise ValueError(f"Age must be between 3 and 15, got: {self.value}")

    def is_young_child(self) -> bool:
        """Check if child is under 7 years old."""
        return self.value < 7

    def age_group(self) -> str:
        """Get the child's age group category."""
        if self.value <= 5:
            return "very_young"
        elif self.value <= 8:
            return "young"
        elif self.value <= 12:
            return "middle"
        return "teenager"


@dataclass(frozen=True)
class Points:
    """Value object for tracking learning points."""
    amount: int = 0

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Points cannot be negative")

    def add(self, quantity: int) -> "Points":
        """Add points and return new instance."""
        if quantity < 0:
            raise ValueError("Cannot add negative points")
        return Points(amount=self.amount + quantity)

    def calculate_level(self) -> int:
        """Calculate level based on points."""
        if self.amount >= 500:
            return 5
        elif self.amount >= 300:
            return 4
        elif self.amount >= 150:
            return 3
        elif self.amount >= 50:
            return 2
        return 1

    def progression_to_next_level(self) -> float:
        """Calculate progression percentage to next level."""
        thresholds = {1: 0, 2: 50, 3: 150, 4: 300, 5: 500}
        current_level = self.calculate_level()

        if current_level >= 5:
            return 1.0

        current_threshold = thresholds[current_level]
        next_threshold = thresholds[current_level + 1]
        progress = (self.amount - current_threshold) / (next_threshold - current_threshold)

        return min(max(progress, 0.0), 1.0)


# =============================================================================
# Domain Entities
# =============================================================================

@dataclass
class Species:
    """Entity representing an identified species."""
    id: UUID = field(default_factory=uuid4)
    common_name: str = ""
    scientific_name: Optional[ScientificName] = None
    local_name: Optional[str] = None
    category: str = "other"
    description: str = ""
    ecological_role: str = ""
    fun_fact: str = ""
    threats: Optional[str] = None
    danger_level: str = "none"
    safety_advice: Optional[str] = None
    origin_region: str = "Africa"
    conservation_status: str = "Not Evaluated"
    primary_emoji: str = "🌿"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def is_dangerous(self) -> bool:
        """Check if species presents any danger."""
        return self.danger_level in ("low", "moderate")

    def get_identity_card(self) -> Dict[str, Any]:
        """Get complete species identity card."""
        return {
            "id": str(self.id),
            "common_name": self.common_name,
            "scientific_name": str(self.scientific_name) if self.scientific_name else None,
            "local_name": self.local_name,
            "category": self.category,
            "description": self.description,
            "ecological_role": self.ecological_role,
            "fun_fact": self.fun_fact,
            "threats": self.threats,
            "danger_level": self.danger_level,
            "safety_advice": self.safety_advice,
            "emoji": self.primary_emoji,
        }


@dataclass
class Discovery:
    """Entity representing a species discovery by a child."""
    id: UUID = field(default_factory=uuid4)
    child_id: Optional[UUID] = None
    species: Optional[Species] = None
    image_path: Optional[str] = None
    discovery_date: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    points_earned: int = 10

    def get_summary(self) -> str:
        """Get a summary of the discovery."""
        if self.species:
            return f"Discovery: {self.species.primary_emoji} {self.species.common_name}"
        return "New nature discovery"


@dataclass
class QuizQuestion:
    """Entity representing an educational quiz question."""
    id: UUID = field(default_factory=uuid4)
    subject: str = "biodiversity"
    question: str = ""
    options: List[str] = field(default_factory=list)
    correct_answer: int = 0
    explanation: str = ""
    bonus_fact: Optional[str] = None
    points: int = 10
    difficulty_level: int = 1
    language: str = "fr"
    subject_emoji: str = "🌿"
    practical_tip: Optional[str] = None
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def check_answer(self, answer_index: int) -> bool:
        """Check if the given answer is correct."""
        return answer_index == self.correct_answer

    def validate(self) -> bool:
        """Validate question coherence."""
        if not self.question:
            raise ValueError("Question cannot be empty")
        if len(self.options) < 2:
            raise ValueError("At least 2 options required")
        if self.correct_answer >= len(self.options):
            raise ValueError("Correct answer index is invalid")
        if not 1 <= self.difficulty_level <= 5:
            raise ValueError("Difficulty level must be between 1 and 5")
        return True


@dataclass
class QuizAnswer:
    """Entity representing a child's answer to a quiz question."""
    id: UUID = field(default_factory=uuid4)
    question_id: UUID = field(default_factory=uuid4)
    child_id: Optional[UUID] = None
    chosen_answer: int = -1
    is_correct: bool = False
    points_earned: int = 0
    response_time_ms: int = 0
    answered_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def evaluate(self, question: QuizQuestion) -> None:
        """Evaluate answer against question."""
        self.is_correct = question.check_answer(self.chosen_answer)
        self.points_earned = question.points if self.is_correct else 0


@dataclass
class ChatMessage:
    """Entity representing a message in a conversation with SOMA."""
    id: UUID = field(default_factory=uuid4)
    session_id: str = ""
    role: str = "user"
    content: str = ""
    language: str = "fr"
    points_earned: int = 0
    activity_suggestion: Optional[str] = None
    badge_unlocked: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def is_from_tutor(self) -> bool:
        """Check if message is from SOMA tutor."""
        return self.role == "assistant"

    def has_suggestion(self) -> bool:
        """Check if message contains an activity suggestion."""
        return self.activity_suggestion is not None and len(self.activity_suggestion) > 0


@dataclass
class AchievementBadge:
    """Entity representing an achievement badge."""
    badge_id: str = ""
    name: str = ""
    description: str = ""
    emoji: str = "🏅"
    color: str = "#F59E0B"
    condition_type: str = ""
    condition_value: int = 0
    earned_at: Optional[datetime] = None

    def is_unlocked(self, progress: Dict[str, int]) -> bool:
        """Check if badge is unlocked based on progress."""
        if self.condition_type not in progress:
            return False
        return progress[self.condition_type] >= self.condition_value

    def get_reward_details(self) -> Dict[str, Any]:
        """Get badge reward details."""
        return {
            "id": self.badge_id,
            "name": self.name,
            "description": self.description,
            "emoji": self.emoji,
            "color": self.color,
            "earned_at": self.earned_at.isoformat() if self.earned_at else None,
        }


@dataclass
class ChildProgress:
    """Aggregate representing a child's complete learning progress."""
    child_id: Optional[UUID] = None
    session_id: str = ""
    first_name: str = ""
    age: ChildAge = field(default_factory=lambda: ChildAge(8))
    points: Points = field(default_factory=Points)
    level: int = 1
    title: str = "Junior Explorer"
    earned_badges: List[AchievementBadge] = field(default_factory=list)
    discovered_species: List[str] = field(default_factory=list)
    quizzes_completed: int = 0
    correct_answers: int = 0
    total_messages: int = 0
    total_time_seconds: int = 0
    last_activity: Optional[datetime] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def add_points(self, quantity: int) -> None:
        """Add points and recalculate level."""
        self.points = self.points.add(quantity)
        self._recalculate_level()

    def record_discovery(self, species_name: str) -> bool:
        """Record a new species discovery. Returns True if new."""
        if species_name not in self.discovered_species:
            self.discovered_species.append(species_name)
            return True
        return False

    def record_quiz_completion(self, is_correct: bool) -> None:
        """Record completion of a quiz question."""
        self.quizzes_completed += 1
        if is_correct:
            self.correct_answers += 1

    def record_message(self) -> None:
        """Record a chat message sent."""
        self.total_messages += 1

    def get_level_progress(self) -> float:
        """Get progression percentage towards next level."""
        return self.points.progression_to_next_level()

    def check_new_badges(self) -> List[AchievementBadge]:
        """Check for newly unlocked badges."""
        progress = {
            "quiz_completed": self.quizzes_completed,
            "species_discovered": len(self.discovered_species),
            "total_points": self.points.amount,
            "chat_messages": self.total_messages,
        }

        current_badge_ids = {b.badge_id for b in self.earned_badges}
        new_badges = []

        from ..core.config import AVAILABLE_BADGES

        for badge_config in AVAILABLE_BADGES:
            badge_id = badge_config["id"]
            if badge_id in current_badge_ids:
                continue

            condition = badge_config["condition"]
            if condition["type"] in progress and progress[condition["type"]] >= condition["value"]:
                new_badge = AchievementBadge(
                    badge_id=badge_id,
                    name=badge_config["name"],
                    description=badge_config["description"],
                    emoji=badge_config["emoji"],
                    color=badge_config["color"],
                    condition_type=condition["type"],
                    condition_value=condition["value"],
                    earned_at=datetime.now(timezone.utc),
                )
                self.earned_badges.append(new_badge)
                new_badges.append(new_badge)

        return new_badges

    def update_activity(self) -> None:
        """Update last activity timestamp."""
        self.last_activity = datetime.now(timezone.utc)

    def get_summary(self) -> Dict[str, Any]:
        """Get complete progress summary."""
        return {
            "child_id": str(self.child_id) if self.child_id else None,
            "session_id": self.session_id,
            "first_name": self.first_name,
            "age": self.age.value,
            "total_points": self.points.amount,
            "level": self.level,
            "title": self.title,
            "level_emoji": self._get_level_emoji(),
            "level_progress": self.get_level_progress(),
            "badges": [b.get_reward_details() for b in self.earned_badges],
            "species_discovered_count": len(self.discovered_species),
            "quizzes_completed": self.quizzes_completed,
            "correct_answers": self.correct_answers,
            "total_messages": self.total_messages,
            "total_time_seconds": self.total_time_seconds,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "created_at": self.created_at.isoformat(),
        }

    def _recalculate_level(self) -> None:
        """Recalculate level and title based on points."""
        self.level = self.points.calculate_level()
        titles = {
            1: "Junior Explorer",
            2: "Ecology Apprentice",
            3: "Confirmed Explorer",
            4: "Naturalist Expert",
            5: "Climate Guardian",
        }
        self.title = titles.get(self.level, "Junior Explorer")

    def _get_level_emoji(self) -> str:
        """Get emoji for current level."""
        emojis = {1: "🌱", 2: "🌿", 3: "🌳", 4: "🦁", 5: "🌍"}
        return emojis.get(self.level, "🌱")


@dataclass
class LearningSession:
    """Aggregate representing a learning session."""
    session_id: str = ""
    child_id: Optional[UUID] = None
    progress: ChildProgress = field(default_factory=ChildProgress)
    chat_history: List[ChatMessage] = field(default_factory=list)
    current_quiz: Optional[QuizQuestion] = None
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def add_chat_message(self, message: ChatMessage) -> None:
        """Add a message to the conversation history."""
        self.chat_history.append(message)
        self.progress.record_message()
        self.update_activity()

    def get_recent_history(self, count: int = 10) -> List[Dict[str, str]]:
        """Get recent conversation history formatted for AI."""
        messages = self.chat_history[-count:]
        return [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]

    def start_quiz(self, question: QuizQuestion) -> None:
        """Start a new quiz question."""
        self.current_quiz = question
        self.update_activity()

    def complete_quiz(self) -> None:
        """Complete the current quiz."""
        self.current_quiz = None
        self.update_activity()

    def update_activity(self) -> None:
        """Update last activity timestamp."""
        self.last_activity = datetime.now(timezone.utc)
        self.progress.update_activity()

    def is_expired(self, max_duration_seconds: int = 3600) -> bool:
        """Check if session has expired due to inactivity."""
        delta = datetime.now(timezone.utc) - self.last_activity
        return delta.total_seconds() > max_duration_seconds

    def get_session_duration(self) -> float:
        """Get session duration in seconds."""
        delta = datetime.now(timezone.utc) - self.started_at
        return delta.total_seconds()