from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid

from ..core.config import settings
from ..core.exceptions import ValidationException, AIServiceException
from ..core.logging_config import get_logger
from ..utils.learning_prompts import get_lesson_generation_prompt, get_exercise_generation_prompt
from ..utils.health_prompts import (
    HEALTH_CATEGORY_ORDER,
    HEALTH_CATEGORY_META,
    get_health_path_context,
    get_health_lesson_generation_prompt,
)
from .gemini_client import GeminiClient
from .health_progress import add_lesson_completed as _add_health_lesson_completed
from ..repositories.memory_repository import MemoryRepository

logger = get_logger(__name__)


class LearningService:

    def __init__(self, gemini_client: GeminiClient, memory_repo: MemoryRepository):
        self.gemini = gemini_client
        self.memory = memory_repo
        logger.info("learning_service_initialized")

    def _resolve_domain(self, path_id: str, domain: Optional[str] = None) -> str:
        if domain:
            return domain
        return "health" if path_id in HEALTH_CATEGORY_META else "environment"

    def get_learning_paths(self, language: str = "fr", domain: str = "environment") -> List[Dict[str, Any]]:
        if domain == "health":
            paths = []
            for index, slug in enumerate(HEALTH_CATEGORY_ORDER):
                meta = HEALTH_CATEGORY_META[slug]
                ctx = get_health_path_context(slug, language)
                paths.append({
                    "id": slug, "slug": slug,
                    "name": ctx["name"], "description": ctx["description"],
                    "emoji": meta["emoji"], "color": meta["color"],
                    "total_units": 3, "progress": 0, "order_index": index,
                })
            return paths

        paths = [
            {"id": "biodiversity", "slug": "biodiversity", "name": self._t("Biodiversité", "Biodiversity", "Biodiversite", "Bioanuwai", language), "description": self._t("Découvre la richesse de la faune et la flore africaine", "Discover the richness of African wildlife and flora", "Découvrir richesse ya bikelamu mpe banzete ya Afrique", "Gundua utajiri wa wanyama na mimea ya Afrika", language), "emoji": "🌿", "color": "#2D9B6E", "total_units": 5, "progress": 0, "order_index": 0},
            {"id": "climate", "slug": "climate", "name": self._t("Climat", "Climate", "Climat", "Hali ya Hewa", language), "description": self._t("Comprends le changement climatique et ses impacts", "Understand climate change and its impacts", "Comprendre changement climatique mpe ba impacts na yango", "Elewa mabadiliko ya hali ya hewa na athari zake", language), "emoji": "🌍", "color": "#1B6CA8", "total_units": 5, "progress": 0, "order_index": 1},
            {"id": "disasters", "slug": "disasters", "name": self._t("Catastrophes Naturelles", "Natural Disasters", "Ba Likama ya Mbula", "Majanga ya Asili", language), "description": self._t("Apprends à reconnaître et te protéger des catastrophes", "Learn to recognize and protect yourself from disasters", "Yekola koyeba mpe komibatela na ba likama", "Jifunze kutambua na kujikinga dhidi ya majanga", language), "emoji": "⛈️", "color": "#C0392B", "total_units": 5, "progress": 0, "order_index": 2},
            {"id": "behaviors", "slug": "behaviors", "name": self._t("Éco-Gestes", "Eco-Behaviors", "Bizaleli ya Malamu", "Tabia za Kiikolojia", language), "description": self._t("Adopte les bons gestes pour protéger la planète", "Adopt the right actions to protect the planet", "Zwa bizaleli ya malamu po na kobatela planete", "Chukua hatua nzuri kulinda sayari", language), "emoji": "♻️", "color": "#8B5CF6", "total_units": 5, "progress": 0, "order_index": 3},
        ]
        return paths

    def get_path_detail(self, path_id: str, language: str = "fr", domain: Optional[str] = None) -> Optional[Dict[str, Any]]:
        resolved_domain = self._resolve_domain(path_id, domain)
        paths = self.get_learning_paths(language, domain=resolved_domain)
        for path in paths:
            if path["slug"] == path_id or path["id"] == path_id:
                return path
        return None

    def get_child_path_progress(self, child_id: str, path_id: str) -> Dict[str, Any]:
        try:
            progress = self.memory.load_progress(f"learning:{child_id}:{path_id}")
            return {"total_lessons_completed": progress.get("lessons_completed", 0), "total_units_completed": progress.get("units_completed", 0), "total_tests_passed": progress.get("tests_passed", 0), "total_points_earned": progress.get("points", 0), "streak_days": progress.get("streak", 0), "overall_progress": progress.get("overall_progress", 0)}
        except Exception:
            return {"total_lessons_completed": 0, "total_units_completed": 0, "total_tests_passed": 0, "total_points_earned": 0, "streak_days": 0, "overall_progress": 0}

    def get_units_for_path(self, path_id: str, language: str = "fr", domain: Optional[str] = None) -> List[Dict[str, Any]]:
        resolved_domain = self._resolve_domain(path_id, domain)
        if resolved_domain == "health":
            ctx = get_health_path_context(path_id, language)
            units_names = ctx.get("units", {})
            return [
                {
                    "unit_number": n,
                    "name": units_names.get(n, f"Unite {n}"),
                    "description": ctx["description"],
                    "total_lessons": 4, "required_score": 70,
                    "is_locked": n != 1, "is_completed": False,
                    "test_passed": False, "lessons_completed": 0,
                }
                for n in sorted(units_names.keys()) or [1, 2, 3]
            ]

        all_units = {
            "biodiversity": [{"unit_number": 1, "name": self._t("Introduction à la Biodiversité", "Introduction to Biodiversity", "Introduction na Biodiversite", "Utangulizi wa Bioanuwai", language), "description": self._t("Les bases de la biodiversité", "Biodiversity basics", "Ba bases ya biodiversite", "Misingi ya bioanuwai", language), "total_lessons": 4, "required_score": 70, "is_locked": False, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 2, "name": self._t("Les Animaux d'Afrique", "African Animals", "Banyama ya Afrique", "Wanyama wa Afrika", language), "description": self._t("Découvre les animaux", "Discover animals", "Découvrir banyama", "Gundua wanyama", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 3, "name": self._t("Les Plantes et Arbres", "Plants and Trees", "Banzete mpe Matiti", "Mimea na Miti", language), "description": self._t("Le monde végétal", "The plant world", "Mokili ya banzete", "Ulimwengu wa mimea", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 4, "name": self._t("Les Insectes", "Insects", "Ba Insectes", "Wadudu", language), "description": self._t("Le monde des insectes", "The insect world", "Mokili ya ba insectes", "Ulimwengu wa wadudu", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 5, "name": self._t("Écosystèmes", "Ecosystems", "Ba Ecosystemes", "Mifumo ya Ikolojia", language), "description": self._t("Tout est connecté", "Everything is connected", "Nionso ezali connecté", "Kila kitu kimeunganishwa", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}],
            "climate": [{"unit_number": 1, "name": self._t("Le Climat, c'est quoi ?", "What is Climate?", "Climat ezali nini ?", "Hali ya Hewa ni nini ?", language), "description": self._t("Comprendre le climat", "Understanding climate", "Comprendre climat", "Kuelewa hali ya hewa", language), "total_lessons": 4, "required_score": 70, "is_locked": False, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 2, "name": self._t("Le Réchauffement", "Global Warming", "Kozala na Moto", "Joto la Dunia", language), "description": self._t("Pourquoi la Terre chauffe", "Why the Earth warms", "Mpo na nini Mabele ezali kozala na moto", "Kwa nini Dunia inapata joto", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 3, "name": self._t("Les Conséquences", "The Consequences", "Ba Conséquences", "Athari", language), "description": self._t("Les impacts du changement", "The impacts of change", "Ba impacts ya changement", "Athari za mabadiliko", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 4, "name": self._t("Les Solutions", "Solutions", "Ba Solutions", "Ufumbuzi", language), "description": self._t("Ce qu'on peut faire", "What we can do", "Ce qu'on peut faire", "Tunachoweza kufanya", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 5, "name": self._t("Agir Ensemble", "Act Together", "Kosala Elongo", "Tenda Pamoja", language), "description": self._t("Ensemble pour la planète", "Together for the planet", "Elongo po na planete", "Pamoja kwa sayari", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}],
            "disasters": [{"unit_number": 1, "name": self._t("Les Types de Catastrophes", "Types of Disasters", "Ba Types ya Likama", "Aina za Majanga", language), "description": self._t("Connaître les catastrophes", "Know the disasters", "Koyeba ba likama", "Kujua majanga", language), "total_lessons": 4, "required_score": 70, "is_locked": False, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 2, "name": self._t("Les Inondations", "Floods", "Ba Inondations", "Mafuriko", language), "description": self._t("Comprendre les inondations", "Understanding floods", "Comprendre ba inondations", "Kuelewa mafuriko", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 3, "name": self._t("Les Sécheresses", "Droughts", "Ba Sécheresses", "Ukame", language), "description": self._t("Quand l'eau manque", "When water is scarce", "Quand l'eau manque", "Maji yanapokosekana", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 4, "name": self._t("Les Tempêtes", "Storms", "Ba Tempêtes", "Dhoruba", language), "description": self._t("Vents et pluies violents", "Violent winds and rains", "Vents et pluies violents", "Upepo na mvua kali", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 5, "name": self._t("Prévention et Protection", "Prevention and Protection", "Prévention mpe Protection", "Kinga na Ulinzi", language), "description": self._t("Se préparer et se protéger", "Prepare and protect yourself", "Se préparer et se protéger", "Kujitayarisha na kujikinga", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}],
            "behaviors": [{"unit_number": 1, "name": self._t("Économiser l'Eau", "Saving Water", "Kobatela Mai", "Kuokoa Maji", language), "description": self._t("L'eau est précieuse", "Water is precious", "Mai ezali précieux", "Maji ni ya thamani", language), "total_lessons": 4, "required_score": 70, "is_locked": False, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 2, "name": self._t("Réduire les Déchets", "Reducing Waste", "Kokitisa Ba Déchets", "Kupunguza Taka", language), "description": self._t("Moins de déchets", "Less waste", "Moins de déchets", "Taka chache", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 3, "name": self._t("Protéger la Nature", "Protecting Nature", "Kobatela Nature", "Kulinda Asili", language), "description": self._t("Agir pour la nature", "Act for nature", "Agir pour la nature", "Tenda kwa asili", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 4, "name": self._t("Économiser l'Énergie", "Saving Energy", "Kobatela Énergie", "Kuokoa Nishati", language), "description": self._t("Utiliser moins d'énergie", "Use less energy", "Utiliser moins d'énergie", "Tumia nishati kidogo", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}, {"unit_number": 5, "name": self._t("Devenir un Éco-Ambassadeur", "Becoming an Eco-Ambassador", "Kokoma Eco-Ambassadeur", "Kuwa Balozi wa Mazingira", language), "description": self._t("Inspire les autres", "Inspire others", "Inspire les autres", "Watie moyo wengine", language), "total_lessons": 4, "required_score": 70, "is_locked": True, "is_completed": False, "test_passed": False, "lessons_completed": 0}],
        }
        return all_units.get(path_id, [])

    def get_unit_detail(self, path_id: str, unit_number: int, language: str = "fr", child_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        units = self.get_units_for_path(path_id, language)
        for unit in units:
            if unit["unit_number"] == unit_number:
                unit["lessons"] = self._get_lessons_with_progress(unit_number, language, child_id, path_id)
                if child_id:
                    unit_progress = self._load_unit_progress(child_id, path_id, unit_number)
                    lessons_completed = unit_progress.get("lessons_completed", 0)
                    unit["lessons_completed"] = lessons_completed
                    unit["is_completed"] = self.check_unit_completion(child_id, path_id, unit_number)
                    unit["test_passed"] = self.check_test_passed(child_id, path_id, unit_number)
                return unit
        return None

    def get_child_unit_progress(self, child_id: str, path_id: str, unit_number: int) -> Dict[str, Any]:
        try:
            progress = self._load_unit_progress(child_id, path_id, unit_number)
            return {"lessons_completed": progress.get("lessons_completed", 0), "total_lessons": progress.get("total_lessons", 4), "test_passed": progress.get("test_passed", False), "best_score": progress.get("best_score", 0)}
        except Exception:
            return {"lessons_completed": 0, "total_lessons": 4, "test_passed": False, "best_score": 0}

    def get_all_progress(self, child_id: str, domain: str = "environment") -> Dict[str, Any]:
        paths = HEALTH_CATEGORY_ORDER if domain == "health" else ["biodiversity", "climate", "disasters", "behaviors"]
        return {path: self.get_child_path_progress(child_id, path) for path in paths}

    def get_streak_info(self, child_id: str) -> Dict[str, Any]:
        try:
            streak = self.memory.load_progress(f"learning:{child_id}:streak")
            return {"current_streak": streak.get("current", 0), "longest_streak": streak.get("longest", 0), "last_activity": streak.get("last_activity")}
        except Exception:
            return {"current_streak": 0, "longest_streak": 0, "last_activity": None}

    def mark_lesson_completed(self, child_id: str, path_id: str, unit_id: str, lesson_id: str, score: int = 100, time_spent_seconds: int = 0) -> Dict[str, Any]:
        progress_key = f"learning:{child_id}:{path_id}"
        unit_progress_key = f"learning:{child_id}:{path_id}:unit:{unit_id}"

        try:
            progress = self.memory.load_progress(progress_key)
        except Exception:
            progress = {}
        try:
            unit_progress = self.memory.load_progress(unit_progress_key)
        except Exception:
            unit_progress = {}

        completed_lessons: List[str] = unit_progress.get("completed_lesson_ids", [])
        newly_completed = lesson_id not in completed_lessons
        if newly_completed:
            completed_lessons.append(lesson_id)
            unit_progress["completed_lesson_ids"] = completed_lessons
            unit_progress["lessons_completed"] = len(completed_lessons)
            progress["lessons_completed"] = progress.get("lessons_completed", 0) + 1
            if path_id in HEALTH_CATEGORY_META:
                try:
                    _add_health_lesson_completed(self.memory, child_id, score)
                except Exception:
                    logger.warning("health_progress_update_failed", child_id=child_id, path_id=path_id)

        unit_progress["best_score"] = max(unit_progress.get("best_score", 0), score)
        unit_progress["total_lessons"] = 4
        progress["points"] = progress.get("points", 0) + score
        progress["last_activity"] = datetime.now(timezone.utc).isoformat()

        self.memory.save_progress(progress_key, progress)
        self.memory.save_progress(unit_progress_key, unit_progress)

        lessons_completed_count = unit_progress["lessons_completed"]
        total_lessons = unit_progress["total_lessons"]
        all_done = lessons_completed_count >= total_lessons

        return {
            "lesson_completed": True,
            "score": score,
            "total_lessons_completed": progress["lessons_completed"],
            "unit_lessons_completed": lessons_completed_count,
            "all_lessons_completed": all_done,
        }

    def check_all_lessons_completed(self, child_id: str, path_id: str, unit_id: str) -> bool:
        try:
            unit_progress = self._load_unit_progress(child_id, path_id, unit_id)
            lessons_completed = unit_progress.get("lessons_completed", 0)
            total_lessons = unit_progress.get("total_lessons", 4)
            return lessons_completed >= total_lessons
        except Exception:
            return False

    def check_unit_completion(self, child_id: str, path_id: str, unit_number: int) -> bool:
        return self.check_all_lessons_completed(child_id, path_id, str(unit_number))

    def check_test_passed(self, child_id: str, path_id: str, unit_number: int) -> bool:
        try:
            progress = self._load_unit_progress(child_id, path_id, str(unit_number))
            return progress.get("test_passed", False)
        except Exception:
            return False

    def unlock_next_unit(self, child_id: str, path_id: str, current_unit: int) -> None:
        next_unit_key = f"learning:{child_id}:{path_id}:unit:{current_unit + 1}"
        try:
            progress = self.memory.load_progress(next_unit_key)
        except Exception:
            progress = {}
        progress["locked"] = False
        self.memory.save_progress(next_unit_key, progress)

    async def generate_lesson(self, path_id: str, unit_number: int, lesson_number: int, language: str = "fr") -> Dict[str, Any]:
        prompt = get_lesson_generation_prompt(path_id, unit_number, lesson_number, language)
        try:
            raw_response = await self.gemini.generate_text(prompt=prompt)
            return self.gemini.extract_json_from_response(raw_response)
        except AIServiceException:
            return self._get_fallback_lesson(path_id, unit_number, lesson_number, language)

    async def generate_unit_test(self, path_id: str, unit_number: int, language: str = "fr") -> Dict[str, Any]:
        unit_name = f"Unit {unit_number} of {path_id}"
        prompt = f"""You are SOMAKID, an expert African teacher. Generate a validation quiz in {language} for {unit_name}. Create 10 multiple-choice questions covering the key concepts of this unit. The passing score is 70%. RESPOND ONLY IN VALID JSON: {{"unit_name": "{unit_name}", "passing_score": 70, "questions": [{{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}}]}}"""
        try:
            raw_response = await self.gemini.generate_text(prompt=prompt)
            return self.gemini.extract_json_from_response(raw_response)
        except AIServiceException:
            return {"unit_name": unit_name, "passing_score": 70, "questions": []}

    def _t(self, fr: str, en: str, ln: str, sw: str, language: str) -> str:
        translations = {"fr": fr, "en": en, "ln": ln, "sw": sw}
        return translations.get(language, fr)

    def _load_unit_progress(self, child_id: str, path_id: str, unit_id) -> Dict[str, Any]:
        try:
            return self.memory.load_progress(f"learning:{child_id}:{path_id}:unit:{unit_id}")
        except Exception:
            return {}

    def _get_lessons_with_progress(self, unit_number: int, language: str, child_id: Optional[str], path_id: str) -> List[Dict[str, Any]]:
        default_lessons = self._get_default_lessons(unit_number, language)

        if not child_id:
            return default_lessons

        unit_progress = self._load_unit_progress(child_id, path_id, unit_number)
        completed_ids: List[str] = unit_progress.get("completed_lesson_ids", [])
        lessons_completed_count: int = unit_progress.get("lessons_completed", 0)

        result = []
        for i, lesson in enumerate(default_lessons):
            lesson_number = lesson["lesson_number"]
            lesson_key = f"lesson_{path_id}_{unit_number}_{lesson_number}"

            is_completed = (lesson_key in completed_ids) or (i < lessons_completed_count)

            if i == 0:
                is_locked = False
            else:
                prev_lesson_number = default_lessons[i - 1]["lesson_number"]
                prev_key = f"lesson_{path_id}_{unit_number}_{prev_lesson_number}"
                prev_completed = (prev_key in completed_ids) or ((i - 1) < lessons_completed_count)
                is_locked = not prev_completed

            lesson["is_completed"] = is_completed
            lesson["is_locked"] = is_locked
            lesson["id"] = lesson_key
            result.append(lesson)

        return result

    def _get_default_lessons(self, unit_number: int, language: str = "fr") -> List[Dict[str, Any]]:
        return [
            {"lesson_number": 1, "title": self._t("Découverte", "Discovery", "Découverte", "Ugunduzi", language), "lesson_type": "theory", "emoji": "📖", "duration_minutes": 5, "is_completed": False, "is_locked": False},
            {"lesson_number": 2, "title": self._t("Application", "Application", "Application", "Matumizi", language), "lesson_type": "practice", "emoji": "✍️", "duration_minutes": 8, "is_completed": False, "is_locked": True},
            {"lesson_number": 3, "title": self._t("Exploration", "Exploration", "Exploration", "Uchunguzi", language), "lesson_type": "theory", "emoji": "🔍", "duration_minutes": 6, "is_completed": False, "is_locked": True},
            {"lesson_number": 4, "title": self._t("Révision", "Review", "Révision", "Mapitio", language), "lesson_type": "review", "emoji": "🔄", "duration_minutes": 10, "is_completed": False, "is_locked": True},
        ]

    def _get_fallback_lesson(self, path_id: str, unit_number: int, lesson_number: int, language: str) -> Dict[str, Any]:
        return {"title": self._t("Leçon", "Lesson", "Leçon", "Somo", language), "content": self._t("Contenu de la leçon en cours de chargement...", "Lesson content loading...", "Contenu ya leçon ezali ko charger...", "Maudhui ya somo yanapakia...", language), "exercises": []}