"""
SOMAKID AI Engine - Vision Analysis Tests
Tests for the image analysis and species identification service.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.exceptions import (
    ValidationException,
    ImageProcessingException,
    AIServiceException,
    UnsupportedLanguageException,
)
from app.models.schemas import AnalyseImageResult


# =============================================================================
# Test Client
# =============================================================================

@pytest.fixture
def client():
    """Create test client for the FastAPI application."""
    return TestClient(app)


# =============================================================================
# Unit Tests - Vision Service
# =============================================================================

class TestVisionServiceValidation:
    """Tests for input validation in vision service."""

    def test_validate_empty_image(self, vision_service):
        """Test validation fails with empty image bytes."""
        with pytest.raises(ValidationException, match="Image data is empty"):
            vision_service._validate_inputs(b"", "fr", 8)

    def test_validate_unsupported_language(self, vision_service):
        """Test validation fails with unsupported language."""
        with pytest.raises(UnsupportedLanguageException):
            vision_service._validate_inputs(b"fake_image_data", "xx", 8)

    def test_validate_invalid_age(self, vision_service):
        """Test validation fails with invalid child age."""
        with pytest.raises(ValidationException, match="Child age must be between"):
            vision_service._validate_inputs(b"fake_image_data", "fr", 25)

    def test_validate_valid_inputs(self, vision_service, sample_image_bytes):
        """Test validation passes with valid inputs."""
        vision_service._validate_inputs(sample_image_bytes, "fr", 8)

    def test_validate_min_age(self, vision_service, sample_image_bytes):
        """Test validation with minimum valid age."""
        vision_service._validate_inputs(sample_image_bytes, "fr", 3)

    def test_validate_max_age(self, vision_service, sample_image_bytes):
        """Test validation with maximum valid age."""
        vision_service._validate_inputs(sample_image_bytes, "fr", 15)


class TestVisionServiceImageProcessing:
    """Tests for image preprocessing."""

    def test_preprocess_valid_image(self, vision_service, sample_image_bytes):
        """Test preprocessing of valid image."""
        result = vision_service._preprocess_image(sample_image_bytes)
        assert result is not None
        assert len(result) > 0

    def test_preprocess_invalid_data(self, vision_service):
        """Test preprocessing fails with invalid image data."""
        with pytest.raises(ImageProcessingException):
            vision_service._preprocess_image(b"not_an_image_at_all")

    def test_preprocess_reduces_large_image(self, vision_service):
        """Test that oversized images are resized."""
        from io import BytesIO
        from PIL import Image

        img = Image.new("RGB", (2000, 2000), color="green")
        buffer = BytesIO()
        img.save(buffer, format="JPEG")
        large_image = buffer.getvalue()

        result = vision_service._preprocess_image(large_image)
        assert len(result) < len(large_image)


class TestVisionServiceResultNormalization:
    """Tests for result normalization."""

    def test_normalize_complete_result(self, vision_service, sample_analysis_result):
        """Test normalization of complete analysis result."""
        result = vision_service._normalize_result(sample_analysis_result, "fr", 8)
        assert isinstance(result, AnalyseImageResult)
        assert result.espece == "African Elephant"
        assert result.categorie == "animal"
        assert result.points_gagnes == 10
        assert result.confiance is not None

    def test_normalize_missing_fields(self, vision_service):
        """Test normalization with missing optional fields."""
        minimal_data = {"espece": "Unknown Plant", "categorie": "plant"}
        result = vision_service._normalize_result(minimal_data, "fr", 8)
        assert result.espece == "Unknown Plant"
        assert result.description_enfant is not None
        assert result.role_ecologique is not None

    def test_normalize_invalid_category(self, vision_service):
        """Test normalization defaults invalid category."""
        data = {"espece": "Test", "categorie": "invalid_category"}
        result = vision_service._normalize_result(data, "fr", 8)
        assert result.categorie == "other"


class TestVisionServiceAnalysis:
    """Tests for the main analysis flow."""

    @pytest.mark.asyncio
    async def test_analyze_image_success(
        self, vision_service, mock_gemini_client, sample_image_bytes, sample_analysis_result
    ):
        """Test successful image analysis."""
        mock_gemini_client.generate_with_image.return_value = '{"espece": "Lion"}'
        mock_gemini_client.extract_json_from_response.return_value = sample_analysis_result

        result = await vision_service.analyze_image(
            image_bytes=sample_image_bytes, language="fr", child_age=8, session_id="test_session",
        )
        assert result is not None
        assert result.espece == "African Elephant"

    @pytest.mark.asyncio
    async def test_analyze_image_fallback_on_error(
        self, vision_service, mock_gemini_client, sample_image_bytes
    ):
        """Test fallback response when AI analysis fails."""
        mock_gemini_client.generate_with_image.side_effect = AIServiceException("AI error")

        result = await vision_service.analyze_image(
            image_bytes=sample_image_bytes, language="fr", child_age=8,
        )
        assert result is not None
        assert result.espece is not None
        assert result.points_gagnes == 5


# =============================================================================
# Integration Tests - Vision API
# =============================================================================

class TestVisionAPI:
    """Tests for vision analysis API endpoints."""

    def test_analyze_endpoint_no_file(self, client):
        """Test that endpoint returns error without file."""
        response = client.post("/api/v1/vision/analyze")
        assert response.status_code == 422

    def test_analyze_endpoint_with_invalid_file(self, client):
        """Test that endpoint rejects non-image files."""
        response = client.post(
            "/api/v1/vision/analyze",
            files={"image": ("test.txt", b"not an image", "text/plain")},
        )
        assert response.status_code in [400, 422]

    def test_catalog_endpoint(self, client):
        """Test species catalog endpoint."""
        response = client.get("/api/v1/vision/catalog")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)

    def test_catalog_endpoint_with_category_filter(self, client):
        """Test catalog filtering by category."""
        response = client.get("/api/v1/vision/catalog?category=animal")
        assert response.status_code == 200
        data = response.json()
        for entry in data["data"]:
            assert entry.get("category") == "animal"

    def test_species_detail_endpoint(self, client):
        """Test species detail endpoint."""
        response = client.get("/api/v1/vision/species/mountain_gorilla")
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == "mountain_gorilla"

    def test_species_detail_not_found(self, client):
        """Test species detail endpoint with non-existent ID."""
        response = client.get("/api/v1/vision/species/nonexistent_species")
        assert response.status_code == 404