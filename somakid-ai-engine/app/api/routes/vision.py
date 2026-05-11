"""
SOMAKID AI Engine - Vision Analysis Routes
HTTP endpoints for biodiversity image analysis.
All comments in English.
"""

from typing import Optional
import base64
import io

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from ..deps import get_vision_service
from ...services.vision_service import VisionService
from ...core.config import settings
from ...core.exceptions import ValidationException, ImageProcessingException, AIServiceException
from ...core.logging_config import get_logger
from ...core.security import limiter

logger = get_logger(__name__)
router = APIRouter()


async def _tts(text: str, langue: str) -> bytes:
    """Convert text to speech in the given language."""
    try:
        import edge_tts
        voice_map = {
            "fr": "fr-FR-DeniseNeural",
            "ln": "fr-FR-DeniseNeural",
            "sw": "sw-KE-RehemaNeural",
            "en": "en-US-AriaNeural",
        }
        voice = voice_map.get(langue, "fr-FR-DeniseNeural")
        communicate = edge_tts.Communicate(text, voice)
        audio = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio += chunk["data"]
        return audio
    except Exception:
        from gtts import gTTS
        lang_map = {"fr": "fr", "ln": "fr", "sw": "sw", "en": "en"}
        mp3 = io.BytesIO()
        gTTS(text=text, lang=lang_map.get(langue, "fr"), slow=False).write_to_fp(mp3)
        mp3.seek(0)
        return mp3.read()


@router.post("/analyze")
@limiter.limit("30/minute")
async def analyze_image(
    request: Request,
    image: UploadFile = File(...),
    language: str = Form(default="fr"),
    child_age: int = Form(default=8, ge=3, le=15),
    vision_service: VisionService = Depends(get_vision_service),
):
    """
    Analyze an image for biodiversity identification.
    The response is generated in the language specified by the 'language' parameter.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type.")
    try:
        image_bytes = await image.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read image.")
    if len(image_bytes) > settings.max_image_size_bytes:
        raise HTTPException(status_code=400, detail="Image too large.")

    try:
        result = await vision_service.analyze_image(
            image_bytes=image_bytes,
            language=language,
            child_age=child_age,
        )
        # Build description text in the correct language
        soma_text = (
            f"{result.espece}. {result.description_enfant} "
            f"Son role: {result.role_ecologique}. "
            f"Le savais-tu? {result.fait_amusant}. {result.action_enfant}"
        )
        audio_mp3 = await _tts(soma_text, language)
        data = result.model_dump()
        data["audio_base64"] = base64.b64encode(audio_mp3).decode("utf-8")
        from datetime import datetime, timezone
        return JSONResponse(content={
            "success": True,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except ValidationException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)
    except Exception as e:
        logger.error("vision_error", error=str(e))
        raise HTTPException(status_code=500, detail="Analysis failed")


@router.get("/catalog")
async def get_species_catalog(
    category: Optional[str] = None,
    language: str = "fr",
    vision_service: VisionService = Depends(get_vision_service),
):
    """Get the species catalog in the requested language."""
    catalog = await vision_service.get_species_catalog(category=category, language=language)
    return JSONResponse(content={"success": True, "data": catalog, "total": len(catalog)})


@router.get("/species/{species_id}")
async def get_species_detail(
    species_id: str,
    language: str = "fr",
    vision_service: VisionService = Depends(get_vision_service),
):
    """Get detailed information about a specific species in the requested language."""
    detail = await vision_service.get_species_detail(species_id=species_id, language=language)
    if detail is None:
        raise HTTPException(status_code=404, detail="Species not found.")
    return JSONResponse(content={"success": True, "data": detail})