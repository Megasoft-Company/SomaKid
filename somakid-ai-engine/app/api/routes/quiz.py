"""
SOMAKID AI Engine - Quiz Routes
"""

from typing import Optional, List
import base64
import io
import json
import re
import tempfile
import os
import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..deps import get_quiz_service, get_memory_repository
from ...services.quiz_service import QuizService
from ...core.config import settings
from ...core.exceptions import ValidationException, AIServiceException
from ...core.logging_config import get_logger
from ...core.security import limiter
from ...models.schemas import GenerationQuizRequete, ReponseQuizRequete
from ...utils.prompts import get_voice_quiz_response

logger = get_logger(__name__)
router = APIRouter()

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "").strip()

ELEVENLABS_VOICE_MAP = {
    "fr": "pNInz6obpgDQGcFmaJgB",
    "ln": "pNInz6obpgDQGcFmaJgB",
    "sw": "TxGEqnHWrfWFTfGW9XjX",
    "en": "21m00Tcm4TlvDq8ikWAM",
}

_AUDIO_LABELS = {
    "fr": {"question": "Question", "option": "Option"},
    "en": {"question": "Question", "option": "Option"},
    "ln": {"question": "Motuna", "option": "Eyano"},
    "sw": {"question": "Swali", "option": "Chaguo"},
}


def _extract_plain_text(raw: str) -> str:
    """Extract only natural language text from AI response, removing JSON, code, and markdown."""
    if not raw:
        return ""
    text = raw.strip()
    # Si c'est du JSON, extraire le contenu texte
    if text.startswith("{"):
        try:
            data = json.loads(text)
            for key in ("reponse", "response", "soma_response", "message", "content", "question", "explanation", "text"):
                val = data.get(key, "")
                if val and isinstance(val, str) and val.strip():
                    return _extract_plain_text(val)
        except json.JSONDecodeError:
            match = re.search(r'"([a-z_]+)"\s*:\s*"([^"]+)"', text)
            if match:
                return match.group(2).strip()
    # Supprimer les blocs de code
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
    text = re.sub(r'`[^`]*`', '', text)
    text = text.replace('`', '')
    # Supprimer les accolades et crochets résiduels
    text = text.replace('{', '').replace('}', '')
    text = text.replace('[', '').replace(']', '')
    return text.strip()


def _sanitize_for_tts(text: str) -> str:
    """Clean text for TTS: remove URLs, special characters, XML/SSML tags, and normalize."""
    if not text:
        return ""
    # Supprimer les URLs
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'www\.\S+', '', text)
    text = re.sub(r'\S+\.(com|org|net|io|ai|edu|gov|fr|cd|tz|ke)\S*', '', text)
    # Supprimer toutes les balises HTML/XML/SSML (ex: <speak>, <break time="..."/>, <voice>, etc.)
    text = re.sub(r'<[^>]*>', '', text)
    text = text.replace('<', '').replace('>', '')
    # Supprimer les guillemets typographiques
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    # Supprimer les caractères markdown
    text = re.sub(r'[#*_~|]', '', text)
    # Normaliser les sauts de ligne et espaces
    text = re.sub(r'\n+', '. ', text)
    text = re.sub(r'\s+', ' ', text)
    # Normaliser les points multiples
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r'\.\s*\.', '.', text)
    return text.strip()


def _get_groq_client():
    from groq import Groq
    key = os.environ.get("GROQ_API_KEY", "")
    if not key:
        raise AIServiceException("GROQ_API_KEY is not set in the environment.")
    return Groq(api_key=key)


class VoiceQuizRequest(BaseModel):
    audio_base64: str = Field(min_length=100)
    langue: str = Field(default="fr")
    subject: str = Field(default="biodiversity")
    level: int = Field(default=1, ge=1, le=5)
    session_id: Optional[str] = Field(default=None)


def _normalize_phonetic(text: str, langue: str) -> str:
    if langue == "ln":
        phonetic_map = {
            "\u025b": "e", "\u0254": "o", "\u00e1": "a", "\u00e9": "e", "\u00ed": "i",
            "\u00f3": "o", "\u00fa": "ou", "\u00e2": "a", "\u00ea": "e", "\u00ee": "i",
            "\u00f4": "o", "\u00fb": "ou", "\u01ce": "a", "\u011b": "e", "\u01d0": "i",
            "\u01d2": "o", "\u01d4": "ou",
        }
    elif langue == "sw":
        phonetic_map = {
            "\u00e1": "a", "\u00e9": "e", "\u00ed": "i", "\u00f3": "o", "\u00fa": "u",
            "\u00e2": "a", "\u00ea": "e", "\u00ee": "i", "\u00f4": "o", "\u00fb": "u",
            "ng'": "ng", "ng\u2019": "ng",
        }
    else:
        return text
    result = text
    for accented, replacement in phonetic_map.items():
        result = result.replace(accented, replacement)
    return result


