"""
SOMAKID AI Engine - Security Module
JWT token management, password hashing, rate limiting, and security validators.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security, Depends
from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials,
    APIKeyHeader,
)
from slowapi import Limiter
from slowapi.util import get_remote_address
from limits import storage as limits_storage

from .config import settings
from .logging_config import get_logger

logger = get_logger(__name__)


# =============================================================================
# Password Hashing Context
# =============================================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
)


# =============================================================================
# Rate Limiter - Memory Storage for Dev/Test, Redis for Production
# =============================================================================

def _create_limiter() -> Limiter:
    """
    Create rate limiter with appropriate storage backend.
    Uses memory storage for development and testing.
    Uses Redis storage in production when available.
    """
    if settings.is_production:
        try:
            limiter_instance = Limiter(
                key_func=get_remote_address,
                default_limits=[
                    f"{settings.RATE_LIMIT_REQUESTS}/{settings.RATE_LIMIT_PERIOD}s"
                ],
                storage_uri=settings.REDIS_URL,
                strategy="fixed-window",
            )
            logger.info("rate_limiter_using_redis", redis_url=settings.REDIS_URL)
            return limiter_instance
        except Exception as e:
            logger.warning("redis_unavailable_falling_back_to_memory", error=str(e))

    # Development/Test: Use in-memory storage
    memory_storage = limits_storage.MemoryStorage()
    limiter_instance = Limiter(
        key_func=get_remote_address,
        default_limits=[
            f"{settings.RATE_LIMIT_REQUESTS}/{settings.RATE_LIMIT_PERIOD}s"
        ],
        storage_uri="memory://",
        strategy="fixed-window",
    )
    # Manually set the storage to memory
    limiter_instance._storage = memory_storage
    logger.info("rate_limiter_using_memory_storage")
    return limiter_instance


limiter = _create_limiter()


# =============================================================================
# HTTP Security Schemes
# =============================================================================

bearer_security = HTTPBearer(
    scheme_name="Bearer JWT",
    description="JWT token for user authentication",
    auto_error=True,
)

api_key_security = APIKeyHeader(
    name="X-API-Key",
    scheme_name="ApiKey",
    description="API key for internal service communication",
    auto_error=False,
)


# =============================================================================
# Password Hashing Functions
# =============================================================================

def hash_text(text: str) -> str:
    """
    Hash a string using bcrypt.

    Args:
        text: Plain text to hash.

    Returns:
        Bcrypt hash of the text.
    """
    return pwd_context.hash(text)


def verify_hash(plain_text: str, hashed_text: str) -> bool:
    """
    Verify a plain text against its hash.

    Args:
        plain_text: Plain text to verify.
        hashed_text: Hash to verify against.

    Returns:
        True if text matches hash.
    """
    return pwd_context.verify(plain_text, hashed_text)


# =============================================================================
# JWT Token Management
# =============================================================================

def create_jwt_token(
    data: Dict[str, Any],
    expiration_minutes: Optional[int] = None,
) -> str:
    """
    Create a signed JWT token.

    Args:
        data: Data to encode in the token.
        expiration_minutes: Token validity in minutes.

    Returns:
        Encoded JWT token string.
    """
    duration = expiration_minutes or settings.JWT_EXPIRATION_MINUTES

    token_content = data.copy()
    now = datetime.now(timezone.utc)

    token_content.update({
        "iat": now,
        "exp": now + timedelta(minutes=duration),
        "iss": "somakid-ai",
        "aud": "somakid-app",
    })

    token = jwt.encode(
        token_content,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    logger.info(
        "jwt_token_created",
        subject=data.get("sub", "unknown"),
        expiration_minutes=duration,
    )

    return token


def decode_jwt_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify a JWT token.

    Args:
        token: JWT token to decode.

    Returns:
        Decoded token content.

    Raises:
        HTTPException: If token is invalid or expired.
    """
    try:
        content = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            audience="somakid-app",
            issuer="somakid-ai",
        )
        return content

    except JWTError as error:
        logger.warning("jwt_token_invalid", error=str(error))
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
        )


async def verify_jwt_token(
    credentials: HTTPAuthorizationCredentials = Security(bearer_security),
) -> Dict[str, Any]:
    """
    Verify JWT token from Authorization header.

    Args:
        credentials: Extracted bearer credentials.

    Returns:
        Decoded token content.

    Raises:
        HTTPException: If token is invalid.
    """
    return decode_jwt_token(credentials.credentials)


# =============================================================================
# SOMAKID-Specific Security Validators
# =============================================================================

def validate_child_age(age: int) -> bool:
    """Validate that the child's age is within the allowed range."""
    return settings.CHILD_MIN_AGE <= age <= settings.CHILD_MAX_AGE


def validate_image_size(size_bytes: int) -> bool:
    """Validate that image size is within the allowed limit."""
    return size_bytes <= settings.max_image_size_bytes


def validate_supported_language(language: str) -> bool:
    """Validate that the language is supported."""
    return language in settings.supported_languages_list


def validate_child_pin(pin: str) -> bool:
    """Validate the format of a child's PIN code (exactly 4 digits)."""
    return len(pin) == 4 and pin.isdigit()


def sanitize_child_text(text: str, max_length: int = 1000) -> str:
    """
    Sanitize text input from a child.
    Removes dangerous characters, HTML, and limits length.
    """
    import re

    if not text:
        return ""

    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    text = re.sub(r'<[^>]*>', '', text)
    text = re.sub(r'javascript\s*:', '', text, flags=re.IGNORECASE)
    text = re.sub(r'[\'";]', '', text)
    text = re.sub(r'--', '', text)
    text = re.sub(r'\s+', ' ', text)

    if len(text) > max_length:
        text = text[:max_length]

    return text.strip()


class SecurityValidator:
    """Utility class for security validations."""

    @staticmethod
    def validate_child_request(
        age: int,
        language: str,
        image_size: Optional[int] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate parameters for a child-related request.

        Args:
            age: Child's age.
            language: Requested language.
            image_size: Image size in bytes if applicable.

        Returns:
            Tuple of (is_valid, error_message).
        """
        if not validate_child_age(age):
            return False, f"Age not allowed: {age} years"

        if not validate_supported_language(language):
            return False, f"Unsupported language: {language}"

        if image_size is not None and not validate_image_size(image_size):
            return False, f"Image too large: {image_size} bytes"

        return True, None


# =============================================================================
# API Key Validation (for Internal Services)
# =============================================================================

INTERNAL_API_KEYS = {
    "somakid_laravel_backend": settings.SECRET_KEY[:16],
}


def validate_api_key(api_key: str) -> bool:
    """Validate an internal API key."""
    return api_key in INTERNAL_API_KEYS.values()