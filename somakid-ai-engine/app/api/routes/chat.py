"""
SOMAKID AI Engine - Chat Routes 
"""

from typing import Optional, List
import asyncio
import base64
import io
import json
import re
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


def _sanitize_for_tts(text: str) -> str:
    """Clean text for TTS: remove URLs, XML/SSML tags, special characters, and normalize."""
    if not text:
        return ""
    # Supprimer les URLs
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'www\.\S+', '', text)
    # Supprimer toutes les balises HTML/XML/SSML (ex: <speak>, <break time="..."/>, <voice>, etc.)
    text = re.sub(r'<[^>]*>', '', text)
    text = text.replace('<', '').replace('>', '')
    # Supprimer les blocs de code
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
    text = text.replace('`', '')
    # Supprimer les accolades et crochets résiduels
    text = re.sub(r'\{[^}]*\}', '', text)
    text = re.sub(r'\[[^\]]*\]', '', text)
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


def _extract_plain_text(raw: str) -> str:
    """Extract only natural language text from AI response, removing JSON, code, and markdown."""
    if not raw:
        return ""
    text = raw.strip()
    if text.startswith("{"):
        try:
            data = json.loads(text)
            for key in ("reponse", "response", "soma_response", "message", "content"):
                val = data.get(key, "")
                if val and isinstance(val, str) and val.strip():
                    return val.strip()
        except json.JSONDecodeError:
            match = re.search(r'"reponse"\s*:\s*"([^"]+)"', text)
            if match:
                return match.group(1).strip()
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL).strip()
    text = re.sub(r'"[a-z_]+"\s*:\s*"', '', text)
    text = text.replace('```', '').strip()
    text = text.replace('{', '').replace('}', '').strip()
    return text


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
    domain: str = Field(default="environment", description="'environment' or 'health' — selects the SOMA persona")


class VoiceChatRequest(BaseModel):
    audio_base64: str = Field(min_length=100)
    langue: str = Field(default="fr")
    identifiant_session: str = Field(default="voice_session")


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    langue: str = Field(default="fr")


async def _gtts(text: str, langue: str) -> bytes:
    """Primary TTS via gTTS (no SSML, reliable, multilingual)."""
    from gtts import gTTS
    lang_map = {"fr": "fr", "ln": "fr", "sw": "sw", "en": "en"}
    # Légère pause naturelle via espaces supplémentaires
    clean_text = text.replace(". ", ".   ").replace("? ", "?   ").replace(", ", ",  ")
    mp3_buffer = io.BytesIO()
    tts = gTTS(text=clean_text, lang=lang_map.get(langue, "fr"), slow=False)
    tts.write_to_fp(mp3_buffer)
    mp3_buffer.seek(0)
    return mp3_buffer.read()


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
    # Pas de SSML : on passe le texte brut directement
    communicate = edge_tts.Communicate(text, voice)
    audio_bytes = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes += chunk["data"]
    return audio_bytes


async def _text_to_speech(text: str, langue: str) -> bytes:
    """
    Pipeline TTS unifié :
    1. Extraire uniquement le texte naturel
    2. Normaliser la phonétique pour les langues africaines
    3. Nettoyer URLs, balises XML/SSML, caractères spéciaux
    4. gtts en priorité → edge_tts en fallback
    """
    # Étape 1 : extraire le texte naturel
    plain_text = _extract_plain_text(text)
    # Étape 2 : normaliser la phonétique
    normalized_text = _normalize_phonetic(plain_text, langue)
    # Étape 3 : nettoyer pour TTS
    clean_text = _sanitize_for_tts(normalized_text)

    logger.info("TTS_INPUT_TEXT", text=clean_text[:300], langue=langue)

    if not clean_text:
        logger.warning("TTS_EMPTY_TEXT")
        clean_text = "Désolé, je n'ai pas pu générer de réponse vocale."

    # Étape 4 : gtts en priorité, edge_tts en fallback
    try:
        return await _gtts(clean_text, langue)
    except Exception as e:
        logger.warning("gtts_failed_falling_back_to_edge", error=str(e))
        return await _edge_tts_fallback(clean_text, langue)


