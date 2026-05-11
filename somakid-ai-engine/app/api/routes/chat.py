"""
SOMAKID AI Engine - Chat Routes 
"""

from typing import Optional, List
import asyncio
import base64
import io
import tempfile
import os
import time

try:
    from dotenv import load_dotenv
    _dir = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):
        _candidate = os.path.join(_dir, ".env")
        if os.path.exists(_candidate):
            load_dotenv(_candidate, override=False)
            break
        _dir = os.path.dirname(_dir)
except ImportError:
    pass

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..deps import get_chat_service, get_memory_repository
from ...services.chat_service import ChatService
from ...repositories.memory_repository import MemoryRepository
from ...core.exceptions import ValidationException, AIServiceException
from ...core.logging_config import get_logger
from ...core.security import limiter
from ...utils.prompts import get_voice_system_prompt, get_voice_fallback

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


def _get_groq_client():
    from groq import Groq
    key = os.environ.get("GROQ_API_KEY", "").strip()
    if not key:
        raise AIServiceException(
            "GROQ_API_KEY is not set. Check your .env file "
            "and ensure python-dotenv is installed (pip install python-dotenv)."
        )
    return Groq(api_key=key)


class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    langue: str = Field(default="fr")
    identifiant_session: str = Field(default="")
    session_id: Optional[str] = Field(default=None)
    historique: Optional[List[dict]] = Field(default=[])
    history: Optional[List[dict]] = Field(default=[])


class VoiceChatRequest(BaseModel):
    audio_base64: str = Field(min_length=100)
    langue: str = Field(default="fr")
    identifiant_session: str = Field(default="voice_session")


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    langue: str = Field(default="fr")


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
    audio_bytes = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes += chunk["data"]
    return audio_bytes


async def _gtts(text: str, langue: str) -> bytes:
    """gTTS fallback if both ElevenLabs and Edge TTS fail."""
    from gtts import gTTS
    lang_map = {"fr": "fr", "ln": "fr", "sw": "sw", "en": "en"}
    clean_text = text.replace(". ", ".   ").replace("? ", "?   ").replace(", ", ",  ")
    mp3_buffer = io.BytesIO()
    tts = gTTS(text=clean_text, lang=lang_map.get(langue, "fr"), slow=True)
    tts.write_to_fp(mp3_buffer)
    mp3_buffer.seek(0)
    return mp3_buffer.read()


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
        logger.warning("edge_tts_fallback", error=str(e))
        return await _gtts(normalized_text, langue)


HISTORY_KEY_PREFIX = "voice_history:"
MAX_STORED_MESSAGES = 100


def _load_voice_history(memory_repo: MemoryRepository, session_id: str) -> List[dict]:
    try:
        data = memory_repo.load_progress(f"{HISTORY_KEY_PREFIX}{session_id}")
        return data.get("messages", [])
    except Exception:
        return []


def _save_voice_history(
    memory_repo: MemoryRepository,
    session_id: str,
    messages: List[dict],
) -> None:
    try:
        memory_repo.save_progress(
            f"{HISTORY_KEY_PREFIX}{session_id}",
            {"messages": messages[-MAX_STORED_MESSAGES:], "updated_at": time.time()},
        )
    except Exception as e:
        logger.error("save_voice_history_error", error=str(e))


