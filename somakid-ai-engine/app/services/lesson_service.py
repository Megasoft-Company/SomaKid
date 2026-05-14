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

EXERCISE_TYPES = ["fill_blank", "matching", "multiple_choice", "true_false", "open_question", "image_identification"]

EXERCISE_TYPE_NAMES = {
    "fr": {"fill_blank": "Texte à trous", "matching": "Association", "multiple_choice": "QCM", "true_false": "Vrai ou Faux", "open_question": "Question ouverte", "image_identification": "Identification d'image"},
    "en": {"fill_blank": "Fill in the blank", "matching": "Matching", "multiple_choice": "Multiple Choice", "true_false": "True or False", "open_question": "Open Question", "image_identification": "Image Identification"},
    "ln": {"fill_blank": "Kokomisa esika ya pamba", "matching": "Kosangisa", "multiple_choice": "QCM", "true_false": "Vrai to Faux", "open_question": "Motuna ya polele", "image_identification": "Koyeba elilingi"},
    "sw": {"fill_blank": "Jaza nafasi", "matching": "Kulinganisha", "multiple_choice": "Chaguo nyingi", "true_false": "Kweli au Uongo", "open_question": "Swali wazi", "image_identification": "Kutambua picha"},
}


class LessonService:

    def __init__(self, gemini_client: GeminiClient, memory_repo: MemoryRepository):
        self.gemini = gemini_client
        self.memory = memory_repo
        logger.info("lesson_service_initialized")

    async def generate_lesson(self, path_id: str, unit_number: int, lesson_number: int, language: str = "fr", child_age: int = 8, child_level: int = 1) -> Dict[str, Any]:
        logger.info("generating_lesson", path=path_id, unit=unit_number, lesson=lesson_number, language=language)
        prompt = get_lesson_generation_prompt(path_id=path_id, unit_number=unit_number, lesson_number=lesson_number, language=language, child_age=child_age, child_level=child_level)
        try:
            raw_response = await self.gemini.generate_text(prompt=prompt)
            lesson_data = self.gemini.extract_json_from_response(raw_response)
        except AIServiceException:
            logger.warning("lesson_generation_failed_using_fallback")
            lesson_data = self._get_fallback_lesson(path_id, unit_number, lesson_number, language)
        lesson = self._build_lesson(lesson_data, path_id, unit_number, lesson_number, language)
        logger.info("lesson_generated", path=path_id, unit=unit_number, lesson=lesson_number, exercise_count=len(lesson.get("exercises", [])))
        return lesson

    async def generate_exercises(self, topic: str, exercise_type: str, count: int = 4, language: str = "fr", difficulty: int = 1) -> List[Dict[str, Any]]:
        if exercise_type not in EXERCISE_TYPES:
            raise ValidationException(f"Invalid exercise type: {exercise_type}")
        prompt = get_exercise_generation_prompt(topic=topic, exercise_type=exercise_type, count=count, language=language, difficulty=difficulty)
        try:
            raw_response = await self.gemini.generate_text(prompt=prompt)
            exercises_data = self.gemini.extract_json_from_response(raw_response)
        except AIServiceException:
            logger.warning("exercise_generation_failed_using_fallback")
            exercises_data = self._get_fallback_exercises(topic, exercise_type, count, language)
        exercises = exercises_data.get("exercises", [])
        return self._normalize_exercises(exercises, exercise_type)

    async def generate_unit_test(self, path_id: str, unit_number: int, language: str = "fr", question_count: int = 10) -> Dict[str, Any]:
        logger.info("generating_unit_test", path=path_id, unit=unit_number, language=language)
        prompt = get_unit_test_prompt(path_id=path_id, unit_number=unit_number, language=language, question_count=question_count)
        try:
            raw_response = await self.gemini.generate_text(prompt=prompt)
            test_data = self.gemini.extract_json_from_response(raw_response)
        except AIServiceException:
            logger.warning("unit_test_generation_failed_using_fallback")
            test_data = self._get_fallback_unit_test(path_id, unit_number, language)
        return {"id": str(uuid.uuid4()), "path_id": path_id, "unit_number": unit_number, "title": test_data.get("unit_name", f"Unit {unit_number} Test"), "passing_score": test_data.get("passing_score", 70), "questions": test_data.get("questions", []), "total_questions": len(test_data.get("questions", [])), "language": language, "generated_at": datetime.now(timezone.utc).isoformat()}

    def get_exercise_types(self, language: str = "fr") -> List[Dict[str, str]]:
        names = EXERCISE_TYPE_NAMES.get(language, EXERCISE_TYPE_NAMES["fr"])
        return [{"id": ex_type, "name": names.get(ex_type, ex_type), "icon": self._get_exercise_icon(ex_type)} for ex_type in EXERCISE_TYPES]

    def evaluate_exercise(self, exercise: Dict[str, Any], user_answer: Any) -> Dict[str, Any]:
        exercise_type = exercise.get("exercise_type", "multiple_choice")
        correct_answer = exercise.get("correct_answer")
        options = exercise.get("options", [])
        explanation = exercise.get("explanation", "")
        is_correct = False

        if exercise_type == "multiple_choice":
            is_correct = str(user_answer) == str(correct_answer)
        elif exercise_type == "true_false":
            if isinstance(correct_answer, int) or str(correct_answer).isdigit():
                is_correct = str(user_answer) == str(correct_answer)
            else:
                idx = int(user_answer) if str(user_answer).isdigit() else -1
                if idx == 0:
                    is_correct = str(correct_answer).lower() in ("vrai", "true")
                elif idx == 1:
                    is_correct = str(correct_answer).lower() in ("faux", "false")
        elif exercise_type == "fill_blank":
            is_correct = str(user_answer).strip().lower() == str(correct_answer).strip().lower()
        elif exercise_type == "matching":
            if isinstance(user_answer, dict) and isinstance(correct_answer, dict):
                is_correct = user_answer == correct_answer
        elif exercise_type == "open_question":
            user_clean = str(user_answer).strip().lower()
            correct_keywords = exercise.get("keywords", [])
            keyword_matches = sum(1 for kw in correct_keywords if kw.lower() in user_clean)
            is_correct = keyword_matches >= len(correct_keywords) * 0.5 if correct_keywords else len(user_clean) > 10
        elif exercise_type == "image_identification":
            is_correct = str(user_answer).strip().lower() == str(correct_answer).strip().lower()

        if isinstance(correct_answer, int):
            correct_answer_index = correct_answer
        elif str(correct_answer).lower() in ("vrai", "true"):
            correct_answer_index = 0
        elif str(correct_answer).lower() in ("faux", "false"):
            correct_answer_index = 1
        else:
            correct_answer_index = None

        if exercise_type == "multiple_choice" and isinstance(correct_answer, int) and options:
            labels = ["A", "B", "C", "D"]
            if correct_answer < len(labels) and correct_answer < len(options):
                correct_answer_display = f"{labels[correct_answer]}. {options[correct_answer]}"
            elif correct_answer < len(options):
                correct_answer_display = str(options[correct_answer])
            else:
                correct_answer_display = str(correct_answer)
        elif exercise_type == "true_false":
            correct_answer_display = str(correct_answer)
        elif exercise_type in ("fill_blank", "open_question", "image_identification"):
            correct_answer_display = str(correct_answer) if correct_answer is not None else ""
        else:
            correct_answer_display = str(correct_answer) if correct_answer is not None else ""

        return {
            "is_correct": is_correct,
            "correct_answer": correct_answer_display,
            "correct_answer_index": correct_answer_index,
            "explanation": explanation,
            "points_earned": exercise.get("points", 5) if is_correct else 0,
        }

    def calculate_adaptive_difficulty(self, child_id: str, path_id: str, current_level: int) -> int:
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
            return current_level
        except Exception:
            return current_level

    def _build_lesson(self, data: Dict[str, Any], path_id: str, unit_number: int, lesson_number: int, language: str) -> Dict[str, Any]:
        return {"id": str(uuid.uuid4()), "path_id": path_id, "unit_number": unit_number, "lesson_number": lesson_number, "title": data.get("title", "Lesson"), "content": data.get("content", ""), "summary": data.get("summary", ""), "key_points": data.get("key_points", []), "vocabulary": data.get("vocabulary", []), "exercises": self._normalize_exercises(data.get("exercises", []), data.get("exercise_type", "multiple_choice")), "fun_fact": data.get("fun_fact", ""), "practical_tip": data.get("practical_tip", ""), "emoji": data.get("emoji", "📚"), "estimated_minutes": data.get("estimated_minutes", 5), "language": language, "generated_at": datetime.now(timezone.utc).isoformat()}

    def _normalize_exercises(self, exercises: List[Dict[str, Any]], exercise_type: str) -> List[Dict[str, Any]]:
        normalized = []
        for i, ex in enumerate(exercises):
            normalized.append({"id": f"ex_{uuid.uuid4().hex[:8]}", "exercise_type": ex.get("exercise_type", exercise_type), "question": ex.get("question", f"Question {i + 1}"), "options": ex.get("options", []), "correct_answer": ex.get("correct_answer", ex.get("correct", 0)), "explanation": ex.get("explanation", ""), "points": ex.get("points", 5), "order_index": i})
        return normalized

    def _get_exercise_icon(self, exercise_type: str) -> str:
        icons = {"fill_blank": "✍️", "matching": "🔗", "multiple_choice": "📝", "true_false": "✅", "open_question": "💬", "image_identification": "📸"}
        return icons.get(exercise_type, "📚")

    def _get_fallback_lesson(self, path_id: str, unit_number: int, lesson_number: int, language: str) -> Dict[str, Any]:
        fallbacks = {
            "fr": {"title": f"Leçon {lesson_number} - Unité {unit_number}", "content": "Contenu de la leçon en cours de préparation.", "summary": "Résumé à venir", "key_points": ["Point clé 1", "Point clé 2", "Point clé 3"], "vocabulary": [], "fun_fact": "La nature est pleine de surprises !", "practical_tip": "Observe la nature autour de toi.", "emoji": "📚", "estimated_minutes": 5},
            "en": {"title": f"Lesson {lesson_number} - Unit {unit_number}", "content": "Lesson content being prepared.", "summary": "Summary coming soon", "key_points": ["Key point 1", "Key point 2", "Key point 3"], "vocabulary": [], "fun_fact": "Nature is full of surprises!", "practical_tip": "Observe nature around you.", "emoji": "📚", "estimated_minutes": 5},
        }
        base = fallbacks.get(language, fallbacks["fr"])
        base["exercises"] = self._get_fallback_exercises(f"{path_id} unit {unit_number}", "multiple_choice", 3, language).get("exercises", [])
        return base

    def _get_fallback_exercises(self, topic: str, exercise_type: str, count: int, language: str) -> Dict[str, Any]:
        fallback_pools = {
            "fr": [
                {"question": "Quel est le plus grand arbre d'Afrique ?", "options": ["Le Baobab", "Le Chêne", "Le Sapin", "Le Palmier"], "correct": 0, "explanation": "Le Baobab peut vivre plus de 2000 ans !"},
                {"question": "Quel animal africain a une trompe ?", "options": ["L'Éléphant", "Le Lion", "La Girafe", "Le Zèbre"], "correct": 0, "explanation": "L'éléphant utilise sa trompe pour boire, manger et se doucher."},
                {"question": "Quel arbre produit des dattes ?", "options": ["Le Palmier dattier", "Le Baobab", "L'Acacia", "Le Manguier"], "correct": 0, "explanation": "Le palmier dattier pousse dans les oasis du désert."},
                {"question": "Quel animal est le roi de la savane ?", "options": ["Le Lion", "L'Éléphant", "Le Guépard", "Le Crocodile"], "correct": 0, "explanation": "Le lion est appelé le roi des animaux en Afrique."},
                {"question": "Que mange une girafe ?", "options": ["Des feuilles d'acacia", "De la viande", "Des insectes", "Du poisson"], "correct": 0, "explanation": "La girafe utilise son long cou pour atteindre les feuilles en hauteur."},
            ],
            "en": [
                {"question": "What is the largest tree in Africa?", "options": ["The Baobab", "The Oak", "The Pine", "The Palm"], "correct": 0, "explanation": "The Baobab can live over 2000 years!"},
                {"question": "Which African animal has a trunk?", "options": ["The Elephant", "The Lion", "The Giraffe", "The Zebra"], "correct": 0, "explanation": "The elephant uses its trunk to drink, eat, and shower."},
                {"question": "Which tree produces dates?", "options": ["The Date Palm", "The Baobab", "The Acacia", "The Mango tree"], "correct": 0, "explanation": "The date palm grows in desert oases."},
                {"question": "Which animal is the king of the savanna?", "options": ["The Lion", "The Elephant", "The Cheetah", "The Crocodile"], "correct": 0, "explanation": "The lion is called the king of animals in Africa."},
                {"question": "What does a giraffe eat?", "options": ["Acacia leaves", "Meat", "Insects", "Fish"], "correct": 0, "explanation": "The giraffe uses its long neck to reach high leaves."},
            ],
        }
        pool = fallback_pools.get(language, fallback_pools["fr"])
        selected = random.sample(pool, min(count, len(pool)))
        return {"exercises": [{"exercise_type": exercise_type, "question": q["question"], "options": q.get("options", []), "correct_answer": q["correct"], "explanation": q["explanation"], "points": 5} for q in selected]}

    def _get_fallback_unit_test(self, path_id: str, unit_number: int, language: str) -> Dict[str, Any]:
        return {"unit_name": f"Unit {unit_number} - {path_id}", "passing_score": 70, "questions": self._get_fallback_exercises(f"{path_id} unit {unit_number}", "multiple_choice", 10, language).get("exercises", [])}