"""
SOMAKID AI Engine - Quiz Service Tests
Tests for educational quiz generation and answer validation.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.exceptions import ValidationException, AIServiceException
from app.models.schemas import QuestionQuiz, ResultatQuiz


# =============================================================================
# Test Client
# =============================================================================

@pytest.fixture
def client():
    """Create test client for the FastAPI application."""
    return TestClient(app)


# =============================================================================
# Unit Tests - Quiz Service
# =============================================================================

class TestQuizServiceValidation:
    """Tests for input validation in quiz service."""

    def test_validate_valid_subject(self, quiz_service):
        quiz_service._validate_generation_inputs("biodiversity", 1, "fr")

    def test_validate_invalid_subject(self, quiz_service):
        with pytest.raises(ValidationException, match="Invalid subject"):
            quiz_service._validate_generation_inputs("astronomy", 1, "fr")

    def test_validate_invalid_level(self, quiz_service):
        with pytest.raises(ValidationException, match="Level must be between"):
            quiz_service._validate_generation_inputs("climate", 0, "fr")
        with pytest.raises(ValidationException, match="Level must be between"):
            quiz_service._validate_generation_inputs("climate", 6, "fr")


class TestQuizServiceGeneration:
    """Tests for quiz question generation."""

    @pytest.mark.asyncio
    async def test_generate_question_success(self, quiz_service, mock_gemini_client, sample_quiz_question):
        mock_gemini_client.generate_text.return_value = '{"question": "test"}'
        mock_gemini_client.extract_json_from_response.return_value = sample_quiz_question
        result = await quiz_service.generate_question(subject="biodiversity", level=1, language="fr")
        assert isinstance(result, QuestionQuiz)
        assert len(result.options) >= 2

    @pytest.mark.asyncio
    async def test_generate_question_fallback(self, quiz_service, mock_gemini_client):
        mock_gemini_client.generate_text.side_effect = AIServiceException("AI error")
        result = await quiz_service.generate_question(subject="climate", level=2, language="fr")
        assert isinstance(result, QuestionQuiz)


class TestQuizServiceAnswerValidation:
    """Tests for quiz answer validation."""

    @pytest.fixture
    def sample_question(self):
        return QuestionQuiz(
            identifiant="test_q_001",
            question="What is the largest tree in Africa?",
            options=["Baobab", "Oak", "Fir", "Palm"],
            reponse_correcte=0,
            explication="The Baobab!",
            points=10,
            emoji_sujet="🌿",
            message_felicitations="Great!",
        )

    @pytest.mark.asyncio
    async def test_correct_answer(self, quiz_service, sample_question):
        result = await quiz_service.validate_answer(question=sample_question, chosen_answer=0)
        assert result.est_correcte is True
        assert result.points_gagnes == 10

    @pytest.mark.asyncio
    async def test_incorrect_answer(self, quiz_service, sample_question):
        result = await quiz_service.validate_answer(question=sample_question, chosen_answer=1)
        assert result.est_correcte is False
        assert result.points_gagnes == 0


class TestQuizServiceSubjectListing:
    """Tests for subject listing."""

    def test_get_subjects_french(self, quiz_service):
        subjects = quiz_service.get_available_subjects("fr")
        assert len(subjects) == 4


# =============================================================================
# Integration Tests - Quiz API
# =============================================================================

class TestQuizAPI:
    """Tests for quiz API endpoints."""

    def test_generate_quiz_endpoint_validation(self, client):
        response = client.post("/api/v1/quiz/generate", json={})
        assert response.status_code == 422

    def test_get_subjects_endpoint(self, client):
        response = client.get("/api/v1/quiz/subjects")
        assert response.status_code == 200

    def test_session_stats_not_found(self, client):
        response = client.get("/api/v1/quiz/session/nonexistent_12345")
        assert response.status_code == 404