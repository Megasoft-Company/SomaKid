"""
SOMAKID AI Engine - Utility Functions
Helpers for image processing, text sanitization, ID generation, and formatting.
"""

import base64
import hashlib
import json
import os
import re
import secrets
import unicodedata
from datetime import datetime, timezone
from typing import Optional, Tuple, List, Dict, Any
from io import BytesIO
from uuid import UUID

from PIL import Image, ImageOps, UnidentifiedImageError


# =============================================================================
# ID Generation
# =============================================================================

def generate_session_id() -> str:
    """
    Generate a unique session identifier.

    Returns:
        Session ID in format session_TIMESTAMP_HEX.
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    random_part = secrets.token_hex(4)
    return f"session_{timestamp}_{random_part}"


def generate_short_id(prefix: str = "som") -> str:
    """
    Generate a short unique identifier.

    Args:
        prefix: Prefix for the identifier.

    Returns:
        Short unique ID.
    """
    timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    random_part = secrets.token_hex(3)
    return f"{prefix}_{timestamp:x}_{random_part}"


# =============================================================================
# Image Processing
# =============================================================================

def process_image_for_analysis(
    image_bytes: bytes,
    max_size_mb: int = 10,
    max_width: int = 1024,
    max_height: int = 1024,
    quality: int = 85,
) -> bytes:
    """
    Process an image for AI analysis.
    Validates size, corrects orientation, converts to JPEG.

    Args:
        image_bytes: Raw image data.
        max_size_mb: Maximum allowed size in MB.
        max_width: Maximum width in pixels.
        max_height: Maximum height in pixels.
        quality: JPEG compression quality (1-100).

    Returns:
        Processed image bytes.

    Raises:
        ValueError: If image is invalid or too large.
    """
    # Check size
    size_mb = len(image_bytes) / (1024 * 1024)
    if size_mb > max_size_mb:
        raise ValueError(
            f"Image too large ({size_mb:.1f} MB). Maximum: {max_size_mb} MB."
        )

    try:
        # Open image
        image = Image.open(BytesIO(image_bytes))

        # Fix EXIF orientation
        image = ImageOps.exif_transpose(image)

        # Convert to RGB if necessary (handle PNG transparency)
        if image.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(
                image,
                mask=image.split()[-1] if image.mode == "RGBA" else None
            )
            image = background

        # Resize if needed
        if image.width > max_width or image.height > max_height:
            image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

        # Compress to JPEG
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=quality, optimize=True)

        return buffer.getvalue()

    except UnidentifiedImageError:
        raise ValueError("The provided file is not a valid image.")
    except Exception as e:
        raise ValueError(f"Image processing error: {str(e)}")


def base64_to_bytes(base64_data: str) -> bytes:
    """
    Convert a base64 string to bytes.
    Removes data URL prefix if present.

    Args:
        base64_data: Base64 encoded string.

    Returns:
        Decoded bytes.
    """
    if "base64," in base64_data:
        base64_data = base64_data.split("base64,")[1]

    base64_data = re.sub(r"\s+", "", base64_data)

    try:
        return base64.b64decode(base64_data)
    except Exception as e:
        raise ValueError(f"Invalid base64 format: {str(e)}")


def bytes_to_base64(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """
    Convert image bytes to base64 data URI.

    Args:
        image_bytes: Image data.
        mime_type: Image MIME type.

    Returns:
        Base64 data URI string.
    """
    b64_str = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{b64_str}"


# =============================================================================
# Text Sanitization
# =============================================================================

def sanitize_child_text(text: str, max_length: int = 1000) -> str:
    """
    Sanitize text input from a child.
    Removes dangerous characters, HTML, scripts.

    Args:
        text: Text to sanitize.
        max_length: Maximum allowed length.

    Returns:
        Sanitized text.
    """
    if not text:
        return ""

    # Remove control characters
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)

    # Remove HTML tags and scripts
    text = re.sub(r"<[^>]*>", "", text)
    text = re.sub(r"javascript\s*:", "", text, flags=re.IGNORECASE)
    text = re.sub(r"on\w+\s*=", "", text, flags=re.IGNORECASE)

    # Remove SQL injection basics
    text = re.sub(r"['\";]", "", text)
    text = re.sub(r"--", "", text)

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)

    # Limit length
    if len(text) > max_length:
        text = text[:max_length]

    return text.strip()


def sanitize_name(name: str, max_length: int = 100) -> str:
    """
    Sanitize a name (first name, last name).

    Args:
        name: Name to sanitize.
        max_length: Maximum length.

    Returns:
        Sanitized name.
    """
    if not name:
        return ""

    name = re.sub(r"[^a-zA-ZÀ-ÿ\-\s]", "", name)
    name = re.sub(r"[\x00-\x1F\x7F]", "", name)

    if len(name) > max_length:
        name = name[:max_length]

    return name.strip().title()


# =============================================================================
# JSON Utilities
# =============================================================================

def safe_json_serialize(obj: Any) -> Any:
    """
    Convert Python objects to JSON-compatible types.

    Args:
        obj: Object to serialize.

    Returns:
        JSON-compatible object.
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, bytes):
        return base64.b64encode(obj).decode("utf-8")
    if hasattr(obj, "__dict__"):
        return safe_json_serialize(obj.__dict__)
    if isinstance(obj, dict):
        return {key: safe_json_serialize(value) for key, value in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [safe_json_serialize(item) for item in obj]
    return obj


def build_error_response(
    error_code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build a standardized error response.

    Args:
        error_code: Error code identifier.
        message: Error message.
        details: Optional error details.

    Returns:
        Error response dictionary.
    """
    return {
        "success": False,
        "error_code": error_code,
        "message": message,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# =============================================================================
# Masking and Security
# =============================================================================

def mask_sensitive_data(
    data: Dict[str, Any],
    fields_to_mask: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Mask sensitive fields in a dictionary for logging.

    Args:
        data: Dictionary to clean.
        fields_to_mask: List of field names to mask.

    Returns:
        Dictionary with sensitive fields masked.
    """
    sensitive_fields = fields_to_mask or [
        "password", "pin", "api_key", "token", "secret",
        "authorization", "x-api-key", "gemini_api_key",
    ]

    result = data.copy()

    for key, value in result.items():
        key_lower = key.lower()

        for field in sensitive_fields:
            if field in key_lower:
                result[key] = "***MASKED***"
                break

        if isinstance(value, dict):
            result[key] = mask_sensitive_data(value, sensitive_fields)

        if isinstance(value, list):
            result[key] = [
                mask_sensitive_data(item, sensitive_fields)
                if isinstance(item, dict) else item
                for item in value
            ]

    return result


# =============================================================================
# String Formatting
# =============================================================================

def truncate_text(text: str, max_length: int = 150, suffix: str = "...") -> str:
    """
    Truncate text to a maximum length.

    Args:
        text: Text to truncate.
        max_length: Maximum length.
        suffix: Suffix to add if truncated.

    Returns:
        Truncated text.
    """
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def format_number(number: int) -> str:
    """
    Format a large number with separators.

    Args:
        number: Number to format.

    Returns:
        Formatted number string.
    """
    return f"{number:,}"


def calculate_percentage(value: int, total: int) -> float:
    """
    Calculate percentage safely (avoids division by zero).

    Args:
        value: Partial value.
        total: Total value.

    Returns:
        Percentage (0-100).
    """
    if total == 0:
        return 0.0
    return round((value / total) * 100, 1)