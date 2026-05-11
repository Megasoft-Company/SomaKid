"""
SOMAKID AI Engine - Test Fixtures and Configuration
Provides shared fixtures for all test modules.
"""

import pytest
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock

from app.core.config import Settings
from app.services.gemini_client import GeminiClient
from app.services.vision_service import VisionService
from app.services.quiz_service import QuizService
from app.services.chat_service import ChatService
from app.services.progression_service import ProgressionService
from app.repositories.memory_repository import MemoryRepository
from app.repositories.knowledge_repository import KnowledgeRepository


# =============================================================================
# Test Settings
# =============================================================================

@pytest.fixture
def test_settings() -> Settings:
    """Create test settings with overridden values."""
    return Settings(
        ENVIRONMENT="development",
        DEBUG=True,
        LOG_LEVEL="DEBUG",
        GEMINI_API_KEY="test_api_key",
        GEMINI_MODEL="gemini-2.5-flash-lite",
        REDIS_URL="redis://localhost:6379/0",
        DATABASE_URL=None,
        SECRET_KEY="test_secret_key_for_testing_purposes_only",
        SUPPORTED_LANGUAGES="fr,ln,sw",
        DEFAULT_LANGUAGE="fr",
    )


# =============================================================================
# Mock Fixtures
# =============================================================================

@pytest.fixture
def mock_gemini_client():
    """Create a mock Gemini client for testing."""
    mock = MagicMock(spec=GeminiClient)
    mock.generate_text = AsyncMock(return_value='{"response": "test"}')
    mock.generate_with_image = AsyncMock(return_value='{"espece": "test species"}')
    mock.extract_json_from_response.return_value = {"espece": "test species"}
    mock.health_check = AsyncMock(return_value={"status": "healthy"})
    return mock


@pytest.fixture
def mock_memory_repository(tmp_path):
    """Create a mock memory repository with temporary directory."""
    repo = MemoryRepository(data_dir=tmp_path / "memory")
    return repo


@pytest.fixture
def mock_knowledge_repository(tmp_path):
    """Create a mock knowledge repository with temporary directory."""
    repo = KnowledgeRepository(data_dir=tmp_path / "knowledge")
    return repo


# =============================================================================
# Service Fixtures
# =============================================================================

@pytest.fixture
def vision_service(mock_gemini_client, mock_memory_repository, mock_knowledge_repository):
    """Create a vision service with mock dependencies."""
    return VisionService(
        gemini_client=mock_gemini_client,
        memory_repo=mock_memory_repository,
        knowledge_repo=mock_knowledge_repository,
    )


@pytest.fixture
def quiz_service(mock_gemini_client, mock_memory_repository):
    """Create a quiz service with mock dependencies."""
    return QuizService(
        gemini_client=mock_gemini_client,
        memory_repo=mock_memory_repository,
    )


@pytest.fixture
def chat_service(mock_gemini_client, mock_memory_repository):
    """Create a chat service with mock dependencies."""
    return ChatService(
        gemini_client=mock_gemini_client,
        memory_repo=mock_memory_repository,
    )


@pytest.fixture
def progression_service(mock_memory_repository):
    """Create a progression service with mock dependencies."""
    return ProgressionService(
        memory_repo=mock_memory_repository,
    )


# =============================================================================
# Test Data Fixtures
# =============================================================================

@pytest.fixture
def sample_image_bytes():
    """Create minimal valid JPEG bytes for testing."""
    from io import BytesIO
    from PIL import Image

    img = Image.new("RGB", (100, 100), color="green")
    buffer = BytesIO()
    img.save(buffer, format="JPEG")
    return buffer.getvalue()


@pytest.fixture
def sample_analysis_result():
    """Sample species analysis result."""
    return {
        "espece": "African Elephant",
        "nom_local": "Nzoku",
        "categorie": "animal",
        "description_enfant": "The largest land animal on Earth!",
        "role_ecologique": "Creates forest corridors and spreads seeds.",
        "fait_amusant": "Elephants can communicate through the ground!",
        "menaces": "Poaching and habitat loss",
        "action_enfant": "Help protect elephant habitats.",
        "emoji": "🐘🌍",
        "niveau_danger": "moderate",
        "conseils_securite": "Observe elephants from a safe distance.",
        "points_gagnes": 10,
        "titre_gardien": "Elephant Guardian",
    }


@pytest.fixture
def sample_quiz_question():
    """Sample quiz question data."""
    return {
        "question": "What is the largest tree in Africa?",
        "options": ["Baobab", "Oak", "Fir", "Palm"],
        "reponse_correcte": 0,
        "explication": "The Baobab is Africa's giant tree!",
        "fait_bonus": "It can live over 2000 years.",
        "points": 10,
        "emoji_sujet": "🌿",
        "message_felicitations": "Well done!",
        "conseil_pratique": "Plant a tree today.",
    }


@pytest.fixture
def sample_session_id():
    """Sample session ID for testing."""
    return "session_test_12345678"


@pytest.fixture
def sample_child_data():
    """Sample child profile data."""
    return {
        "first_name": "TestChild",
        "age": 8,
        "avatar": "🦁",
        "pin_code": "1234",
        "language": "fr",
    }


# =============================================================================
# Async Test Helpers
# =============================================================================

@pytest.fixture
def event_loop():
    """Create an event loop for async tests."""
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()