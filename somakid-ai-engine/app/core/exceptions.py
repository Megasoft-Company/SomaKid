"""
SOMAKID AI Engine - Custom Exceptions
Defines all application-specific exceptions with proper HTTP status codes.
"""

from typing import Any, Dict, Optional


class SomakidException(Exception):
    """Base exception for all SOMAKID AI errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
        http_status: int = 500,
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.http_status = http_status
        super().__init__(self.message)


class ValidationException(SomakidException):
    """Exception raised for data validation errors."""

    def __init__(
        self,
        message: str = "Validation failed",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            details=details,
            http_status=422,
        )


class ResourceNotFoundException(SomakidException):
    """Exception raised when a requested resource is not found."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(
            message=message,
            error_code="RESOURCE_NOT_FOUND",
            http_status=404,
        )


class AIServiceException(SomakidException):
    """Exception raised when the AI service encounters an error."""

    def __init__(self, message: str = "AI service temporarily unavailable"):
        super().__init__(
            message=message,
            error_code="AI_SERVICE_ERROR",
            http_status=503,
        )


class RateLimitException(SomakidException):
    """Exception raised when rate limit is exceeded."""

    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            http_status=429,
        )


class AuthenticationException(SomakidException):
    """Exception raised for authentication failures."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            http_status=401,
        )


class AuthorizationException(SomakidException):
    """Exception raised for authorization failures."""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            http_status=403,
        )


class ImageProcessingException(SomakidException):
    """Exception raised when image processing fails."""

    def __init__(self, message: str = "Image processing failed"):
        super().__init__(
            message=message,
            error_code="IMAGE_PROCESSING_ERROR",
            http_status=400,
        )


class UnsupportedLanguageException(SomakidException):
    """Exception raised for unsupported language requests."""

    def __init__(self, message: str = "Language not supported"):
        super().__init__(
            message=message,
            error_code="UNSUPPORTED_LANGUAGE",
            http_status=400,
        )


class ChildProfileException(SomakidException):
    """Exception raised for child profile-related errors."""

    def __init__(self, message: str = "Child profile error"):
        super().__init__(
            message=message,
            error_code="CHILD_PROFILE_ERROR",
            http_status=400,
        )