def _build_question_audio_text(question_text: str, options: List[str], langue: str) -> str:
    """Build natural spoken text for a quiz question and its options."""
    labels = _AUDIO_LABELS.get(langue, _AUDIO_LABELS["fr"])
    question_label = labels["question"]
    option_label = labels["option"]
    letters = ["A", "B", "C", "D"]

    # On construit une phrase naturelle, sans balises, sans ponctuation artificielle
    parts = [f"{question_label}. {question_text}"]
    for letter, option_text in zip(letters, options):
        if option_text and option_text.strip():
            parts.append(f"{option_label} {letter}. {option_text.strip()}")

    return "  ".join(parts)


async def _gtts(text: str, langue: str) -> bytes:
    """Primary TTS via gTTS (no SSML, reliable, multilingual)."""
    from gtts import gTTS
    lang_map = {"fr": "fr", "ln": "fr", "sw": "sw", "en": "en"}
    # Légère pause naturelle via espaces supplémentaires
    clean_text = text.replace(". ", ".   ").replace("? ", "?   ").replace(", ", ",  ")
    buf = io.BytesIO()
    tts = gTTS(text=clean_text, lang=lang_map.get(langue, "fr"), slow=False)
    tts.write_to_fp(buf)
    buf.seek(0)
    return buf.read()


async def _edge_tts_fallback(text: str, langue: str) -> bytes:
    """Fallback TTS via edge_tts — texte brut seulement, pas de SSML injecté."""
    import edge_tts
    voice_map = {
        "fr": "fr-FR-DeniseNeural",
        "ln": "fr-FR-DeniseNeural",
        "sw": "sw-KE-RehemaNeural",
        "en": "en-US-AriaNeural",
    }
    voice = voice_map.get(langue, "fr-FR-DeniseNeural")
    # Pas de SSML : on passe le texte brut directement à edge_tts
    communicate = edge_tts.Communicate(text, voice)
    audio_bytes = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes += chunk["data"]
    return audio_bytes


async def _elevenlabs_tts(text: str, langue: str) -> bytes:
    """Optional premium TTS via ElevenLabs — texte brut uniquement."""
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


async def _text_to_speech(text: str, langue: str) -> bytes:
    """
    Pipeline TTS unifié (aligné avec chat.py) :
    1. Extraire uniquement le texte naturel (pas de JSON, pas de code)
    2. Normaliser la phonétique pour les langues africaines
    3. Nettoyer URLs, balises XML/SSML, caractères spéciaux
    4. gtts en priorité → edge_tts en fallback → ElevenLabs si configuré
    """
    # Étape 1 : extraire le texte naturel
    plain_text = _extract_plain_text(text)
    # Étape 2 : normaliser la phonétique
    normalized_text = _normalize_phonetic(plain_text, langue)
    # Étape 3 : nettoyer pour TTS
    clean_text = _sanitize_for_tts(normalized_text)

    logger.info("QUIZ_TTS_INPUT", original_len=len(text), cleaned_len=len(clean_text), langue=langue)
    logger.info("QUIZ_TTS_TEXT", text=clean_text[:300])

    if not clean_text:
        logger.warning("QUIZ_TTS_EMPTY_TEXT")
        clean_text = "Désolé, je n'ai pas pu générer de réponse vocale."

    # Étape 4 : gtts en priorité (cohérent avec chat.py), fallbacks ensuite
    try:
        return await _gtts(clean_text, langue)
    except Exception as e:
        logger.warning("gtts_quiz_failed", error=str(e))

    try:
        return await _edge_tts_fallback(clean_text, langue)
    except Exception as e:
        logger.warning("edge_tts_quiz_failed", error=str(e))

    # ElevenLabs en dernier recours si configuré
    if ELEVENLABS_API_KEY:
        try:
            return await _elevenlabs_tts(clean_text, langue)
        except Exception as e:
            logger.warning("elevenlabs_tts_quiz_failed", error=str(e))

    raise Exception("All TTS backends failed for quiz.")


