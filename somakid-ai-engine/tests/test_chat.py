"""
SOMAKID AI Engine - Chat Service Tests
Tests for the SOMA tutor chat service and conversation management.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.exceptions import ValidationException, AIServiceException, UnsupportedLanguageException
from app.models.schemas import ChatReponse


# =============================================================================
# Test Client
# =============================================================================

@pytest.fixture
def client():
    """Create test client for the FastAPI application."""
    return TestClient(app)


# =============================================================================
# Unit Tests - Chat Service
# =============================================================================

class TestChatServiceValidation:
    """Tests for input validation in chat service."""

    def test_validate_valid_inputs(self, chat_service):
        chat_service._validate_inputs("Hello SOMA!", "fr", 8)

    def test_validate_empty_message(self, chat_service):
        with pytest.raises(ValidationException, match="Message cannot be empty"):
            chat_service._validate_inputs("", "fr", 8)
        with pytest.raises(ValidationException, match="Message cannot be empty"):
            chat_service._validate_inputs("   ", "fr", 8)

    def test_validate_message_too_long(self, chat_service):
        long_message = "a" * 1001
        with pytest.raises(ValidationException, match="Message is too long"):
            chat_service._validate_inputs(long_message, "fr", 8)

    def test_validate_unsupported_language(self, chat_service):
        with pytest.raises(UnsupportedLanguageException):
            chat_service._validate_inputs("Hello", "xx", 8)

    def test_validate_invalid_age(self, chat_service):
        with pytest.raises(ValidationException, match="Child age must be"):
            chat_service._validate_inputs("Hello", "fr", 25)

    def test_validate_boundary_ages(self, chat_service):
        chat_service._validate_inputs("Hello", "fr", 3)
        chat_service._validate_inputs("Hello", "fr", 15)


class TestChatServiceResponseProcessing:
    """Tests for chat response building."""

    def test_build_complete_response(self, chat_service):
        data = {
            "reponse": "Hello young explorer!",
            "suggestion_activite": "Plant a tree today!",
            "points_gagnes": 5,
            "badge_debloque": None,
            "question_suivi": "What else?",
        }
        response = chat_service._build_response(data, "fr")
        assert isinstance(response, ChatReponse)
        assert response.suggestion_activite == "Plant a tree today!"

    def test_build_minimal_response(self, chat_service):
        data = {"reponse": "Great question!"}
        response = chat_service._build_response(data, "fr")
        assert response.reponse == "Great question!"
        assert response.points_gagnes == 5

    def test_build_response_with_badge(self, chat_service):
        data = {"reponse": "Congrats!", "points_gagnes": 20, "badge_debloque": "first_step"}
        response = chat_service._build_response(data, "fr")
        assert response.badge_debloque == "first_step"


class TestChatServiceHistoryManagement:
    """Tests for conversation history management."""

    def test_update_history_empty(self, chat_service):
        history = []
        updated = chat_service._update_history(history, "Hello", "Hi!", "fr")
        assert len(updated) == 2

    def test_update_history_existing(self, chat_service):
        history = [
            {"role": "user", "content": "Q1"},
            {"role": "assistant", "content": "A1"},
        ]
        updated = chat_service._update_history(history, "Q2", "A2", "fr")
        assert len(updated) == 4

    def test_update_history_limit(self, chat_service):
        history = []
        for idx in range(30):
            history.append({"role": "user", "content": f"Message {idx}"})
            history.append({"role": "assistant", "content": f"Response {idx}"})
        updated = chat_service._update_history(history, "New", "Response", "fr")
        assert len(updated) <= 52

    def test_load_history_from_memory(self, chat_service, mock_memory_repository):
        session_id = "test_chat_session"
        mock_memory_repository.save_progress(session_id, {
            "messages": [
                {"role": "user", "content": "Stored"},
                {"role": "assistant", "content": "Stored response"},
            ]
        })
        history = chat_service._load_history(session_id)
        assert len(history) == 2


class TestChatServiceSessionManagement:
    """Tests for chat session creation."""

    def test_create_session(self, chat_service):
        session_id = chat_service.create_session()
        assert session_id.startswith("soma_chat_")

    def test_get_quick_questions_french(self, chat_service):
        questions = chat_service.get_quick_questions("fr")
        assert len(questions) >= 5

    def test_get_quick_questions_lingala(self, chat_service):
        questions = chat_service.get_quick_questions("ln")
        assert len(questions) >= 5


class TestChatServiceMessageFlow:
    """Tests for the complete message flow."""

    @pytest.mark.asyncio
    async def test_send_message_success(self, chat_service, mock_gemini_client):
        mock_gemini_client.generate_text.return_value = '{"reponse": "Hello!"}'
        mock_gemini_client.extract_json_from_response.return_value = {
            "reponse": "Hello young explorer!",
            "suggestion_activite": "Observe plants.",
            "points_gagnes": 5,
            "badge_debloque": None,
            "question_suivi": "What plant?",
        }
        response, history = await chat_service.send_message(
            message="Tell me about nature", language="fr", session_id="test_session", child_age=8,
        )
        assert isinstance(response, ChatReponse)
        assert len(history) == 2

    @pytest.mark.asyncio
    async def test_send_message_fallback(self, chat_service, mock_gemini_client):
        mock_gemini_client.generate_text.side_effect = AIServiceException("AI error")
        response, history = await chat_service.send_message(
            message="Tell me about nature", language="fr", session_id="test_session",
        )
        assert response.reponse is not None
        assert response.points_gagnes == 3


# =============================================================================
# Integration Tests - Chat API
# =============================================================================

class TestChatAPI:
    """Tests for chat API endpoints."""

    def test_send_message_endpoint_validation(self, client):
        response = client.post("/api/v1/chat/message", json={})
        assert response.status_code == 422

    def test_send_message_endpoint_empty_message(self, client):
        response = client.post("/api/v1/chat/message", json={
            "message": "", "identifiant_session": "test_session", "langue": "fr",
        })
        assert response.status_code == 422

    def test_create_session_endpoint(self, client):
        response = client.post("/api/v1/chat/session/create")
        assert response.status_code == 201

    def test_quick_questions_endpoint(self, client):
        response = client.get("/api/v1/chat/quick-questions")
        assert response.status_code == 200

    def test_get_chat_history_not_found(self, client):
        response = client.get("/api/v1/chat/session/nonexistent_12345")
        assert response.status_code == 404