"""
SOMAKID AI Engine - Voice Routes
Version finale avec prononciation corrigée et vitesse optimisée
- "SOMAKID" prononcé correctement (So-ma-kid)
- Vitesse augmentée (rate=1.15)
- Utilisation prioritaire d'Edge TTS (voix naturelles)
"""

import os
import base64
import re

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


def _fix_pronunciation(text: str) -> str:
    """
    CORRECTION CRITIQUE : Remplace les mots mal prononcés par leur version phonétique.
    "SOMAKID" -> "So-ma-kid" (force la bonne prononciation)
    "SOMA" -> "So-ma"
    """
    replacements = {
        "SOMAKID": "So-ma-kid",
        "Somakid": "So-ma-kid",
        "somakid": "So-ma-kid",
        "SOMA": "So-ma",
        "Soma": "So-ma",
        "soma": "So-ma",
        "SOMAKID AI": "So-ma-kid A-I",
        "AI Engine": "A-I Engine",
    }
    
    result = text
    for word, replacement in replacements.items():
        result = re.sub(rf'\b{word}\b', replacement, result, flags=re.IGNORECASE)
    return result


def _normalize_phonetic(text: str, langue: str) -> str:
    """Normalize text for better pronunciation in African languages."""
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
    """Add natural pauses between sentences and phrases."""
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


def _clean_text_for_tts(text: str, langue: str) -> str:
    """Nettoyage complet du texte pour TTS."""
    text = _fix_pronunciation(text)
    text = _normalize_phonetic(text, langue)
    text = re.sub(r'[#*_~|`]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


async def _elevenlabs_tts(text: str, langue: str) -> bytes:
    """Text-to-speech with ElevenLabs."""
    if not ELEVENLABS_API_KEY:
        raise Exception("ELEVENLABS_API_KEY not configured")
    from elevenlabs import ElevenLabs
    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    voice_id = ELEVENLABS_VOICE_MAP.get(langue, ELEVENLABS_VOICE_MAP["fr"])
    audio_generator = client.generate(
        text=text,
        voice=voice_id,
        model="eleven_multilingual_v2",
        voice_settings={
            "stability": 0.35,
            "similarity_boost": 0.75,
        },
    )
    audio_bytes = b""
    for chunk in audio_generator:
        audio_bytes += chunk
    return audio_bytes


async def _edge_tts(text: str, langue: str) -> bytes:
    """Synthesize speech using Microsoft Edge TTS with optimized SSML."""
    import edge_tts
    
    voice_map = {
        "fr": "fr-FR-DeniseNeural",
        "ln": "fr-FR-DeniseNeural",
        "sw": "sw-KE-RehemaNeural",
        "en": "en-US-JennyNeural",
    }
    voice = voice_map.get(langue, "fr-FR-DeniseNeural")

    clean_text = _clean_text_for_tts(text, langue)
    
    ssml_text = clean_text
    ssml_text = ssml_text.replace(". ", '.<break time="400ms"/> ')
    ssml_text = ssml_text.replace("? ", '?<break time="500ms"/> ')
    ssml_text = ssml_text.replace("! ", '!<break time="500ms"/> ')
    ssml_text = ssml_text.replace(": ", ':<break time="300ms"/> ')
    ssml_text = ssml_text.replace(", ", ',<break time="150ms"/> ')

    ssml = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="{langue}">
        <voice name="{voice}">
            <mstts:express-as style="cheerful" styledegree="1.2">
                <prosody rate="1.15" pitch="+0Hz">
                    {ssml_text}
                </prosody>
            </mstts:express-as>
        </voice>
    </speak>"""

    communicate = edge_tts.Communicate(ssml, voice)
    audio = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
    return audio


async def _gtts_fallback(text: str, langue: str) -> bytes:
    """gTTS fallback."""
    from gtts import gTTS
    import io
    
    lang_map = {"fr": "fr", "ln": "fr", "sw": "sw", "en": "en"}
    clean_text = _clean_text_for_tts(text, langue)
    clean_text = _add_natural_pauses(clean_text)
    
    buf = io.BytesIO()
    tts = gTTS(text=clean_text, lang=lang_map.get(langue, "fr"), slow=False)
    tts.write_to_fp(buf)
    buf.seek(0)
    return buf.read()


async def _text_to_speech(text: str, langue: str) -> bytes:
    """TTS amélioré avec priorité à Edge TTS."""
    clean_text = _clean_text_for_tts(text, langue)
    
    if not clean_text:
        clean_text = "Je suis désolé, je n'ai pas pu générer de réponse vocale."
    
    logger.info("tts_start", text_preview=clean_text[:100], langue=langue)
    
    # Priorité 1: Edge TTS
    try:
        audio = await _edge_tts(clean_text, langue)
        if audio:
            logger.info("edge_tts_success", audio_size=len(audio), langue=langue)
            return audio
    except Exception as e:
        logger.warning("edge_tts_failed", error=str(e))
    
    # Priorité 2: ElevenLabs
    if ELEVENLABS_API_KEY:
        try:
            audio = await _elevenlabs_tts(clean_text, langue)
            if audio:
                logger.info("elevenlabs_success", audio_size=len(audio), langue=langue)
                return audio
        except Exception as e:
            logger.warning("elevenlabs_failed", error=str(e))
    
    # Fallback: gTTS
    logger.warning("using_gtts_fallback", langue=langue)
    return await _gtts_fallback(clean_text, langue)


class DirectSynthesisRequest(BaseModel):
    texte: str = Field(min_length=1, max_length=2000)
    langue: str = Field(default="fr")


@router.post("/synthesize-direct")
@limiter.limit("40/minute")
async def synthesize_direct(request: Request, body: DirectSynthesisRequest):
    """Synthesize speech and return audio_base64."""
    if body.langue not in settings.supported_languages_list:
        raise HTTPException(status_code=400, detail=f"Language '{body.langue}' is not supported.")

    try:
        audio_mp3 = await _text_to_speech(body.texte, body.langue)
        audio_b64 = base64.b64encode(audio_mp3).decode("utf-8")
        
        logger.info("tts_success", text_length=len(body.texte), audio_length=len(audio_b64), langue=body.langue)
        
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


@router.post("/synthesize")
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


@router.post("/recognize")
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


@router.get("/languages")
async def get_voice_languages():
    """Return supported voice languages."""
    languages = [
        {"code": "fr", "name": "French", "voices": 4},
        {"code": "ln", "name": "Lingala", "voices": 1},
        {"code": "sw", "name": "Swahili", "voices": 2},
        {"code": "en", "name": "English", "voices": 4},
    ]
    return JSONResponse(content={"success": True, "data": languages})