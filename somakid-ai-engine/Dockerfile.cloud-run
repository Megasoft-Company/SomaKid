FROM python:3.12-slim

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir uvicorn

# Copy application code
COPY app/ ./app/
COPY data/ ./data/

# Create data directories
RUN mkdir -p /app/data/knowledge /app/data/memory

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8080/ping || exit 1

# Run with Cloud Run's PORT variable
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --log-level info
