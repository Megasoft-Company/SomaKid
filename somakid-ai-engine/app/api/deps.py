"""
SOMAKID AI Engine - Dependencies Injection
Defines FastAPI dependencies for route handlers.
"""

from typing import Optional
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials

from ..core.config import settings
from ..core.security import bearer_security, verify_jwt_token, validate_api_key, limiter
from ..services.gemini_client import GeminiClient
from ..services.vision_service import VisionService
from ..services.quiz_service import QuizService
from ..services.chat_service import ChatService
from ..services.progression_service import ProgressionService
from ..repositories.memory_repository import MemoryRepository
from ..repositories.knowledge_repository import KnowledgeRepository


_gemini_client: Optional[GeminiClient] = None
_vision_service: Optional[VisionService] = None
_quiz_service: Optional[QuizService] = None
_chat_service: Optional[ChatService] = None
_progression_service: Optional[ProgressionService] = None
_memory_repository: Optional[MemoryRepository] = None
_knowledge_repository: Optional[KnowledgeRepository] = None


def get_memory_repository() -> MemoryRepository:
    global _memory_repository
    if _memory_repository is None:
        _memory_repository = MemoryRepository(data_dir=settings.MEMORY_DIR)
    return _memory_repository


def get_knowledge_repository() -> KnowledgeRepository:
    global _knowledge_repository
    if _knowledge_repository is None:
        _knowledge_repository = KnowledgeRepository(data_dir=settings.KNOWLEDGE_DIR)
    return _knowledge_repository


def get_gemini_client() -> GeminiClient:
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient(api_key=settings.GEMINI_API_KEY, model_name=settings.GEMINI_MODEL, generation_config=settings.gemini_generation_config)
    return _gemini_client


def get_vision_service(
    memory_repo: MemoryRepository = Depends(get_memory_repository),
    knowledge_repo: KnowledgeRepository = Depends(get_knowledge_repository),
) -> VisionService:
    global _vision_service
    if _vision_service is None:
        _vision_service = VisionService(memory_repo=memory_repo, knowledge_repo=knowledge_repo)
    return _vision_service


def get_quiz_service(
    gemini_client: GeminiClient = Depends(get_gemini_client),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
) -> QuizService:
    global _quiz_service
    if _quiz_service is None:
        _quiz_service = QuizService(gemini_client=gemini_client, memory_repo=memory_repo)
    return _quiz_service


def get_chat_service(
    gemini_client: GeminiClient = Depends(get_gemini_client),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
) -> ChatService:
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService(gemini_client=gemini_client, memory_repo=memory_repo)
    return _chat_service


def get_progression_service(
    memory_repo: MemoryRepository = Depends(get_memory_repository),
) -> ProgressionService:
    global _progression_service
    if _progression_service is None:
        _progression_service = ProgressionService(memory_repo=memory_repo)
    return _progression_service


async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(bearer_security)) -> dict:
    return verify_jwt_token(credentials)


async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_security)) -> Optional[dict]:
    if credentials is None: return None
    try: return verify_jwt_token(credentials)
    except HTTPException: return None