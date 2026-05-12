"""
SOMAKID AI Engine - Lesson Service
Generates structured lessons with exercises using AI.
Handles lesson content creation, exercise generation, and adaptive difficulty.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid
import random

from ..core.config import settings
from ..core.exceptions import ValidationException, AIServiceException
from ..core.logging_config import get_logger, log_performance, log_error
from ..utils.learning_prompts import (
    get_lesson_generation_prompt,
    get_exercise_generation_prompt,
    get_unit_test_prompt,
)
from .gemini_client import GeminiClient
from ..repositories.memory_repository import MemoryRepository

logger = get_logger(__name__)

EXERCISE_TYPES = [
    "fill_blank",
    "matching",
    "multiple_choice",
    "true_false",
    "open_question",
    "image_identification",
]

EXERCISE_TYPE_NAMES = {
    "fr": {
        "fill_blank": "Texte à trous",
        "matching": "Association",
        "multiple_choice": "QCM",
        "true_false": "Vrai ou Faux",
        "open_question": "Question ouverte",
        "image_identification": "Identification d'image",
    },
    "en": {
        "fill_blank": "Fill in the blank",
        "matching": "Matching",
        "multiple_choice": "Multiple Choice",
        "true_false": "True or False",
        "open_question": "Open Question",
        "image_identification": "Image Identification",
    },
    "ln": {
        "fill_blank": "Kokomisa esika ya pamba",
        "matching": "Kosangisa",
        "multiple_choice": "QCM",
        "true_false": "Vrai to Faux",
        "open_question": "Motuna ya polele",
        "image_identification": "Koyeba elilingi",
    },
    "sw": {
        "fill_blank": "Jaza nafasi",
        "matching": "Kulinganisha",
        "multiple_choice": "Chaguo nyingi",
        "true_false": "Kweli au Uongo",
        "open_question": "Swali wazi",
        "image_identification": "Kutambua picha",
    },
}


class LessonService:
    """
    Generates and manages educational lessons with exercises.
    Supports 6 exercise types and 4 languages.
    """

    def __init__(self, gemini_client: GeminiClient, memory_repo: MemoryRepository):
        self.gemini = gemini_client
        self.memory = memory_repo
        logger.info("lesson_service_initialized")

    async def generate_lesson(
        self,
        path_id: str,
        unit_number: int,
        lesson_number: int,
        language: str = "fr",
        child_age: int = 8,
        child_level: int = 1,
    ) -> Dict[str, Any]:
        """
        Generate a complete lesson with title, content, and exercises.

        Args:
            path_id: Learning path identifier (biodiversity, climate, disasters, behaviors)
            unit_number: Unit number (1-5)
            lesson_number: Lesson number within the unit (1-4)
            language: Language code (fr, en, ln, sw)
            child_age: Child's age for content adaptation
            child_level: Child's current level (1-5)

        Returns:
            Complete lesson with exercises
        """
        logger.info(
            "generating_lesson",
            path=path_id,
            unit=unit_number,
            lesson=lesson_number,
            language=language,
        )

        prompt = get_lesson_generation_prompt(
            path_id=path_id,
            unit_number=unit_number,
            lesson_number=lesson_number,
            language=language,
            child_age=child_age,
            child_level=child_level,
        )

        try:
            raw_response = await self.gemini.generate_text(prompt=prompt)
            lesson_data = self.gemini.extract_json_from_response(raw_response)
        except AIServiceException:
            logger.warning("lesson_generation_failed_using_fallback")
            lesson_data = self._get_fallback_lesson(
                path_id, unit_number, lesson_number, language
            )

        lesson = self._build_lesson(lesson_data, path_id, unit_number, lesson_number, language)

        logger.info(
            "lesson_generated",
            path=path_id,
            unit=unit_number,
            lesson=lesson_number,
            exercise_count=len(lesson.get("exercises", [])),
        )

        return lesson

    async def generate_exercises(
        self,
        topic: str,
        exercise_type: str,
        count: int = 4,
        language: str = "fr",
        difficulty: int = 1,
    ) -> List[Dict[str, Any]]:
        """
        Generate exercises for a specific topic.

        Args:
            topic: Topic name or description
            exercise_type: Type of exercise
            count: Number of exercises to generate
            language: Language code
            difficulty: Difficulty level (1-5)

        Returns:
            List of exercises
        """
        if exercise_type not in EXERCISE_TYPES:
            raise ValidationException(f"Invalid exercise type: {exercise_type}")

        prompt = get_exercise_generation_prompt(
            topic=topic,
            exercise_type=exercise_type,
            count=count,
            language=language,
            difficulty=difficulty,
        )

        try:
            raw_response = await self.gemini.generate_text(prompt=prompt)
            exercises_data = self.gemini.extract_json_from_response(raw_response)
        except AIServiceException:
            logger.warning("exercise_generation_failed_using_fallback")
            exercises_data = self._get_fallback_exercises(
                topic, exercise_type, count, language
            )

        exercises = exercises_data.get("exercises", [])
        return self._normalize_exercises(exercises, exercise_type)

    async def generate_unit_test(
        self,
        path_id: str,
        unit_number: int,
        language: str = "fr",
        question_count: int = 10,
    ) -> Dict[str, Any]:
        """
        Generate a validation test for completing a unit.

        Args:
            path_id: Learning path identifier
            unit_number: Unit number
            language: Language code
            question_count: Number of questions

        Returns:
            Test with questions and passing criteria
        """
        logger.info(
            "generating_unit_test",
            path=path_id,
            unit=unit_number,
            language=language,
        )

        prompt = get_unit_test_prompt(
            path_id=path_id,
            unit_number=unit_number,
            language=language,
            question_count=question_count,
        )

        try:
            raw_response = await self.gemini.generate_text(prompt=prompt)
            test_data = self.gemini.extract_json_from_response(raw_response)
        except AIServiceException:
            logger.warning("unit_test_generation_failed_using_fallback")
            test_data = self._get_fallback_unit_test(path_id, unit_number, language)

        test = {
            "id": str(uuid.uuid4()),
            "path_id": path_id,
            "unit_number": unit_number,
            "title": test_data.get("unit_name", f"Unit {unit_number} Test"),
            "passing_score": test_data.get("passing_score", 70),
            "questions": test_data.get("questions", []),
            "total_questions": len(test_data.get("questions", [])),
            "language": language,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        return test

    def get_exercise_types(self, language: str = "fr") -> List[Dict[str, str]]:
        """
        Return available exercise types with translated names.

        Args:
            language: Language code

        Returns:
            List of exercise type definitions
        """
        names = EXERCISE_TYPE_NAMES.get(language, EXERCISE_TYPE_NAMES["fr"])
        return [
            {"id": ex_type, "name": names.get(ex_type, ex_type), "icon": self._get_exercise_icon(ex_type)}
            for ex_type in EXERCISE_TYPES
        ]

    def evaluate_exercise(
        self,
        exercise: Dict[str, Any],
        user_answer: Any,
    ) -> Dict[str, Any]:
        """
        Evaluate a user's answer to an exercise.

        Args:
            exercise: The exercise definition
            user_answer: The user's submitted answer

        Returns:
            Evaluation result with correctness and feedback
        """
        exercise_type = exercise.get("exercise_type", "multiple_choice")
        correct_answer = exercise.get("correct_answer")

        is_correct = False

        if exercise_type == "multiple_choice":
            is_correct = str(user_answer) == str(correct_answer)

        elif exercise_type == "true_false":
            is_correct = str(user_answer).lower() == str(correct_answer).lower()

        elif exercise_type == "fill_blank":
            user_clean = str(user_answer).strip().lower()
            correct_clean = str(correct_answer).strip().lower()
            is_correct = user_clean == correct_clean

        elif exercise_type == "matching":
            if isinstance(user_answer, dict) and isinstance(correct_answer, dict):
                is_correct = user_answer == correct_answer

        elif exercise_type == "open_question":
            user_clean = str(user_answer).strip().lower()
            correct_keywords = exercise.get("keywords", [])
            keyword_matches = sum(1 for kw in correct_keywords if kw.lower() in user_clean)
            is_correct = keyword_matches >= len(correct_keywords) * 0.5

        elif exercise_type == "image_identification":
            is_correct = str(user_answer).strip().lower() == str(correct_answer).strip().lower()

        return {
            "is_correct": is_correct,
            "correct_answer": correct_answer,
            "explanation": exercise.get("explanation", ""),
            "points_earned": exercise.get("points", 5) if is_correct else 0,
        }

    def calculate_adaptive_difficulty(
        self,
        child_id: str,
        path_id: str,
        current_level: int,
    ) -> int:
        """
        Calculate adaptive difficulty based on child's performance history.

        Args:
            child_id: Child identifier
            path_id: Learning path identifier
            current_level: Current difficulty level

        Returns:
            Adjusted difficulty level (1-5)
        """
        try:
            progress = self.memory.load_progress(f"learning:{child_id}:{path_id}")
            recent_scores = progress.get("recent_scores", [])

            if not recent_scores:
                return current_level

            average_score = sum(recent_scores) / len(recent_scores)

            if average_score >= 90 and current_level < 5:
                return current_level + 1
            elif average_score < 50 and current_level > 1:
                return current_level - 1
            else:
                return current_level

        except Exception:
            return current_level

    # ─────────────────────────────────────────────────────────────────────
    # Private Helpers
    # ─────────────────────────────────────────────────────────────────────

    def _build_lesson(
        self,
        data: Dict[str, Any],
        path_id: str,
        unit_number: int,
        lesson_number: int,
        language: str,
    ) -> Dict[str, Any]:
        """Build a complete lesson structure from AI response data."""
        return {
            "id": str(uuid.uuid4()),
            "path_id": path_id,
            "unit_number": unit_number,
            "lesson_number": lesson_number,
            "title": data.get("title", "Lesson"),
            "content": data.get("content", ""),
            "summary": data.get("summary", ""),
            "key_points": data.get("key_points", []),
            "vocabulary": data.get("vocabulary", []),
            "exercises": self._normalize_exercises(
                data.get("exercises", []),
                data.get("exercise_type", "multiple_choice"),
            ),
            "fun_fact": data.get("fun_fact", ""),
            "practical_tip": data.get("practical_tip", ""),
            "emoji": data.get("emoji", "📚"),
            "estimated_minutes": data.get("estimated_minutes", 5),
            "language": language,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _normalize_exercises(
        self,
        exercises: List[Dict[str, Any]],
        exercise_type: str,
    ) -> List[Dict[str, Any]]:
        """Normalize exercise data to consistent format."""
        normalized = []
        for i, ex in enumerate(exercises):
            normalized.append({
                "id": f"ex_{uuid.uuid4().hex[:8]}",
                "exercise_type": ex.get("exercise_type", exercise_type),
                "question": ex.get("question", f"Question {i + 1}"),
                "options": ex.get("options", []),
                "correct_answer": ex.get("correct_answer", ex.get("correct", 0)),
                "explanation": ex.get("explanation", ""),
                "points": ex.get("points", 5),
                "order_index": i,
            })
        return normalized

    def _get_exercise_icon(self, exercise_type: str) -> str:
        """Return emoji icon for exercise type."""
        icons = {
            "fill_blank": "✍️",
            "matching": "🔗",
            "multiple_choice": "📝",
            "true_false": "✅",
            "open_question": "💬",
            "image_identification": "📸",
        }
        return icons.get(exercise_type, "📚")

    def _get_fallback_lesson(
        self,
        path_id: str,
        unit_number: int,
        lesson_number: int,
        language: str,
    ) -> Dict[str, Any]:
        """Fallback lesson when AI generation fails."""
        fallbacks = {
            "fr": {
                "title": f"Leçon {lesson_number} - Unité {unit_number}",
                "content": "Contenu de la leçon en cours de préparation. Reviens bientôt !",
                "summary": "Résumé à venir",
                "key_points": ["Point clé 1", "Point clé 2", "Point clé 3"],
                "vocabulary": [],
                "fun_fact": "La nature est pleine de surprises !",
                "practical_tip": "Observe la nature autour de toi chaque jour.",
            },
            "en": {
                "title": f"Lesson {lesson_number} - Unit {unit_number}",
                "content": "Lesson content being prepared. Come back soon!",
                "summary": "Summary coming soon",
                "key_points": ["Key point 1", "Key point 2", "Key point 3"],
                "vocabulary": [],
                "fun_fact": "Nature is full of surprises!",
                "practical_tip": "Observe nature around you every day.",
            },
            "ln": {
                "title": f"Leçon {lesson_number} - Unité {unit_number}",
                "content": "Contenu ya leçon ezali ko preparer. Zonga kala te!",
                "summary": "Résumé eko ya",
                "key_points": ["Point clé 1", "Point clé 2", "Point clé 3"],
                "vocabulary": [],
                "fun_fact": "Nature etondi na ba surprises!",
                "practical_tip": "Tala nature pembeni na yo mokolo na mokolo.",
            },
            "sw": {
                "title": f"Somo {lesson_number} - Kitengo {unit_number}",
                "content": "Maudhui ya somo yanatayarishwa. Rudi hivi karibuni!",
                "summary": "Muhtasari unakuja hivi karibuni",
                "key_points": ["Jambo muhimu 1", "Jambo muhimu 2", "Jambo muhimu 3"],
                "vocabulary": [],
                "fun_fact": "Asili imejaa mshangao!",
                "practical_tip": "Tazama asili karibu nawe kila siku.",
            },
        }

        base = fallbacks.get(language, fallbacks["fr"])
        base["exercises"] = self._get_fallback_exercises(
            f"{path_id} unit {unit_number}",
            "multiple_choice",
            3,
            language,
        )
        base["emoji"] = "📚"
        base["estimated_minutes"] = 5
        return base

    def _get_fallback_exercises(
        self,
        topic: str,
        exercise_type: str,
        count: int,
        language: str,
    ) -> Dict[str, Any]:
        """Fallback exercises when AI generation fails."""
        fallback_questions = {
            "fr": [
                {
                    "question": "Quel est le plus grand arbre d'Afrique ?",
                    "options": ["Le Baobab", "Le Chêne", "Le Sapin", "Le Palmier"],
                    "correct": 0,
                    "explanation": "Le Baobab peut vivre plus de 2000 ans !",
                },
                {
                    "question": "Combien de litres d'eau un Baobab peut-il stocker ?",
                    "options": ["120 000 litres", "1 000 litres", "10 000 litres", "500 litres"],
                    "correct": 0,
                    "explanation": "Le Baobab stocke jusqu'à 120 000 litres d'eau dans son tronc.",
                },
                {
                    "question": "Pourquoi le Baobab est-il appelé 'arbre de vie' ?",
                    "options": [
                        "Il nourrit et abrite des animaux",
                        "Il ne meurt jamais",
                        "Il parle aux humains",
                        "Il produit de l'or",
                    ],
                    "correct": 0,
                    "explanation": "Le Baobab nourrit et abrite des dizaines d'espèces animales.",
                },
            ],
            "en": [
                {
                    "question": "What is the largest tree in Africa?",
                    "options": ["The Baobab", "The Oak", "The Pine", "The Palm"],
                    "correct": 0,
                    "explanation": "The Baobab can live over 2000 years!",
                },
                {
                    "question": "How many liters of water can a Baobab store?",
                    "options": ["120,000 liters", "1,000 liters", "10,000 liters", "500 liters"],
                    "correct": 0,
                    "explanation": "The Baobab stores up to 120,000 liters of water in its trunk.",
                },
                {
                    "question": "Why is the Baobab called the 'tree of life'?",
                    "options": [
                        "It feeds and shelters animals",
                        "It never dies",
                        "It talks to humans",
                        "It produces gold",
                    ],
                    "correct": 0,
                    "explanation": "The Baobab feeds and shelters dozens of animal species.",
                },
            ],
        }

        questions = fallback_questions.get(language, fallback_questions["fr"])
        questions = questions[:count]

        return {
            "exercises": [
                {
                    "exercise_type": exercise_type,
                    "question": q["question"],
                    "options": q.get("options", []),
                    "correct_answer": q["correct"],
                    "explanation": q["explanation"],
                    "points": 5,
                }
                for q in questions
            ]
        }

    def _get_fallback_unit_test(
        self,
        path_id: str,
        unit_number: int,
        language: str,
    ) -> Dict[str, Any]:
        """Fallback unit test when AI generation fails."""
        return {
            "unit_name": f"Unit {unit_number} - {path_id}",
            "passing_score": 70,
            "questions": self._get_fallback_exercises(
                f"{path_id} unit {unit_number}",
                "multiple_choice",
                10,
                language,
            ).get("exercises", []),
        }