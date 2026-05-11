"""
SOMAKID AI Engine - Quiz Routes (Full Multilingual)
- Groq API key from environment variable
- Fallback TTS if Groq unavailable
- Voice quiz pipeline with multilingual support
- Question/Option labels translated per language
"""

from typing import Optional, List
import base64
import tempfile
import os

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

# Multilingual labels for audio generation
_AUDIO_LABELS = {
    "fr": {"question": "Question", "option": "Option"},
    "en": {"question": "Question", "option": "Option"},
    "ln": {"question": "Motuna", "option": "Eyano"},
    "sw": {"question": "Swali", "option": "Chaguo"},
}


def _get_groq_client():
    """Instantiate Groq client with key from environment."""
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


async def _gtts_fallback(text: str, langue: str) -> bytes:
    """gTTS fallback if Edge TTS fails."""
    from gtts import gTTS
    import io
    lang_map = {"fr": "fr", "ln": "fr", "sw": "sw", "en": "en"}
    buf = io.BytesIO()
    gTTS(text=text, lang=lang_map.get(langue, "fr"), slow=False).write_to_fp(buf)
    buf.seek(0)
    return buf.read()


async def _tts(text: str, langue: str) -> bytes:
    try:
        return await _edge_tts(text, langue)
    except Exception as e:
        logger.warning("edge_tts_fallback_quiz", error=str(e))
        return await _gtts_fallback(text, langue)


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

        answer_map = {
            "a": 0, "b": 1, "c": 2, "d": 3,
            "1": 0, "2": 1, "3": 2, "4": 3,
        }

        first_word = child_answer.split()[0] if child_answer.split() else ""
        chosen = answer_map.get(first_word[:1], -1)

        response_text = get_voice_quiz_response(
            language=body.langue,
            chosen_letter=first_word[:1].upper() if chosen >= 0 else "",
            transcription=child_answer,
            is_valid=(chosen >= 0),
        )

        try:
            audio_mp3 = await _tts(response_text, body.langue)
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

        # Get translated labels
        labels = _AUDIO_LABELS.get(body.langue, _AUDIO_LABELS["fr"])
        question_label = labels["question"]
        option_label = labels["option"]

        # Build audio text with translated labels
        option_texts = " ".join(
            f"{option_label} {letter} : {text}"
            for letter, text in zip(["A", "B", "C", "D"], question.options)
            if text
        )
        question_audio_text = f"{question_label}. {question.question}. {option_texts}."
        try:
            audio_mp3 = await _tts(question_audio_text, body.langue)
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
    """Submit a quiz answer for validation."""
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
    quiz_service: QuizService = Depends(get_quiz_service),
):
    """Get available quiz subjects in the requested language."""
    subjects = quiz_service.get_available_subjects(language=language)
    return JSONResponse(content={"success": True, "data": subjects})


@router.get("/session/{session_id}")
async def get_quiz_session_stats(session_id: str, memory_repo=Depends(get_memory_repository)):
    """Get statistics for a quiz session."""
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