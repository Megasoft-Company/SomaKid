"""
SOMAKID AI Engine - Vision Analysis Service
Orchestrates image analysis for species identification.
Uses Gemini Vision for reliable analysis.
"""

from typing import Optional, Dict, Any
from datetime import datetime, timezone
import base64
import io
import asyncio

from ..core.config import settings
from ..core.exceptions import ValidationException, AIServiceException, ImageProcessingException, UnsupportedLanguageException
from ..core.security import validate_child_age, validate_supported_language
from ..core.logging_config import get_logger, log_performance, log_error
from ..models.schemas import AnalyseImageResult
from ..utils.helpers import process_image_for_analysis
from ..utils.prompts import get_image_analysis_prompt, get_fallback_analysis_response
from ..repositories.memory_repository import MemoryRepository
from ..repositories.knowledge_repository import KnowledgeRepository

logger = get_logger(__name__)


class VisionService:
    VALID_CATEGORIES = {"plant", "animal", "insect", "fungus", "other"}
    VALID_DANGER_LEVELS = {"none", "low", "moderate"}

    def __init__(self, memory_repo: MemoryRepository, knowledge_repo: KnowledgeRepository):
        self.memory = memory_repo
        self.knowledge = knowledge_repo
        logger.info("vision_service_initialized")

    async def analyze_image(
        self, image_bytes: bytes, language: str = "fr", child_age: int = 8,
        session_id: Optional[str] = None, child_id: Optional[str] = None,
    ) -> AnalyseImageResult:
        self._validate_inputs(image_bytes, language, child_age)
        processed_image = self._preprocess_image(image_bytes)

        try:
            import google.generativeai as genai
            from google.generativeai import GenerativeModel
            from google.generativeai.types import GenerationConfig

            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = GenerativeModel(
                model_name="gemini-2.5-flash-lite",
                generation_config=GenerationConfig(max_output_tokens=512, temperature=0.6, top_p=0.95, top_k=40),
            )
            prompt = get_image_analysis_prompt(language=language, child_age=child_age)
            image_part = {"mime_type": "image/jpeg", "data": processed_image}
            response = await asyncio.to_thread(model.generate_content, [prompt, image_part])
            result_data = self._parse_json(response.text)
        except Exception:
            logger.warning("gemini_vision_failed_using_fallback")
            result_data = get_fallback_analysis_response(language, "analysis_error")

        result = self._normalize_result(result_data, language, child_age)
        if session_id and result.espece:
            await self._record_discovery(session_id, child_id, result)
        logger.info("image_analysis_complete", species=result.espece, category=result.categorie, language=language)
        return result

    def _parse_json(self, text: str) -> Dict[str, Any]:
        import json
        cleaned = text.strip()
        try: return json.loads(cleaned)
        except json.JSONDecodeError: pass
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1]
            if "```" in cleaned: cleaned = cleaned.split("```")[0]
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1]
            if "```" in cleaned: cleaned = cleaned.split("```")[0]
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            try: return json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError: pass
        return get_fallback_analysis_response("fr", "parse_error")

    def _validate_inputs(self, image_bytes: bytes, language: str, child_age: int) -> None:
        if not image_bytes or len(image_bytes) == 0: raise ValidationException("Image data is empty.")
        if len(image_bytes) > settings.max_image_size_bytes: raise ValidationException(f"Image too large.")
        if not validate_child_age(child_age): raise ValidationException(f"Invalid age.")

    def _preprocess_image(self, image_bytes: bytes) -> bytes:
        try: return process_image_for_analysis(image_bytes=image_bytes, max_size_mb=settings.MAX_IMAGE_SIZE_MB, max_width=1024, max_height=1024, quality=85)
        except Exception as e: raise ImageProcessingException(f"Preprocessing failed: {str(e)}")

    def _normalize_result(self, raw_data: Dict[str, Any], language: str, child_age: int) -> AnalyseImageResult:
        category = raw_data.get("categorie", raw_data.get("category", "other"))
        if category not in self.VALID_CATEGORIES: category = "other"
        danger_level = raw_data.get("niveau_danger", raw_data.get("danger_level", "none"))
        if danger_level not in self.VALID_DANGER_LEVELS: danger_level = "none"
        return AnalyseImageResult(
            espece=raw_data.get("espece", raw_data.get("species", "Unknown")),
            nom_local=raw_data.get("nom_local", raw_data.get("local_name")),
            categorie=category,
            description_enfant=raw_data.get("description_enfant", raw_data.get("child_description", "Belle decouverte!")),
            role_ecologique=raw_data.get("role_ecologique", raw_data.get("ecological_role", "Partie de notre ecosysteme.")),
            fait_amusant=raw_data.get("fait_amusant", raw_data.get("fun_fact", "La nature est pleine de surprises!")),
            menaces=raw_data.get("menaces", raw_data.get("threats")),
            action_enfant=raw_data.get("action_enfant", raw_data.get("child_action", "Observe et protege la nature.")),
            emoji=raw_data.get("emoji", "🌿"),
            niveau_danger=danger_level,
            conseils_securite=raw_data.get("conseils_securite", raw_data.get("safety_tips")),
            points_gagnes=raw_data.get("points_gagnes", raw_data.get("points_earned", 10)),
            titre_gardien=raw_data.get("titre_gardien", raw_data.get("guardian_title")),
            confiance=0.85 if category != "other" else 0.5,
        )

    async def _record_discovery(self, session_id: str, child_id: Optional[str], result: AnalyseImageResult) -> None:
        try:
            progress = self.memory.load_progress(session_id)
            discovered = progress.get("species_discovered", [])
            if result.espece not in discovered: discovered.append(result.espece)
            updated_progress = {**progress, "species_discovered": discovered, "total_points": progress.get("total_points", 0) + result.points_gagnes, "last_activity": datetime.now(timezone.utc).isoformat()}
            if child_id: updated_progress["child_id"] = child_id
            self.memory.save_progress(session_id, updated_progress)
        except Exception as e: log_error(logger, "Failed to record discovery", exception=e)

    async def get_species_catalog(self, category: Optional[str] = None, language: str = "fr") -> list:
        return self.knowledge.get_catalog(category=category, language=language)

    async def get_species_detail(self, species_id: str, language: str = "fr") -> Optional[Dict[str, Any]]:
        return self.knowledge.get_species(species_id, language=language)