HISTORY_KEY_PREFIX = "voice_history:"
MAX_STORED_MESSAGES = 100


def _load_voice_history(memory_repo: MemoryRepository, session_id: str) -> List[dict]:
    try:
        data = memory_repo.load_progress(f"{HISTORY_KEY_PREFIX}{session_id}")
        return data.get("messages", [])
    except Exception:
        return []


def _save_voice_history(memory_repo: MemoryRepository, session_id: str, messages: List[dict]) -> None:
    try:
        memory_repo.save_progress(
            f"{HISTORY_KEY_PREFIX}{session_id}",
            {"messages": messages[-MAX_STORED_MESSAGES:], "updated_at": time.time()},
        )
    except Exception as e:
        logger.error("save_voice_history_error", error=str(e))


@router.post("/voice-chat")
@limiter.limit("20/minute")
async def voice_chat(request: Request, body: VoiceChatRequest, memory_repo: MemoryRepository = Depends(get_memory_repository)):
    session_id = body.identifiant_session or "voice_default"
    try:
        groq_client = _get_groq_client()
    except AIServiceException as e:
        logger.error("groq_init_error", error=str(e))
        return JSONResponse(content={"success": False, "error": str(e), "data": {"audio_base64": ""}}, status_code=500)
    try:
        audio_data = body.audio_base64
        if "base64," in audio_data:
            audio_data = audio_data.split("base64,")[1]
        try:
            audio_bytes = base64.b64decode(audio_data)
        except Exception:
            return JSONResponse(content={"success": False, "error": "Invalid base64 audio.", "data": {"audio_base64": ""}}, status_code=400)
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
            return JSONResponse(content={"success": True, "data": {"audio_base64": "", "transcription": "", "message": "Audio too short."}})
        logger.info("whisper_ok", text=child_text[:80], session=session_id)
        history = _load_voice_history(memory_repo, session_id)
        system_prompt = get_voice_system_prompt(body.langue)
        api_messages = [{"role": "system", "content": system_prompt}]
        for msg in history[-12:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                clean_content = _extract_plain_text(content) if role == "assistant" else content
                api_messages.append({"role": role, "content": clean_content})
        api_messages.append({"role": "user", "content": child_text})
        try:
            chat_resp = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=api_messages,
                max_tokens=150,
                temperature=0.7,
            )
            raw_soma = chat_resp.choices[0].message.content
            soma_text = _extract_plain_text(raw_soma)
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
async def send_message(request: Request, body: ChatMessageRequest, chat_service: ChatService = Depends(get_chat_service), memory_repo: MemoryRepository = Depends(get_memory_repository)):
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
            domain=body.domain,
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
async def create_chat_session(child_id: Optional[str] = None, chat_service: ChatService = Depends(get_chat_service)):
    session_id = chat_service.create_session(child_id=child_id)
    return JSONResponse(content={"success": True, "data": {"session_id": session_id, "child_id": child_id}}, status_code=201)


@router.get("/session/{session_id}")
async def get_chat_history(session_id: str, limit: int = 50, chat_service: ChatService = Depends(get_chat_service)):
    try:
        history = chat_service.get_conversation_history(session_id=session_id, limit=limit)
        if not history:
            raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
        return JSONResponse(content={"success": True, "data": {"session_id": session_id, "messages": history, "total_messages": len(history)}})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_history_error", error=str(e))
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")


@router.get("/session/{session_id}/voice-history")
async def get_voice_history(session_id: str, limit: int = 50, memory_repo: MemoryRepository = Depends(get_memory_repository)):
    try:
        messages = _load_voice_history(memory_repo, session_id)
        if not messages:
            raise HTTPException(status_code=404, detail=f"Voice history '{session_id}' not found.")
        return JSONResponse(content={"success": True, "data": {"session_id": session_id, "messages": messages[-limit:], "total_messages": len(messages) // 2}})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_voice_history_error", error=str(e))
        raise HTTPException(status_code=404, detail="Voice history not found.")