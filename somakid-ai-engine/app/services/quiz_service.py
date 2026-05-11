"""
SOMAKID AI Engine - Quiz Service
Orchestrates educational quiz generation for the Climate Resilience Academy.
Handles quiz creation, answer validation, and progress tracking.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid

from ..core.config import settings
from ..core.exceptions import ValidationException, AIServiceException
from ..core.logging_config import get_logger, log_performance, log_error
from ..models.schemas import QuestionQuiz, ResultatQuiz
from ..utils.prompts import get_quiz_generation_prompt, get_fallback_quiz_response
from .gemini_client import GeminiClient
from ..repositories.memory_repository import MemoryRepository

logger = get_logger(__name__)

# Key used in memory progress to store previously asked question texts
_PREV_QUESTIONS_KEY = "quiz_previous_question_texts"
# Max questions to remember per session (semantic window for dedup)
_DEDUP_WINDOW = 30


class QuizService:
    VALID_SUBJECTS = {
        "biodiversity", "biodiversite",
        "climate", "climat",
        "disasters", "catastrophes",
        "behaviors", "comportements",
    }
    POINTS_MULTIPLIER = {1: 10, 2: 15, 3: 20, 4: 25, 5: 30}

    def __init__(self, gemini_client: GeminiClient, memory_repo: MemoryRepository):
        self.gemini = gemini_client
        self.memory = memory_repo
        logger.info("quiz_service_initialized")

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    async def generate_question(
        self,
        subject: str,
        level: int = 1,
        language: str = "fr",
        session_id: Optional[str] = None,
        previous_questions: Optional[List[str]] = None,
    ) -> QuestionQuiz:
        self._validate_generation_inputs(subject, level, language)

        # Load previously asked question TEXTS from session memory
        session_previous = self._load_previous_question_texts(session_id) if session_id else []

        # Merge with any caller-supplied list, deduplicate, keep most recent
        combined = list(dict.fromkeys(session_previous + (previous_questions or [])))
        combined = combined[-_DEDUP_WINDOW:]

        prompt = get_quiz_generation_prompt(
            language=language,
            subject=subject,
            level=level,
            previous_questions=combined,
        )

        try:
            raw_response = await self.gemini.generate_text(prompt=prompt)
            result_data = self.gemini.extract_json_from_response(raw_response)
        except AIServiceException:
            logger.warning("quiz_generation_failed_using_fallback")
            result_data = get_fallback_quiz_response(language, "quiz_error")

        question = self._build_question(result_data, subject, level, language)

        if session_id:
            self._track_question_generated(session_id, question)

        logger.info(
            "quiz_question_generated",
            subject=subject, level=level, language=language,
            dedup_window=len(combined),
        )
        return question

    async def validate_answer(
        self,
        question: Optional[QuestionQuiz],
        chosen_answer: int,
        session_id: Optional[str] = None,
        child_id: Optional[str] = None,
        response_time_ms: Optional[int] = None,
    ) -> ResultatQuiz:
        if question is None:
            return ResultatQuiz(
                est_correcte=False, reponse_correcte=0,
                explication="Question non disponible.",
                points_gagnes=0, message="Reessaie !",
            )
        if not 0 <= chosen_answer < len(question.options):
            raise ValidationException(f"Invalid answer index: {chosen_answer}.")

        is_correct = chosen_answer == question.reponse_correcte
        points_earned = question.points if is_correct else 0

        result = ResultatQuiz(
            est_correcte=is_correct,
            reponse_correcte=question.reponse_correcte,
            explication=question.explication,
            points_gagnes=points_earned,
            message=self._get_result_message(is_correct, "fr"),
        )

        if session_id:
            self._record_answer(
                session_id=session_id,
                child_id=child_id,
                subject="quiz",
                is_correct=is_correct,
                points_earned=points_earned,
            )

        logger.info("quiz_answer_validated", correct=is_correct, points_earned=points_earned)
        return result

    def get_available_subjects(self, language: str = "fr") -> List[Dict[str, Any]]:
        subjects = {
            "fr": [
                {"id": "biodiversity", "name": "Biodiversite",              "emoji": "🌿", "color": "#2D9B6E"},
                {"id": "climate",      "name": "Climat",                    "emoji": "🌍", "color": "#1B6CA8"},
                {"id": "disasters",    "name": "Catastrophes Naturelles",   "emoji": "⛈️", "color": "#C0392B"},
                {"id": "behaviors",    "name": "Comportements Ecologiques", "emoji": "♻️", "color": "#8B5CF6"},
            ],
            "ln": [
                {"id": "biodiversity", "name": "Biodiversite",        "emoji": "🌿", "color": "#2D9B6E"},
                {"id": "climate",      "name": "Climat",              "emoji": "🌍", "color": "#1B6CA8"},
                {"id": "disasters",    "name": "Ba Likama ya Mbula",  "emoji": "⛈️", "color": "#C0392B"},
                {"id": "behaviors",    "name": "Bizaleli ya Malamu",  "emoji": "♻️", "color": "#8B5CF6"},
            ],
            "sw": [
                {"id": "biodiversity", "name": "Bioanuwai",           "emoji": "🌿", "color": "#2D9B6E"},
                {"id": "climate",      "name": "Hali ya Hewa",        "emoji": "🌍", "color": "#1B6CA8"},
                {"id": "disasters",    "name": "Majanga ya Asili",    "emoji": "⛈️", "color": "#C0392B"},
                {"id": "behaviors",    "name": "Tabia za Kiikolojia", "emoji": "♻️", "color": "#8B5CF6"},
            ],
        }
        return subjects.get(language, subjects["fr"])

    # ─────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _validate_generation_inputs(self, subject: str, level: int, language: str) -> None:
        if subject not in self.VALID_SUBJECTS:
            raise ValidationException(
                f"Invalid subject: '{subject}'. Valid: {', '.join(self.VALID_SUBJECTS)}"
            )
        if not 1 <= level <= 5:
            raise ValidationException(f"Level must be between 1 and 5, got: {level}")

    def _build_question(
        self, data: Dict[str, Any], subject: str, level: int, language: str
    ) -> QuestionQuiz:
        options = data.get("options", [])
        if len(options) < 2:
            options = ["Option A", "Option B"]
        correct_index = data.get("reponse_correcte", data.get("correct_answer", 0))
        if not 0 <= correct_index < len(options):
            correct_index = 0
        points = self.POINTS_MULTIPLIER.get(level, 10)

        return QuestionQuiz(
            identifiant=str(uuid.uuid4()),
            question=data.get("question", "Question"),
            options=options[:4],
            reponse_correcte=correct_index,
            explication=data.get("explication", data.get("explanation", "Explication")),
            fait_bonus=data.get("fait_bonus", data.get("bonus_fact")),
            points=points,
            emoji_sujet=data.get("emoji_sujet", data.get("subject_emoji", "🌿")),
            message_felicitations=data.get(
                "message_felicitations",
                data.get("congratulations_message", "Bien joue !"),
            ),
            conseil_pratique=data.get("conseil_pratique", data.get("practical_tip")),
        )

    def _get_result_message(self, is_correct: bool, language: str) -> str:
        if is_correct:
            return "Excellent travail ! Continue comme ca !"
        return "Pas de souci ! Apprendre prend du temps. Reessaie !"

    # ── Session memory helpers ────────────────────────────────────────────────

    def _load_previous_question_texts(self, session_id: str) -> List[str]:
        """Return the list of question TEXTS asked so far in this session."""
        try:
            progress = self.memory.load_progress(session_id)
            return progress.get(_PREV_QUESTIONS_KEY, [])
        except Exception as e:
            log_error(logger, "Failed to load previous question texts", exception=e)
            return []

    def _track_question_generated(self, session_id: str, question: QuestionQuiz) -> None:
        """
        Persist the question TEXT (not just the ID) so future calls can pass it
        to the prompt and prevent the model from regenerating the same question.
        """
        try:
            progress = self.memory.load_progress(session_id)

            # Track IDs (existing behaviour — kept for backward compat)
            question_ids = progress.get("quiz_questions_generated", [])
            question_ids.append(question.identifiant)

            # Track question TEXTS for semantic deduplication (new)
            question_texts = progress.get(_PREV_QUESTIONS_KEY, [])
            if question.question and question.question not in question_texts:
                question_texts.append(question.question)

            self.memory.save_progress(session_id, {
                **progress,
                "quiz_questions_generated": question_ids[-20:],
                _PREV_QUESTIONS_KEY: question_texts[-_DEDUP_WINDOW:],
            })
        except Exception as e:
            log_error(logger, "Failed to track question generation", exception=e)

    def _record_answer(
        self,
        session_id: str,
        child_id: Optional[str],
        subject: str,
        is_correct: bool,
        points_earned: int,
    ) -> None:
        try:
            progress = self.memory.load_progress(session_id)
            completed = progress.get("quiz_completed", 0) + 1
            correct = progress.get("correct_answers", 0) + (1 if is_correct else 0)
            updated_progress = {
                **progress,
                "quiz_completed": completed,
                "correct_answers": correct,
                "total_points": progress.get("total_points", 0) + points_earned,
                "last_activity": datetime.now(timezone.utc).isoformat(),
            }
            if child_id:
                updated_progress["child_id"] = child_id
            self.memory.save_progress(session_id, updated_progress)
        except Exception as e:
            log_error(logger, "Failed to record answer", exception=e)