@router.post("/voice-quiz")
@limiter.limit("20/minute")
async def voice_quiz(request: Request, body: VoiceQuizRequest):
    try:
        groq_client = _get_groq_client()
    except AIServiceException as e:
        logger.error("groq_init_error_quiz", error=str(e))
        return JSONResponse(
            content={"success": False, "error": str(e), "data": {"audio_base64": "", "transcription": ""}},
            status_code=500,
        )
    try:
        audio_data = body.audio_base64
        if "base64," in audio_data:
            audio_data = audio_data.split("base64,")[1]
        audio_bytes = base64.b64decode(audio_data)
        tmp = tempfile.NamedTemporaryFile(suffix=".m4a", delete=False)
        tmp.write(audio_bytes)
        tmp.close()
        try:
            with open(tmp.name, "rb") as f:
                transcription = groq_client.audio.transcriptions.create(
                    model="whisper-large-v3-turbo",
                    file=("audio.m4a", f.read()),
                    language=body.langue if body.langue != "ln" else "fr",
                )
            child_answer = transcription.text.strip().lower()
        except Exception as e:
            logger.error("whisper_quiz_error", error=str(e))
            child_answer = ""
        finally:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass
        if not child_answer:
            return JSONResponse(content={
                "success": True,
                "data": {"audio_base64": "", "transcription": ""},
            })
        answer_map = {"a": 0, "b": 1, "c": 2, "d": 3, "1": 0, "2": 1, "3": 2, "4": 3}
        first_word = child_answer.split()[0] if child_answer.split() else ""
        chosen = answer_map.get(first_word[:1], -1)
        response_text = get_voice_quiz_response(
            language=body.langue,
            chosen_letter=first_word[:1].upper() if chosen >= 0 else "",
            transcription=child_answer,
            is_valid=(chosen >= 0),
        )
        try:
            audio_mp3 = await _text_to_speech(response_text, body.langue)
            audio_b64 = base64.b64encode(audio_mp3).decode("utf-8")
        except Exception as e:
            logger.error("tts_quiz_error", error=str(e))
            audio_b64 = ""
        return JSONResponse(content={
            "success": True,
            "data": {
                "audio_base64": audio_b64,
                "transcription": child_answer,
                "response": response_text,
                "chosen_index": chosen,
            },
        })
    except Exception as e:
        logger.error("voice_quiz_error", error=str(e))
        return JSONResponse(content={
            "success": True,
            "data": {"audio_base64": "", "transcription": ""},
        })


@router.post("/generate")
@limiter.limit("20/minute")
async def generate_quiz_question(
    request: Request,
    body: GenerationQuizRequete,
    quiz_service: QuizService = Depends(get_quiz_service),
):
    try:
        question = await quiz_service.generate_question(
            subject=body.sujet,
            level=body.niveau,
            language=body.langue,
            session_id=body.identifiant_session,
        )
        data = question.model_dump()
        question_audio_text = _build_question_audio_text(
            question_text=question.question,
            options=question.options,
            langue=body.langue,
        )
        try:
            audio_mp3 = await _text_to_speech(question_audio_text, body.langue)
            data["audio_base64"] = base64.b64encode(audio_mp3).decode("utf-8")
        except Exception as e:
            logger.error("quiz_tts_error", error=str(e))
            data["audio_base64"] = ""
        return JSONResponse(content={"success": True, "data": data})
    except ValidationException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)
    except AIServiceException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)


@router.post("/submit")
async def submit_quiz_answer(
    body: ReponseQuizRequete,
    quiz_service: QuizService = Depends(get_quiz_service),
):
    try:
        result = await quiz_service.validate_answer(
            question=None,
            chosen_answer=body.reponse_donnee,
            session_id=body.identifiant_session,
            child_id=body.identifiant_enfant,
            response_time_ms=body.temps_reponse_ms,
            language=body.langue,
        )
        return JSONResponse(content={"success": True, "data": result.model_dump()})
    except ValidationException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)


@router.get("/subjects")
async def get_quiz_subjects(
    language: str = Query(default="fr"),
    domain: str = Query(default="environment"),
    quiz_service: QuizService = Depends(get_quiz_service),
):
    subjects = quiz_service.get_available_subjects(language=language, domain=domain)
    return JSONResponse(content={"success": True, "data": subjects})


@router.get("/session/{session_id}")
async def get_quiz_session_stats(session_id: str, memory_repo=Depends(get_memory_repository)):
    progress = memory_repo.load_progress(session_id)
    if not progress or progress.get("quiz_completed", 0) == 0:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    stats = {
        "session_id": session_id,
        "quiz_completed": progress.get("quiz_completed", 0),
        "correct_answers": progress.get("correct_answers", 0),
        "total_points": progress.get("total_points", 0),
    }
    stats["accuracy"] = (
        round((stats["correct_answers"] / stats["quiz_completed"]) * 100, 1)
        if stats["quiz_completed"] > 0 else 0.0
    )
    return JSONResponse(content={"success": True, "data": stats})