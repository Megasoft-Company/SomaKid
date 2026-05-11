# SOMAKID AI Engine

Intelligent AI Tutor for Climate Education, Biodiversity Awareness, and Children's Resilience.

## Overview

SOMAKID AI Engine is the core artificial intelligence service powering the SOMAKID AI educational platform. It provides:

- **Biodiversity Explorer**: AI-powered species identification from camera images
- **Climate Resilience Academy**: Gamified educational quizzes
- **SOMA Tutor Chat**: Interactive AI tutor for children
- **Multilingual Support**: French, Lingala, Swahili

## Tech Stack

- **Framework**: FastAPI (Python 3.12)
- **AI Model**: Google Gemini 2.5 Flash Lite
- **Database**: PostgreSQL (async)
- **Cache**: Redis
- **Monitoring**: Prometheus + Structlog

## Quick Start

### Prerequisites

- Python 3.12+
- Redis
- PostgreSQL (optional for full functionality)

### Installation

```bash
# Clone the repository
git clone https://github.com/somakid/ai-engine.git
cd ai-engine

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
make install-dev

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Run the server
make run

# The API will be available at http://localhost:8000.

# API documentation is available at http://localhost:8000/docs.

# Environment Variables
# See .env.example for all available configuration options.

# Key variables:

# GEMINI_API_KEY: Your Google Gemini API key (required)

# DATABASE_URL: PostgreSQL connection string

# REDIS_URL: Redis connection string

# SECRET_KEY: Secret key for JWT token generation

# API Modules
# Module	Prefix	Description
# Health	/health	Health check and monitoring
# Vision	/api/v1/vision	Image analysis for species identification
# Quiz	/api/v1/quiz	Educational quiz generation
# Chat	/api/v1/chat	Interactive tutor chat
# Voice	/api/v1/voice	Text-to-speech and speech-to-text
# Progression	/api/v1/progression	Child learning progress tracking
# Testing

# bash
# Run all tests
make test

# Run tests with coverage
make test-cov

# Architecture
# The project follows Clean Code Architecture principles:

PROJECT STRUCTURE
text
somakid-ai-engine/
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── exceptions.py
│   │   ├── logging_config.py
│   │   └── security.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── domain.py
│   │   └── schemas.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── chat_service.py
│   │   ├── gemini_client.py
│   │   ├── progression_service.py
│   │   ├── quiz_service.py
│   │   ├── vision_service.py
│   │   └── voice_service.py
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── knowledge_repository.py
│   │   └── memory_repository.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py
│   │   │   ├── health.py
│   │   │   ├── progression.py
│   │   │   ├── quiz.py
│   │   │   ├── vision.py
│   │   │   └── voice.py
│   │   └── middleware/
│   │       ├── __init__.py
│   │       ├── error_handler.py
│   │       └── rate_limit.py
│   └── utils/
│       ├── __init__.py
│       ├── helpers.py
│       └── prompts.py
│
├── data/
│   ├── knowledge/
│   │   └── .gitkeep
│   └── memory/
│       └── .gitkeep
│
├── database/
│   └── init.sql
│
├── monitoring/
│   └── prometheus.yml
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_chat.py
│   ├── test_health.py
│   ├── test_quiz.py
│   └── test_vision.py
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── Makefile
├── README.md
├── requirements.txt
└── requirements-dev.txt
Total files: 41 source files + configuration files

The SOMAKID AI Engine Python module is now complete. All files are in English with Clean Code architecture, ready for deployment. The project includes comprehensive testing, Docker support, monitoring, and database initialization.

License
MIT License - See LICENSE file for details.

# Contact
# SOMAKID AI Team - contact@somakid.ai



# =============================================================================
# SOMAKID AI Engine - Complete Project Execution Guide
# =============================================================================

# Navigate to project directory
Set-Location D:\SomaKid\somakid-ai-engine

# 1. Create virtual environment
python -m venv venv

# 2. Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# If activation fails due to execution policy, run:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 3. Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 4. Copy environment file and configure
Copy-Item .env.example .env
# Edit .env with your actual GEMINI_API_KEY

# 5. Run tests
pytest tests/ -v

# 6. Start development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 7. Open API documentation
# http://localhost:8000/docs

# ----- DOCKER DEPLOYMENT -----

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down

# Start with monitoring stack
docker-compose --profile monitoring up -d


AVAILABLE ENDPOINTS
Method	Endpoint	Module
GET	/	Root - API Info
GET	/ping	Health - Ping
GET	/health	Health - Full Check
GET	/health/live	Health - Liveness
GET	/health/ready	Health - Readiness
POST	/api/v1/vision/analyze	Vision - Image Analysis
POST	/api/v1/vision/analyze-base64	Vision - Base64 Analysis
GET	/api/v1/vision/catalog	Vision - Species Catalog
GET	/api/v1/vision/species/{id}	Vision - Species Detail
POST	/api/v1/quiz/generate	Quiz - Generate Question
POST	/api/v1/quiz/submit	Quiz - Submit Answer
GET	/api/v1/quiz/subjects	Quiz - Available Subjects
GET	/api/v1/quiz/session/{id}	Quiz - Session Stats
POST	/api/v1/chat/message	Chat - Send Message
POST	/api/v1/chat/session/create	Chat - Create Session
GET	/api/v1/chat/session/{id}	Chat - History
GET	/api/v1/chat/quick-questions	Chat - Quick Questions
GET	/api/v1/progression/{id}	Progression - Get
POST	/api/v1/progression/points/add	Progression - Add Points
POST	/api/v1/voice/synthesize	Voice - TTS
POST	/api/v1/voice/recognize	Voice - STT
API Documentation: http://localhost:8000/docs