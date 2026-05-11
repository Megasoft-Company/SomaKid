"""
SOMAKID AI Engine - Chat Service
Orchestrates interactive conversations with the SOMA AI tutor.

Speed optimizations:
- MAX_HISTORY_MESSAGES reduced to 6 (shorter prompt → faster Gemini response)
- Simplified history normalization (single loop)
- Session save no longer blocks the response (fire-and-forget via asyncio.create_task)
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone

from ..core.config import settings
from ..core.exceptions import (
    ValidationException,
    AIServiceException,
    UnsupportedLanguageException,
)
from ..core.security import sanitize_child_text, validate_supported_language, validate_child_age
from ..core.logging_config import get_logger, log_error
from ..models.schemas import ChatReponse
from ..utils.prompts import (
    get_chat_prompt,
    get_fallback_chat_response,
    detect_message_type,
)
from ..utils.helpers import generate_short_id
from .gemini_client import GeminiClient
from ..repositories.memory_repository import MemoryRepository

logger = get_logger(__name__)

SUPPORTED_LANGUAGES = {"fr", "ln", "sw", "en"}

LANGUAGE_HINTS = {
    "ln": [
        "mbote", "nazali", "ozali", "azali", "biso", "bango", "nini",
        "ndenge", "mpo", "na", "ya", "lokola", "soki", "oyo", "kaka",
        "mwana", "bana", "nzete", "mama", "baba", "eloko", "ezali",
        "koteya", "koteka", "koloba", "masolo", "likambo",
    ],
    "sw": [
        "habari", "mambo", "nzuri", "sawa", "asante", "tafadhali",
        "kwaheri", "nina", "una", "ana", "wana", "kwa", "ya", "ni",
        "mimi", "wewe", "yeye", "sisi", "nyinyi", "wao", "mti", "maji",
        "chakula", "shule", "nyumba", "ndio", "hapana", "ndiyo",
    ],
    "fr": [
        "bonjour", "salut", "merci", "comment", "pourquoi", "parce",
        "est-ce", "qu'est", "les", "des", "une", "le", "la", "je",
        "tu", "il", "elle", "nous", "vous", "ils", "elles", "que",
        "qui", "où", "quand", "très", "bien", "aussi", "mais", "donc",
    ],
}


def detect_language_from_text(text: str, declared_language: str = "fr") -> str:
    """Detect the language of a given text based on keyword hints."""
    if not text:
        return declared_language

    text_lower = text.lower()
    words = set(text_lower.split())
    scores: Dict[str, int] = {lang: 0 for lang in LANGUAGE_HINTS}

    for lang, hints in LANGUAGE_HINTS.items():
        for hint in hints:
            if hint in words or hint in text_lower:
                scores[lang] += 1

    best_lang = max(scores, key=scores.__getitem__)
    if scores[best_lang] >= 2:
        return best_lang

    return declared_language if declared_language in SUPPORTED_LANGUAGES else "fr"


class ChatService:
    # Reduced from 10 → 6: shorter prompt = faster Gemini response
    MAX_HISTORY_MESSAGES = 6

    def __init__(
        self,
        gemini_client: GeminiClient,
        memory_repo: MemoryRepository,
    ):
        self.gemini = gemini_client
        self.memory = memory_repo
        logger.info("chat_service_initialized")

    async def send_message(
        self,
        message: str,
        language: str = "fr",
        session_id: str = "",
        child_age: int = 8,
        child_id: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Tuple[ChatReponse, List[Dict[str, str]]]:
        """Process a child's message and return the AI tutor's response."""
        self._validate_inputs(message, language, child_age)

        clean_message = sanitize_child_text(message, max_length=500)
        if not clean_message:
            raise ValidationException("The message is empty after sanitization.")

        detected_language = detect_language_from_text(clean_message, language)
        message_type = detect_message_type(clean_message)

        logger.info(
            "message_analysis",
            declared_language=language,
            detected_language=detected_language,
            message_type=message_type,
        )

        # Load history only when needed
        history: List[Dict[str, str]] = conversation_history or []
        if session_id and not history:
            history = self._load_history(session_id)

        # Normalize in a single pass
        normalized_history: List[Dict[str, str]] = [
            {
                "role": m.get("role", "user"),
                "content": m.get("content") or m.get("contenu", ""),
            }
            for m in history
        ]

        # Use the language parameter in the prompt
        prompt = get_chat_prompt(
            language=language,
            child_age=child_age,
            conversation_history=normalized_history[-self.MAX_HISTORY_MESSAGES:],
            message_type=message_type,
        )
        full_prompt = f'{prompt}\n\nThe child says: "{clean_message}"'

        try:
            raw_response = await self.gemini.generate_text(prompt=full_prompt)
            response_data = self.gemini.extract_json_from_response(raw_response)
        except AIServiceException:
            logger.warning("chat_generation_failed_using_fallback")
            response_data = get_fallback_chat_response(language, "chat_error")

        soma_response = self._build_response(response_data)
        updated_history = self._update_history(
            normalized_history, clean_message, soma_response.reponse
        )

        # Fire-and-forget: don't await the DB write — it must not slow the response
        if session_id:
            import asyncio
            asyncio.create_task(
                self._save_conversation_async(session_id, child_id, updated_history)
            )

        logger.info(
            "chat_message_processed",
            session_id=session_id,
            language=language,
            message_type=message_type,
        )
        return soma_response, updated_history

    # ── Session helpers ─────────────────────────────────────────────────────

    def create_session(self, child_id: Optional[str] = None) -> str:
        """Create a new chat session and return the session ID."""
        session_id = f"soma_{generate_short_id('chat')}"
        self.memory.save_progress(session_id, {
            "session_id": session_id,
            "child_id": child_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "messages": [],
            "total_messages": 0,
        })
        logger.info("chat_session_created", session_id=session_id)
        return session_id

    def get_conversation_history(
        self,
        session_id: str,
        limit: int = 50,
    ) -> List[Dict[str, str]]:
        """Retrieve conversation history for a given session."""
        session_data = self.memory.load_progress(session_id)
        return session_data.get("messages", [])[-limit:]

    def get_quick_questions(self, language: str = "fr") -> List[str]:
        """Return a list of quick-start questions for the given language."""
        questions = {
            "fr": [
                "Qu'est-ce que le changement climatique ?",
                "Comment protéger les animaux ?",
                "Pourquoi les arbres sont-ils importants ?",
                "Qu'est-ce qu'un écosystème ?",
                "Comment économiser l'eau ?",
            ],
            "en": [
                "What is climate change?",
                "How to protect animals?",
                "Why are trees important?",
                "What is an ecosystem?",
                "How to save water?",
            ],
            "ln": [
                "Changement climatique ezali nini ?",
                "Ndenge nini tokoki kobatela banyama ?",
                "Mpo na nini banzete ezali na ntina ?",
                "Ekosisteme ezali nini ?",
                "Ndenge nini tokoki kobatela mai ?",
            ],
            "sw": [
                "Mabadiliko ya hali ya hewa ni nini ?",
                "Jinsi gani tunaweza kuwalinda wanyama ?",
                "Kwa nini miti ni muhimu ?",
                "Mfumo ikolojia ni nini ?",
                "Jinsi gani tunaweza kuokoa maji ?",
            ],
        }
        return questions.get(language, questions["fr"])

    # ── Private helpers ──────────────────────────────────────────────────────

    def _validate_inputs(self, message: str, language: str, child_age: int) -> None:
        """Validate input parameters before processing."""
        if not message or not message.strip():
            raise ValidationException("The message cannot be empty.")
        if len(message) > 1000:
            raise ValidationException("Message too long. Maximum 1000 characters.")
        if not validate_child_age(child_age):
            raise ValidationException(
                f"Age must be between {settings.CHILD_MIN_AGE} and {settings.CHILD_MAX_AGE}."
            )

    def _load_history(self, session_id: str) -> List[Dict[str, str]]:
        """Load conversation history from memory repository."""
        try:
            return self.memory.load_progress(session_id).get("messages", [])
        except Exception:
            return []

    def _build_response(self, data: Dict[str, Any]) -> ChatReponse:
        """Build a ChatReponse object from raw response data."""
        main_response = data.get("reponse", data.get("response", ""))
        if not main_response:
            main_response = "I'm thinking..."
        follow_up = data.get("question_suivi", data.get("follow_up_question"))
        if follow_up and not follow_up.strip():
            follow_up = None
        return ChatReponse(
            reponse=main_response,
            suggestion_activite=data.get("suggestion_activite"),
            points_gagnes=data.get("points_gagnes", 5),
            badge_debloque=data.get("badge_debloque"),
            question_suivi=follow_up,
        )

    def _update_history(
        self,
        history: List[Dict[str, str]],
        user_message: str,
        assistant_response: str,
    ) -> List[Dict[str, str]]:
        """Append user and assistant messages to the conversation history."""
        updated = history[-48:]  # keep at most 48 before adding 2
        updated = updated + [
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": assistant_response},
        ]
        return updated

    async def _save_conversation_async(
        self,
        session_id: str,
        child_id: Optional[str],
        history: List[Dict[str, str]],
    ) -> None:
        """Non-blocking save — called via asyncio.create_task."""
        try:
            session_data = self.memory.load_progress(session_id)
            updated_data = {
                **session_data,
                "messages": history,
                "total_messages": len(history) // 2,
                "last_activity": datetime.now(timezone.utc).isoformat(),
            }
            if child_id:
                updated_data["child_id"] = child_id
            self.memory.save_progress(session_id, updated_data)
        except Exception as e:
            log_error(logger, "Failed to save conversation", exception=e)