@router.post("/voice-chat")
@limiter.limit("20/minute")
async def voice_chat(
    request: Request,
    body: VoiceChatRequest,
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    session_id = body.identifiant_session or "voice_default"

    try:
        groq_client = _get_groq_client()
    except AIServiceException as e:
        logger.error("groq_init_error", error=str(e))
        return JSONResponse(
            content={"success": False, "error": str(e), "data": {"audio_base64": ""}},
            status_code=500,
        )

    try:
        audio_data = body.audio_base64
        if "base64," in audio_data:
            audio_data = audio_data.split("base64,")[1]
        try:
            audio_bytes = base64.b64decode(audio_data)
        except Exception:
            return JSONResponse(
                content={"success": False, "error": "Invalid base64 audio.", "data": {"audio_base64": ""}},
                status_code=400,
            )

        tmp = tempfile.NamedTemporaryFile(suffix=".m4a", delete=False)
        tmp.write(audio_bytes)
        tmp.close()
        try:
            with open(tmp.name, "rb") as f:
                transcription_resp = groq_client.audio.transcriptions.create(
                    model="whisper-large-v3-turbo",
                    file=("audio.m4a", f.read()),
                    language=body.langue if body.langue != "ln" else "fr",
                )
            child_text = transcription_resp.text.strip()
        except Exception as e:
            logger.error("whisper_error", error=str(e))
            child_text = ""
        finally:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass

        if not child_text or len(child_text) < 2:
            return JSONResponse(content={
                "success": True,
                "data": {"audio_base64": "", "transcription": "", "message": "Audio too short."},
            })

        logger.info("whisper_ok", text=child_text[:80], session=session_id)

        history = _load_voice_history(memory_repo, session_id)

        system_prompt = get_voice_system_prompt(body.langue)

        api_messages = [{"role": "system", "content": system_prompt}]
        for msg in history[-12:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                api_messages.append({"role": role, "content": content})
        api_messages.append({"role": "user", "content": child_text})

        try:
            chat_resp = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=api_messages,
                max_tokens=150,
                temperature=0.7,
            )
            soma_text = chat_resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error("llama_error", error=str(e))
            soma_text = ""

        if not soma_text:
            soma_text = get_voice_fallback(body.langue)

        history.append({"role": "user", "content": child_text})
        history.append({"role": "assistant", "content": soma_text})
        asyncio.create_task(asyncio.to_thread(_save_voice_history, memory_repo, session_id, history))

        try:
            audio_mp3 = await _text_to_speech(soma_text, body.langue)
        except Exception as e:
            logger.error("tts_error", error=str(e))
            audio_mp3 = b""

        return JSONResponse(content={
            "success": True,
            "data": {
                "audio_base64": base64.b64encode(audio_mp3).decode("utf-8") if audio_mp3 else "",
                "transcription": child_text,
                "soma_response": soma_text,
                "history_length": len(history) // 2,
            },
        })

    except Exception as e:
        logger.error("voice_chat_error", error=str(e))
        return JSONResponse(content={"success": True, "data": {"audio_base64": "", "transcription": ""}})


@router.post("/message")
@limiter.limit("30/minute")
async def send_message(
    request: Request,
    body: ChatMessageRequest,
    chat_service: ChatService = Depends(get_chat_service),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    try:
        session_id = body.identifiant_session or body.session_id or f"session_{int(time.time())}"
        if not body.message or not body.message.strip():
            raise HTTPException(status_code=422, detail="Message cannot be empty.")

        history = body.historique or body.history or []
        if not history and session_id:
            try:
                stored = memory_repo.load_progress(f"chat_history:{session_id}")
                history = stored.get("messages", [])
            except Exception:
                history = []

        response, updated_history = await chat_service.send_message(
            message=body.message.strip(),
            language=body.langue,
            session_id=session_id,
            conversation_history=history,
        )

        asyncio.create_task(asyncio.to_thread(
            memory_repo.save_progress,
            f"chat_history:{session_id}",
            {"messages": updated_history[-MAX_STORED_MESSAGES:], "updated_at": time.time()},
        ))

        return JSONResponse(content={
            "success": True,
            "data": response.model_dump(),
            "history_length": len(updated_history),
            "session_id": session_id,
        })

    except ValidationException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)
    except AIServiceException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)


@router.post("/tts")
@limiter.limit("30/minute")
async def text_to_speech(request: Request, body: TTSRequest):
    try:
        audio_mp3 = await _text_to_speech(body.text, body.langue)
        return JSONResponse(content={
            "success": True,
            "data": {"audio_base64": base64.b64encode(audio_mp3).decode("utf-8"), "langue": body.langue},
        })
    except Exception as e:
        logger.error("tts_error", error=str(e))
        return JSONResponse(content={"success": False, "data": {"audio_base64": ""}}, status_code=500)


@router.post("/session/create")
async def create_chat_session(
    child_id: Optional[str] = None,
    chat_service: ChatService = Depends(get_chat_service),
):
    session_id = chat_service.create_session(child_id=child_id)
    return JSONResponse(
        content={"success": True, "data": {"session_id": session_id, "child_id": child_id}},
        status_code=201,
    )


@router.get("/session/{session_id}")
async def get_chat_history(
    session_id: str,
    limit: int = 50,
    chat_service: ChatService = Depends(get_chat_service),
):
    try:
        history = chat_service.get_conversation_history(session_id=session_id, limit=limit)
        if not history:
            raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
        return JSONResponse(content={
            "success": True,
            "data": {"session_id": session_id, "messages": history, "total_messages": len(history)},
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_history_error", error=str(e))
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")


@router.get("/session/{session_id}/voice-history")
async def get_voice_history(
    session_id: str,
    limit: int = 50,
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    try:
        messages = _load_voice_history(memory_repo, session_id)
        if not messages:
            raise HTTPException(status_code=404, detail=f"Voice history '{session_id}' not found.")
        return JSONResponse(content={
            "success": True,
            "data": {"session_id": session_id, "messages": messages[-limit:], "total_messages": len(messages) // 2},
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_voice_history_error", error=str(e))
        raise HTTPException(status_code=404, detail="Voice history not found.")