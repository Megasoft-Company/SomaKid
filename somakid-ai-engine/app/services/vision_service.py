"""
SOMAKID AI Engine - Vision Analysis Service
Orchestrates image analysis for species identification.
Uses Gemini Vision for reliable analysis.
"""

from typing import Optional, Dict, Any
from datetime import datetime, timezone
import asyncio

from ..core.config import settings
from ..core.exceptions import (
    ValidationException,
    AIServiceException,
    ImageProcessingException,
    UnsupportedLanguageException,
)
from ..core.security import validate_child_age, validate_supported_language
from ..core.logging_config import get_logger, log_performance, log_error
from ..models.schemas import AnalyseImageResult
from ..utils.helpers import process_image_for_analysis
from ..utils.prompts import get_image_analysis_prompt, get_fallback_analysis_response
from ..repositories.memory_repository import MemoryRepository
from ..repositories.knowledge_repository import KnowledgeRepository

logger = get_logger(__name__)

# Multilingual default texts for _normalize_result
_DEFAULT_TEXTS = {
    "fr": {
        "description_enfant": "Belle decouverte de la nature africaine !",
        "role_ecologique": "Partie importante de notre ecosysteme.",
        "fait_amusant": "La nature est pleine de surprises !",
        "action_enfant": "Observe et protege la nature autour de toi.",
    },
    "en": {
        "description_enfant": "A beautiful discovery of African nature!",
        "role_ecologique": "An important part of our ecosystem.",
        "fait_amusant": "Nature is full of surprises!",
        "action_enfant": "Observe and protect the nature around you.",
    },
    "ln": {
        "description_enfant": "Découverte ya kitoko ya nature ya Afrique !",
        "role_ecologique": "Partie importante ya ecosysteme na biso.",
        "fait_amusant": "Nature etondi na ba surprises !",
        "action_enfant": "Tala mpe batela nature pembeni na yo.",
    },
    "sw": {
        "description_enfant": "Ugunduzi mzuri wa asili ya Afrika!",
        "role_ecologique": "Sehemu muhimu ya mfumo wetu wa ikolojia.",
        "fait_amusant": "Asili imejaa mshangao!",
        "action_enfant": "Tazama na ulinde asili karibu nawe.",
    },
}

# Multilingual default texts for _normalize_result (health domain)
_HEALTH_DEFAULT_TEXTS = {
    "fr": {
        "description_enfant": "Belle decouverte pour prendre soin de ta sante !",
        "role_ecologique": "Utile pour rester en bonne sante au quotidien.",
        "fait_amusant": "Prendre soin de soi est un vrai super-pouvoir !",
        "action_enfant": "Adopte ce bon geste de sante chaque jour.",
    },
    "en": {
        "description_enfant": "A great discovery for taking care of your health!",
        "role_ecologique": "Useful for staying healthy day to day.",
        "fait_amusant": "Taking care of yourself is a real super-power!",
        "action_enfant": "Adopt this healthy habit every day.",
    },
    "ln": {
        "description_enfant": "Decouverte ya kitoko po na kobatela sante na yo !",
        "role_ecologique": "Ezali na ntina po na kozala malamu mokolo na mokolo.",
        "fait_amusant": "Kobatela nzoto na yo ezali super-pouvoir ya solo !",
        "action_enfant": "Sala geste oyo ya sante mokolo na mokolo.",
    },
    "sw": {
        "description_enfant": "Ugunduzi mzuri wa kutunza afya yako!",
        "role_ecologique": "Ni muhimu kubaki na afya njema kila siku.",
        "fait_amusant": "Kujitunza ni nguvu ya kweli!",
        "action_enfant": "Chukua tabia hii ya afya kila siku.",
    },
}


