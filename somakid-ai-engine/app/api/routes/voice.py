"""
SOMAKID AI Engine - Voice Routes
HTTP endpoints for text-to-speech and speech-to-text functionality.
Uses Edge TTS for synthesis and Gemini AI for transcription.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
import base64

from ...core.config import settings
from ...core.logging_config import get_logger
from ...core.security import limiter
from ...models.schemas import SyntheseVocaleRequete, ReconnaissanceVocaleRequete
from ..deps import get_gemini_client
from ...services.gemini_client import GeminiClient
from pydantic import BaseModel, Field

logger = get_logger(__name__)
router = APIRouter()


# ─── Edge TTS helper (shared with quiz routes) ────────────────────────────────

async def _edge_tts(text: str, langue: str) -> bytes:
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


# ─── Schemas ──────────────────────────────────────────────────────────────────

class DirectSynthesisRequest(BaseModel):
    texte: str = Field(min_length=1, max_length=2000)
    langue: str = Field(default="fr")


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post(
    "/synthesize-direct",
    summary="Text to Speech (direct audio)",
    description="Convert text to speech and return base64 MP3 audio directly.",
)
@limiter.limit("40/minute")
async def synthesize_direct(request: Request, body: DirectSynthesisRequest):
    """
    Synthesize speech and return audio_base64 in the response.
    Used by the quiz screen to speak question text and explanations.
    """
    if body.langue not in settings.supported_languages_list:
        raise HTTPException(status_code=400, detail=f"Language '{body.langue}' is not supported.")

    try:
        audio_mp3 = await _edge_tts(body.texte, body.langue)
        audio_b64 = base64.b64encode(audio_mp3).decode("utf-8")
        return JSONResponse(content={
            "success": True,
            "data": {
                "audio_base64": audio_b64,
                "text_length": len(body.texte),
                "language": body.langue,
            },
        })
    except Exception as e:
        logger.error("tts_direct_error", error=str(e))
        return JSONResponse(content={"success": True, "data": {"audio_base64": ""}})


@router.post(
    "/synthesize",
    summary="Text to Speech (metadata only)",
    description="Validate synthesis request. Use /synthesize-direct for actual audio.",
)
@limiter.limit("20/minute")
async def synthesize_speech(request: Request, body: SyntheseVocaleRequete):
    if body.langue not in settings.supported_languages_list:
        raise HTTPException(status_code=400, detail=f"Language '{body.langue}' is not supported.")
    if not body.texte or not body.texte.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(body.texte) > 5000:
        raise HTTPException(status_code=400, detail="Text is too long. Maximum 5000 characters.")

    return JSONResponse(content={
        "success": True,
        "message": "Use /voice/synthesize-direct for audio output.",
        "data": {"text_length": len(body.texte), "language": body.langue, "speed": body.vitesse},
    })


@router.post(
    "/recognize",
    summary="Speech to Text",
    description="Convert speech audio to text using Gemini AI transcription.",
)
@limiter.limit("20/minute")
async def recognize_speech(
    request: Request,
    body: ReconnaissanceVocaleRequete,
    gemini_client: GeminiClient = Depends(get_gemini_client),
):
    if not body.audio_base64 or len(body.audio_base64) < 100:
        raise HTTPException(status_code=400, detail="Invalid or empty audio data.")
    if body.langue not in settings.supported_languages_list:
        raise HTTPException(status_code=400, detail=f"Language '{body.langue}' is not supported.")

    language_names = {"fr": "French", "ln": "Lingala", "sw": "Swahili"}

    try:
        audio_bytes = base64.b64decode(body.audio_base64)
        prompt = f"""You are a speech transcription tool. Transcribe the audio accurately.
The speaker is speaking in {language_names.get(body.langue, 'French')}.
If you cannot understand the audio, respond with an empty string.
Do NOT add any extra text, explanations, or punctuation beyond the transcription.
Just return the exact words spoken, nothing else."""

        transcription = await gemini_client.generate_with_image(
            prompt=prompt,
            image_bytes=audio_bytes,
            mime_type="audio/m4a",
        )

        text = transcription.strip().strip('"').strip("'")
        if text.lower() in ("none", "null", "i cannot understand", "i can't understand", ""):
            text = ""

        logger.info("voice_recognition_complete", text_length=len(text), language=body.langue)
        return JSONResponse(content={
            "success": True,
            "data": {"text": text, "language": body.langue, "session_id": body.identifiant_session},
        })

    except Exception as e:
        logger.error("voice_recognition_error", error=str(e))
        return JSONResponse(content={
            "success": True,
            "data": {"text": "", "language": body.langue, "session_id": body.identifiant_session},
        })


@router.get(
    "/languages",
    summary="Supported Voice Languages",
    description="Get languages supported for voice synthesis and recognition.",
)
async def get_voice_languages():
    languages = [
        {"code": "fr", "name": "French", "voices": 4},
        {"code": "ln", "name": "Lingala", "voices": 1},
        {"code": "sw", "name": "Swahili", "voices": 2},
    ]
    return JSONResponse(content={"success": True, "data": languages})