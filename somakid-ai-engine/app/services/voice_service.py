"""
SOMAKID AI Engine - Voice Service
Orchestrates text-to-speech and speech-to-text functionality.
Uses Groq Whisper for STT and Edge TTS for synthesis.
"""

import base64
import os
import tempfile
from typing import Optional, Dict, Any, Tuple

from ..core.config import settings
from ..core.exceptions import ValidationException, AIServiceException, UnsupportedLanguageException
from ..core.logging_config import get_logger, log_performance, log_error
from ..core.security import validate_supported_language

logger = get_logger(__name__)

# Clé API chargée depuis les variables d'environnement
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


class VoiceService:
    SUPPORTED_FORMATS = {"mp3", "wav", "ogg", "webm"}

    def __init__(self):
        if not GROQ_API_KEY:
            logger.warning("GROQ_API_KEY not set - speech recognition will fail")
        logger.info("voice_service_initialized")

    async def synthesize_speech(self, text: str, language: str = "fr", speed: float = 1.0) -> Tuple[bytes, str, float]:
        self._validate_tts_inputs(text, language, speed)
        try:
            import edge_tts
            voice_map = {
                "fr": "fr-FR-DeniseNeural",
                "ln": "fr-FR-DeniseNeural",
                "sw": "sw-KE-RehemaNeural",
                "en": "en-US-AriaNeural"
            }
            voice = voice_map.get(language, "fr-FR-DeniseNeural")
            communicate = edge_tts.Communicate(text, voice)
            audio_bytes = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_bytes += chunk["data"]
            duration = len(text) * 0.06
            logger.info("speech_synthesis_complete", language=language, text_length=len(text))
            return audio_bytes, "audio/mp3", duration
        except Exception as e:
            log_error(logger, "Speech synthesis failed", exception=e)
            raise AIServiceException(f"Speech synthesis failed: {str(e)}")

    async def recognize_speech(self, audio_base64: str, language: str = "fr", session_id: str = "") -> Dict[str, Any]:
        if not audio_base64 or len(audio_base64) < 100:
            raise ValidationException("Audio data is too short or empty.")
        if not validate_supported_language(language):
            raise UnsupportedLanguageException(f"Language '{language}' is not supported.")

        try:
            if "base64," in audio_base64:
                audio_base64 = audio_base64.split("base64,")[1]
            audio_bytes = base64.b64decode(audio_base64)
        except Exception:
            raise ValidationException("Invalid base64 audio data.")

        try:
            from groq import Groq
            groq_client = Groq(api_key=GROQ_API_KEY)

            tmp = tempfile.NamedTemporaryFile(suffix=".m4a", delete=False)
            tmp.write(audio_bytes)
            tmp.close()

            with open(tmp.name, "rb") as f:
                transcription = groq_client.audio.transcriptions.create(
                    model="whisper-large-v3-turbo",
                    file=("audio.m4a", f.read()),
                    language=language if language != "ln" else "fr",
                )
            os.unlink(tmp.name)

            text = transcription.text.strip()
            if not text:
                text = ""

            logger.info("speech_recognition_complete", language=language, transcribed_length=len(text))

            return {
                "text": text,
                "confidence": 0.95,
                "detected_language": language,
                "processing_time_ms": 0,
                "session_id": session_id
            }

        except Exception as e:
            log_error(logger, "Speech recognition failed", exception=e)
            raise AIServiceException(f"Speech recognition failed: {str(e)}")

    def get_available_voices(self, language: Optional[str] = None) -> list:
        voices = {
            "fr": {"language": "fr", "voice_name": "Denise", "gender": "Female"},
            "ln": {"language": "ln", "voice_name": "Denise (French)", "gender": "Female"},
            "sw": {"language": "sw", "voice_name": "Rehema", "gender": "Female"},
            "en": {"language": "en", "voice_name": "Aria", "gender": "Female"}
        }
        if language:
            return [voices[language]] if language in voices else []
        return list(voices.values())

    def get_supported_languages(self) -> list:
        return [
            {"code": "fr", "name": "French", "voice_count": 4},
            {"code": "ln", "name": "Lingala", "voice_count": 1},
            {"code": "sw", "name": "Swahili", "voice_count": 2}
        ]

    def _validate_tts_inputs(self, text: str, language: str, speed: float) -> None:
        if not text or not text.strip():
            raise ValidationException("Text cannot be empty.")
        if len(text) > 5000:
            raise ValidationException("Text too long. Maximum 5000 characters.")
        if not validate_supported_language(language):
            raise UnsupportedLanguageException(f"Language '{language}' is not supported.")
        if not 0.5 <= speed <= 2.0:
            raise ValidationException("Speed must be between 0.5 and 2.0.")