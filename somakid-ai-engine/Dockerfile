# =============================================================================
# SOMAKID AI Engine - Dockerfile
# Multi-stage build for optimized production image
# Python 3.12 + FastAPI + Google Gemini AI
# =============================================================================

# =============================================================================
# Stage 1: Builder
# Compiles dependencies and prepares the application
# =============================================================================
FROM python:3.12-slim AS builder

# Environment variables for build optimization
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120

# Install system build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Create application directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# =============================================================================
# Stage 2: Final Image
# Minimal runtime image with only necessary components
# =============================================================================
FROM python:3.12-slim

# Environment variables for runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/home/somakid/.local/bin:$PATH" \
    PYTHONPATH="/app"

# Install runtime system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq-dev \
    libjpeg62-turbo \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd --system somakid && \
    useradd --system --gid somakid --create-home --shell /bin/bash somakid

# Copy Python packages from builder stage
COPY --from=builder /root/.local /home/somakid/.local

# Create application directory with correct permissions
WORKDIR /app
RUN chown -R somakid:somakid /app

# Copy application code
COPY --chown=somakid:somakid app/ ./app/
COPY --chown=somakid:somakid data/ ./data/

# Create data directories if they don't exist
RUN mkdir -p /app/data/knowledge /app/data/memory && \
    chown -R somakid:somakid /app/data

# Switch to non-root user
USER somakid

# Expose application port
EXPOSE 8000

# Health check - verifies the application is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/ping || exit 1

# Labels for container metadata
LABEL org.opencontainers.image.title="SOMAKID AI Engine" \
      org.opencontainers.image.description="Intelligent AI Tutor for Climate Education and Biodiversity" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="SOMAKID AI" \
      org.opencontainers.image.licenses="MIT" \
      maintainer="SOMAKID AI Team <contact@somakid.ai>"

# Default startup command
# Uses 4 workers for production, override with environment variable if needed
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--log-level", "info"]