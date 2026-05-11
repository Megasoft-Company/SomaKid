# =============================================================================
# SOMAKID AI Engine - Makefile
# Common commands for development and deployment
# =============================================================================

.PHONY: help install run test lint clean docker-build docker-up docker-down

# Default target
help:
	@echo "SOMAKID AI Engine - Available Commands"
	@echo "========================================"
	@echo "make install        Install all dependencies"
	@echo "make install-dev    Install with dev dependencies"
	@echo "make run            Run development server"
	@echo "make run-prod       Run production server"
	@echo "make test           Run all tests"
	@echo "make test-cov       Run tests with coverage"
	@echo "make lint           Run code linters"
	@echo "make format         Format code with black and isort"
	@echo "make clean          Clean cache and temporary files"
	@echo "make docker-build   Build Docker image"
	@echo "make docker-up      Start Docker containers"
	@echo "make docker-down    Stop Docker containers"

# --- Installation -------------------------------------------------------------
install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements.txt -r requirements-dev.txt

# --- Run ----------------------------------------------------------------------
run:
	uvicorn app.main:app --host $(HOST) --port $(PORT) --reload --log-level $(LOG_LEVEL)

run-prod:
	uvicorn app.main:app --host $(HOST) --port $(PORT) --workers $(WORKERS) --log-level $(LOG_LEVEL)

# --- Testing ------------------------------------------------------------------
test:
	pytest tests/ -v

test-cov:
	pytest tests/ -v --cov=app --cov-report=html --cov-report=term

# --- Linting ------------------------------------------------------------------
lint:
	flake8 app/ tests/ --max-line-length=120
	mypy app/ --ignore-missing-imports

format:
	black app/ tests/ --line-length=120
	isort app/ tests/ --profile black

# --- Cleanup ------------------------------------------------------------------
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name ".coverage" -delete 2>/dev/null || true
	rm -rf htmlcov/ .pytest_cache/ .mypy_cache/ 2>/dev/null || true

# --- Docker -------------------------------------------------------------------
docker-build:
	docker build -t somakid-ai-engine:latest .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

# --- Default ------------------------------------------------------------------
.DEFAULT_GOAL := help