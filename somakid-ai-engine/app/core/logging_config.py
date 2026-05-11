"""
SOMAKID AI Engine - Structured Logging Configuration
Uses structlog for structured, context-rich logging.
Production outputs JSON for log aggregation tools.
Development outputs colored console for readability.
"""

import logging
import sys
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone

import structlog
from structlog.types import Processor

from .config import settings


# =============================================================================
# Structlog Processors
# =============================================================================

def add_timestamp(
    logger: logging.Logger,
    method_name: str,
    event_dict: dict,
) -> dict:
    """
    Add ISO 8601 UTC timestamp to each log event.

    Args:
        logger: Standard logger instance.
        method_name: Log method name.
        event_dict: Event dictionary.

    Returns:
        Event dictionary with timestamp added.
    """
    event_dict["timestamp"] = datetime.now(timezone.utc).isoformat()
    return event_dict


def add_environment(
    logger: logging.Logger,
    method_name: str,
    event_dict: dict,
) -> dict:
    """
    Add current environment to each log event.

    Args:
        logger: Standard logger instance.
        method_name: Log method name.
        event_dict: Event dictionary.

    Returns:
        Event dictionary with environment added.
    """
    event_dict["environment"] = settings.ENVIRONMENT.value
    return event_dict


def add_service_name(
    logger: logging.Logger,
    method_name: str,
    event_dict: dict,
) -> dict:
    """
    Add service name to each log event.

    Args:
        logger: Standard logger instance.
        method_name: Log method name.
        event_dict: Event dictionary.

    Returns:
        Event dictionary with service name added.
    """
    event_dict["service"] = "somakid-ai-engine"
    return event_dict


def filter_sensitive_data(
    logger: logging.Logger,
    method_name: str,
    event_dict: dict,
) -> dict:
    """
    Remove or mask sensitive fields from log events.

    Args:
        logger: Standard logger instance.
        method_name: Log method name.
        event_dict: Event dictionary.

    Returns:
        Event dictionary with sensitive data masked.
    """
    sensitive_fields = [
        "api_key", "password", "token", "secret",
        "authorization", "x-api-key", "gemini_api_key",
        "jwt_token", "credit_card", "ssn",
    ]

    for field in sensitive_fields:
        if field in event_dict:
            event_dict[field] = "***MASKED***"

    return event_dict


# =============================================================================
# Logger Configuration
# =============================================================================

def configure_structlog(
    log_level: Optional[str] = None,
    log_file: Optional[Path] = None,
) -> structlog.BoundLogger:
    """
    Configure structlog for SOMAKID AI Engine.

    Args:
        log_level: Override log level (uses config default if None).
        log_file: Optional log file path.

    Returns:
        Configured structlog logger instance.
    """
    level = log_level or settings.LOG_LEVEL

    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, level.upper()),
    )

    # Build processor chain
    processors: list[Processor] = [
        # Add metadata
        add_timestamp,
        add_environment,
        add_service_name,

        # Clean sensitive data
        filter_sensitive_data,

        # Handle exceptions
        structlog.processors.format_exc_info,

        # Add log level
        structlog.stdlib.add_log_level,

        # Add code location
        structlog.processors.CallsiteParameterAdder(
            {
                structlog.processors.CallsiteParameter.FILENAME,
                structlog.processors.CallsiteParameter.FUNC_NAME,
                structlog.processors.CallsiteParameter.LINENO,
            }
        ),
    ]

    # Configure renderer based on environment
    if settings.is_production:
        # JSON format for log aggregation tools (ELK, Datadog, etc.)
        processors.append(structlog.processors.JSONRenderer())
    else:
        # Colored console output for development
        processors.append(
            structlog.dev.ConsoleRenderer(
                colors=True,
                pad_event=30,
            )
        )

    # Apply structlog configuration
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    return structlog.get_logger()


# =============================================================================
# Global Logger Instance
# =============================================================================

logger: structlog.BoundLogger = configure_structlog()


# =============================================================================
# Logger Utility Functions
# =============================================================================

def get_logger(name: str) -> structlog.BoundLogger:
    """
    Get a logger with module-specific context.

    Args:
        name: Module or component name.

    Returns:
        Logger with module name in context.
    """
    return logger.bind(module=name)


def log_request(
    logger_instance: structlog.BoundLogger,
    method: str,
    path: str,
    duration_ms: float,
    status_code: int,
) -> None:
    """
    Log HTTP request details.

    Args:
        logger_instance: Logger instance.
        method: HTTP method (GET, POST, etc.).
        path: Request path.
        duration_ms: Processing duration in milliseconds.
        status_code: HTTP status code.
    """
    logger_instance.info(
        "http_request",
        http_method=method,
        path=path,
        duration_ms=round(duration_ms, 2),
        status_code=status_code,
    )


def log_error(
    logger_instance: structlog.BoundLogger,
    message: str,
    exception: Optional[Exception] = None,
    **context,
) -> None:
    """
    Log an error with full context.

    Args:
        logger_instance: Logger instance.
        message: Error message.
        exception: Optional exception object.
        **context: Additional context data.
    """
    log_data = {
        "error_message": message,
        **context,
    }

    if exception:
        log_data["exception_type"] = type(exception).__name__
        log_data["exception_detail"] = str(exception)

    logger_instance.error("application_error", **log_data)


def log_performance(
    logger_instance: structlog.BoundLogger,
    operation: str,
    duration_ms: float,
    **context,
) -> None:
    """
    Log a performance metric.

    Args:
        logger_instance: Logger instance.
        operation: Name of the measured operation.
        duration_ms: Duration in milliseconds.
        **context: Additional context data.
    """
    logger_instance.info(
        "performance_metric",
        operation=operation,
        duration_ms=round(duration_ms, 2),
        **context,
    )


def log_warning(
    logger_instance: structlog.BoundLogger,
    message: str,
    **context,
) -> None:
    """
    Log a warning message.

    Args:
        logger_instance: Logger instance.
        message: Warning message.
        **context: Additional context data.
    """
    logger_instance.warning(
        "warning",
        warning_message=message,
        **context,
    )