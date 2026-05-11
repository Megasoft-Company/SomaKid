"""
SOMAKID AI Engine - Error Handler Middleware
Adds error handling middleware to catch and format all exceptions.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from ...core.config import settings
from ...core.logging_config import get_logger, log_error
from ...core.exceptions import SomakidException
from ...utils.helpers import build_error_response

logger = get_logger(__name__)


# =============================================================================
# Exception Handlers Registration
# =============================================================================

def register_exception_handlers(app):
    """
    Register all custom exception handlers on the FastAPI application.

    Args:
        app: FastAPI application instance.
    """

    @app.exception_handler(SomakidException)
    async def somakid_exception_handler(
        request: Request,
        exception: SomakidException,
    ) -> JSONResponse:
        """
        Handle SOMAKID-specific business exceptions.

        Args:
            request: Incoming request.
            exception: SOMAKID exception.

        Returns:
            Formatted error response.
        """
        log_error(
            logger,
            exception.message,
            exception=exception,
            error_code=exception.error_code,
            path=request.url.path,
        )

        return JSONResponse(
            status_code=exception.http_status,
            content=build_error_response(
                error_code=exception.error_code,
                message=exception.message,
                details=exception.details,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exception: RequestValidationError,
    ) -> JSONResponse:
        """
        Handle Pydantic/FastAPI validation errors.
        Formats errors in a readable structure.

        Args:
            request: Incoming request.
            exception: Validation exception.

        Returns:
            Formatted validation error response.
        """
        errors = []
        for error in exception.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            })

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=build_error_response(
                error_code="VALIDATION_ERROR",
                message="Invalid request data.",
                details={"errors": errors},
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request,
        exception: StarletteHTTPException,
    ) -> JSONResponse:
        """
        Handle standard HTTP exceptions.

        Args:
            request: Incoming request.
            exception: HTTP exception.

        Returns:
            Formatted HTTP error response.
        """
        return JSONResponse(
            status_code=exception.status_code,
            content=build_error_response(
                error_code=f"HTTP_{exception.status_code}",
                message=exception.detail,
            ),
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request,
        exception: Exception,
    ) -> JSONResponse:
        """
        Last-resort handler for unhandled exceptions.
        In production, hides internal details.

        Args:
            request: Incoming request.
            exception: Unhandled exception.

        Returns:
            Formatted error response.
        """
        log_error(
            logger,
            "Unhandled exception",
            exception=exception,
            path=request.url.path,
        )

        if settings.is_production:
            message = "An internal error occurred. The team has been notified."
        else:
            message = f"Internal error: {str(exception)}"

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=build_error_response(
                error_code="INTERNAL_ERROR",
                message=message,
                details={"exception_type": type(exception).__name__}
                if not settings.is_production else None,
            ),
        )