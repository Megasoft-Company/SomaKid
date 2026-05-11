"""
SOMAKID AI Engine - Voice Routes
"""

import os
import base64

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ...core.config import settings
from ...core.logging_config import get_logger
from ...core.security import limiter
from ...models.schemas import SyntheseVocaleRequete, ReconnaissanceVocaleRequete
from ..deps import get_gemini_client
from ...services.gemini_client import GeminiClient

logger = get_logger(__name__)
router = APIRouter()

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "").strip()

ELEVENLABS_VOICE_MAP = {
    "fr": "pNInz6obpgDQGcFmaJgB",
    "ln": "pNInz6obpgDQGcFmaJgB",
    "sw": "TxGEqnHWrfWFTfGW9XjX",
    "en": "21m00Tcm4TlvDq8ikWAM",
}


def _normalize_phonetic(text: str, langue: str) -> str:
    """
    Normalize text for better pronunciation in African languages.
    Replaces special characters with phonetic equivalents that TTS engines pronounce correctly.
    """
    if langue == "ln":
        phonetic_map = {
            "ɛ": "e", "ɔ": "o", "á": "a", "é": "e", "í": "i",
            "ó": "o", "ú": "ou", "â": "a", "ê": "e", "î": "i",
            "ô": "o", "û": "ou", "ǎ": "a", "ě": "e", "ǐ": "i",
            "ǒ": "o", "ǔ": "ou",
        }
    elif langue == "sw":
        phonetic_map = {
            "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
            "â": "a", "ê": "e", "î": "i", "ô": "o", "û": "u",
            "ng'": "ng", "ng’": "ng",
        }
    else:
        return text

    result = text
    for accented, replacement in phonetic_map.items():
        result = result.replace(accented, replacement)
    return result


def _add_natural_pauses(text: str) -> str:
    """
    Add natural pauses between sentences and phrases.
    Uses spacing and punctuation to create breathing room in speech.
    """
    text = text.replace(". ", ".   ")
    text = text.replace("? ", "?   ")
    text = text.replace("! ", "!   ")
    text = text.replace(": ", ":   ")
    text = text.replace(", ", ",  ")
    text = text.replace("Option ", "Option. ")
    text = text.replace("Chaguo ", "Chaguo. ")
    text = text.replace("Eyano ", "Eyano. ")
    text = text.replace("Motuna. ", "Motuna.   ")
    text = text.replace("Swali. ", "Swali.   ")
    text = text.replace("Question. ", "Question.   ")
    return text


async def _elevenlabs_tts(text: str, langue: str) -> bytes:
    """Text-to-speech with ElevenLabs for perfect African language pronunciation."""
    if not ELEVENLABS_API_KEY:
        raise Exception("ELEVENLABS_API_KEY not configured")
    from elevenlabs import ElevenLabs
    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    voice_id = ELEVENLABS_VOICE_MAP.get(langue, ELEVENLABS_VOICE_MAP["fr"])
    audio_generator = client.generate(
        text=text,
        voice=voice_id,
        model="eleven_multilingual_v2",
    )
    audio_bytes = b""
    for chunk in audio_generator:
        audio_bytes += chunk
    return audio_bytes


async def _edge_tts(text: str, langue: str) -> bytes:
    """Synthesize speech using Microsoft Edge TTS with SSML for natural pauses."""
    import edge_tts
    voice_map = {
        "fr": "fr-FR-DeniseNeural",
        "ln": "fr-FR-DeniseNeural",
        "sw": "sw-KE-RehemaNeural",
        "en": "en-US-AriaNeural",
    }
    voice = voice_map.get(langue, "fr-FR-DeniseNeural")

    ssml_text = (
        text.replace(". ", '.<break time="450ms"/> ')
        .replace("? ", '?<break time="550ms"/> ')
        .replace("! ", '!<break time="550ms"/> ')
        .replace(": ", ':<break time="350ms"/> ')
        .replace(", ", ',<break time="250ms"/> ')
    )

    ssml = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{langue}">
        <voice name="{voice}">
            <prosody rate="0.85" pitch="+0Hz">
                {ssml_text}
            </prosody>
        </voice>
    </speak>"""

    communicate = edge_tts.Communicate(ssml, voice)
    audio = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
    return audio


async def _gtts_fallback(text: str, langue: str) -> bytes:
    """gTTS fallback if both ElevenLabs and Edge TTS fail."""
    from gtts import gTTS
    import io
    lang_map = {"fr": "fr", "ln": "fr", "sw": "sw", "en": "en"}
    clean_text = _add_natural_pauses(text)
    buf = io.BytesIO()
    tts = gTTS(text=clean_text, lang=lang_map.get(langue, "fr"), slow=True)
    tts.write_to_fp(buf)
    buf.seek(0)
    return buf.read()


async def _text_to_speech(text: str, langue: str) -> bytes:
    """TTS with ElevenLabs primary, Edge TTS secondary, gTTS fallback."""
    normalized_text = _normalize_phonetic(text, langue)

    if ELEVENLABS_API_KEY:
        try:
            return await _elevenlabs_tts(normalized_text, langue)
        except Exception as e:
            logger.warning("elevenlabs_tts_failed_falling_back_to_edge", error=str(e))
    try:
        return await _edge_tts(normalized_text, langue)
    except Exception as e:
        logger.warning("edge_tts_failed_falling_back_to_gtts", error=str(e))
        return await _gtts_fallback(normalized_text, langue)


class DirectSynthesisRequest(BaseModel):
    texte: str = Field(min_length=1, max_length=2000)
    langue: str = Field(default="fr")


@router.post(
    "/synthesize-direct",
    summary="Text to Speech (direct audio)",
    description="Convert text to speech and return base64 MP3 audio directly.",
)
@limiter.limit("40/minute")
async def synthesize_direct(request: Request, body: DirectSynthesisRequest):
    """
    Synthesize speech and return audio_base64 in the response.
    Uses ElevenLabs for African languages when API key is configured.
    """
    if body.langue not in settings.supported_languages_list:
        raise HTTPException(status_code=400, detail=f"Language '{body.langue}' is not supported.")

    try:
        audio_mp3 = await _text_to_speech(body.texte, body.langue)
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
    """Validate a speech synthesis request."""
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
    """Transcribe speech audio to text."""
    if not body.audio_base64 or len(body.audio_base64) < 100:
        raise HTTPException(status_code=400, detail="Invalid or empty audio data.")
    if body.langue not in settings.supported_languages_list:
        raise HTTPException(status_code=400, detail=f"Language '{body.langue}' is not supported.")

    language_names = {"fr": "French", "ln": "Lingala", "sw": "Swahili", "en": "English"}

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
    """Return supported voice languages."""
    languages = [
        {"code": "fr", "name": "French", "voices": 4},
        {"code": "ln", "name": "Lingala", "voices": 1},
        {"code": "sw", "name": "Swahili", "voices": 2},
        {"code": "en", "name": "English", "voices": 4},
    ]
    return JSONResponse(content={"success": True, "data": languages})