class VisionService:
    VALID_CATEGORIES = {
        "plant", "animal", "insect", "fungus", "other",
        # Health domain categories
        "food", "hygiene_product", "first_aid", "medicine",
    }
    VALID_DANGER_LEVELS = {"none", "low", "moderate"}

    def __init__(self, memory_repo: MemoryRepository, knowledge_repo: KnowledgeRepository):
        self.memory = memory_repo
        self.knowledge = knowledge_repo
        logger.info("vision_service_initialized")

    async def analyze_image(
        self,
        image_bytes: bytes,
        language: str = "fr",
        child_age: int = 8,
        session_id: Optional[str] = None,
        child_id: Optional[str] = None,
        domain: str = "environment",
    ) -> AnalyseImageResult:
        """Analyze an image for biodiversity species identification (or health object recognition when domain='health')."""
        self._validate_inputs(image_bytes, language, child_age)
        processed_image = self._preprocess_image(image_bytes)

        try:
            import google.generativeai as genai
            from google.generativeai import GenerativeModel
            from google.generativeai.types import GenerationConfig

            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = GenerativeModel(
                model_name="gemini-2.5-flash-lite",
                generation_config=GenerationConfig(
                    max_output_tokens=512,
                    temperature=0.6,
                    top_p=0.95,
                    top_k=40,
                ),
            )
            prompt = get_image_analysis_prompt(language=language, child_age=child_age, domain=domain)
            image_part = {"mime_type": "image/jpeg", "data": processed_image}
            response = await asyncio.to_thread(
                model.generate_content, [prompt, image_part]
            )
            result_data = self._parse_json(response.text, language, domain)
        except Exception:
            logger.warning("gemini_vision_failed_using_fallback")
            result_data = get_fallback_analysis_response(language, "analysis_error", domain=domain)

        result = self._normalize_result(result_data, language, child_age, domain)

        if session_id and result.espece:
            await self._record_discovery(session_id, child_id, result)

        logger.info(
            "image_analysis_complete",
            species=result.espece,
            category=result.categorie,
            language=language,
        )
        return result

    async def get_species_catalog(
        self,
        category: Optional[str] = None,
        language: str = "fr",
    ) -> list:
        """Return the species catalog filtered by category and language."""
        return self.knowledge.get_catalog(category=category, language=language)

    async def get_species_detail(
        self,
        species_id: str,
        language: str = "fr",
    ) -> Optional[Dict[str, Any]]:
        """Return detailed information about a specific species."""
        return self.knowledge.get_species(species_id, language=language)

    # ─────────────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────────────

    def _validate_inputs(
        self,
        image_bytes: bytes,
        language: str,
        child_age: int,
    ) -> None:
        """Validate analysis input parameters."""
        if not image_bytes or len(image_bytes) == 0:
            raise ValidationException("Image data is empty.")
        if len(image_bytes) > settings.max_image_size_bytes:
            raise ValidationException("Image too large.")
        if not validate_child_age(child_age):
            raise ValidationException("Invalid age.")

    def _preprocess_image(self, image_bytes: bytes) -> bytes:
        """Preprocess image for optimal analysis."""
        try:
            return process_image_for_analysis(
                image_bytes=image_bytes,
                max_size_mb=settings.MAX_IMAGE_SIZE_MB,
                max_width=1024,
                max_height=1024,
                quality=85,
            )
        except Exception as e:
            raise ImageProcessingException(f"Preprocessing failed: {str(e)}")

    def _parse_json(self, text: str, language: str = "fr", domain: str = "environment") -> Dict[str, Any]:
        """Extract JSON from AI response text, with fallback in the correct language."""
        import json

        cleaned = text.strip()

        # Try direct parse
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Try extracting from markdown code blocks
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1]
            if "```" in cleaned:
                cleaned = cleaned.split("```")[0]
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1]
            if "```" in cleaned:
                cleaned = cleaned.split("```")[0]

        # Try extracting JSON object
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and start < end:
            try:
                return json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError:
                pass

        # Fallback in the correct language
        logger.warning("vision_json_parse_failed_using_fallback")
        return get_fallback_analysis_response(language, "parse_error", domain=domain)

    def _normalize_result(
        self,
        raw_data: Dict[str, Any],
        language: str,
        child_age: int,
        domain: str = "environment",
    ) -> AnalyseImageResult:
        """Normalize raw AI response data into a structured result with language-aware defaults."""
        texts_source = _HEALTH_DEFAULT_TEXTS if domain == "health" else _DEFAULT_TEXTS
        default_texts = texts_source.get(language, texts_source["fr"])

        category = raw_data.get("categorie", raw_data.get("category", "other"))
        if category not in self.VALID_CATEGORIES:
            category = "other"

        danger_level = raw_data.get("niveau_danger", raw_data.get("danger_level", "none"))
        if danger_level not in self.VALID_DANGER_LEVELS:
            danger_level = "none"

        return AnalyseImageResult(
            espece=raw_data.get("espece", raw_data.get("species", "Unknown")),
            nom_local=raw_data.get("nom_local", raw_data.get("local_name")),
            categorie=category,
            description_enfant=raw_data.get(
                "description_enfant",
                raw_data.get("child_description", default_texts["description_enfant"]),
            ),
            role_ecologique=raw_data.get(
                "role_ecologique",
                raw_data.get("ecological_role", default_texts["role_ecologique"]),
            ),
            fait_amusant=raw_data.get(
                "fait_amusant",
                raw_data.get("fun_fact", default_texts["fait_amusant"]),
            ),
            menaces=raw_data.get("menaces", raw_data.get("threats")),
            action_enfant=raw_data.get(
                "action_enfant",
                raw_data.get("child_action", default_texts["action_enfant"]),
            ),
            emoji=raw_data.get("emoji", "🌿"),
            niveau_danger=danger_level,
            conseils_securite=raw_data.get(
                "conseils_securite",
                raw_data.get("safety_tips"),
            ),
            points_gagnes=raw_data.get("points_gagnes", raw_data.get("points_earned", 10)),
            titre_gardien=raw_data.get(
                "titre_gardien",
                raw_data.get("guardian_title"),
            ),
            confiance=0.85 if category != "other" else 0.5,
        )

    async def _record_discovery(
        self,
        session_id: str,
        child_id: Optional[str],
        result: AnalyseImageResult,
    ) -> None:
        """Record a species discovery in session memory."""
        try:
            progress = self.memory.load_progress(session_id)
            discovered = progress.get("species_discovered", [])

            if result.espece not in discovered:
                discovered.append(result.espece)

            updated_progress = {
                **progress,
                "species_discovered": discovered,
                "total_points": progress.get("total_points", 0) + result.points_gagnes,
                "last_activity": datetime.now(timezone.utc).isoformat(),
            }

            if child_id:
                updated_progress["child_id"] = child_id

            self.memory.save_progress(session_id, updated_progress)
        except Exception as e:
            log_error(logger, "Failed to record discovery", exception=e)