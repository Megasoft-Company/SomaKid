"""
SOMAKID AI Engine - Centralized Configuration
Uses Pydantic Settings for strong typing and validation.
All environment variables are loaded and validated automatically.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import List, Optional
from enum import Enum
from pathlib import Path


# =============================================================================
# Résolution du chemin absolu vers .env
# =============================================================================

def _find_env_file() -> Path | None:
    """
    Remonte l'arborescence depuis ce fichier (core/config.py) pour trouver .env.
    Structure attendue :  somakid-ai-engine/
                              .env  
                              app/
                                core/
                                  config.py    
    """
    current = Path(__file__).resolve().parent   # .../app/core
    for _ in range(6):                          # remonte jusqu'à 6 niveaux
        candidate = current / ".env"
        if candidate.exists():
            return candidate
        current = current.parent
    return None


_ENV_FILE = _find_env_file()


# =============================================================================
# Enumerations
# =============================================================================

class Environment(str, Enum):
    """Application execution environments."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class SupportedLanguage(str, Enum):
    """Languages supported by SOMAKID AI."""
    FRENCH = "fr"
    LINGALA = "ln"
    SWAHILI = "sw"


class SpeciesCategory(str, Enum):
    """Identifiable species categories."""
    PLANT = "plant"
    ANIMAL = "animal"
    INSECT = "insect"
    FUNGUS = "fungus"
    OTHER = "other"


class QuizSubject(str, Enum):
    """Available quiz subjects."""
    BIODIVERSITY = "biodiversity"
    CLIMATE = "climate"
    DISASTERS = "disasters"
    BEHAVIORS = "behaviors"


# =============================================================================
# Main Configuration Class
# =============================================================================

class Settings(BaseSettings):
    """
    Centralized configuration for SOMAKID AI Engine.
    All values can be overridden via environment variables.
    Sensitive values should never be logged.
    """

    model_config = SettingsConfigDict(
        # ── CORRECTIF PRINCIPAL ───────────────────────────────────────────────
        # Chemin absolu vers .env, calculé depuis l'emplacement de ce fichier.
        # Fonctionne quel que soit le répertoire de travail d'Uvicorn.
        env_file=str(_ENV_FILE) if _ENV_FILE else None,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Environment ----------------------------------------------------------
    ENVIRONMENT: Environment = Field(
        default=Environment.DEVELOPMENT,
        description="Application execution environment",
    )
    DEBUG: bool = Field(
        default=False,
        description="Enable debug mode",
    )
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)",
    )

    # --- Server ---------------------------------------------------------------
    HOST: str = Field(
        default="0.0.0.0",
        description="Server host address",
    )
    PORT: int = Field(
        default=8000,
        ge=1024,
        le=65535,
        description="Server port number",
    )
    WORKERS: int = Field(
        default=4,
        ge=1,
        le=16,
        description="Number of uvicorn workers",
    )

    # --- Google Gemini AI -----------------------------------------------------
    GEMINI_API_KEY: str = Field(
        default="",
        description="Google Gemini API key",
    )
    GEMINI_MODEL: str = Field(
        default="gemini-3.1-flash-lite",
        description="Gemini model to use",
    )
    GEMINI_MAX_TOKENS: int = Field(
        default=2048,
        ge=256,
        le=8192,
        description="Maximum output tokens",
    )
    GEMINI_TEMPERATURE: float = Field(
        default=0.4,
        ge=0.0,
        le=1.0,
        description="Model temperature (creativity level)",
    )
    GEMINI_TOP_P: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Top-P sampling parameter",
    )
    GEMINI_TOP_K: int = Field(
        default=40,
        ge=1,
        le=100,
        description="Top-K sampling parameter",
    )

    # --- Groq -----------------------------------------------------------------
    # ── AJOUT ── La clé Groq manquait dans la config originale
    GROQ_API_KEY: str = Field(
        default="",
        description="Groq API key for Whisper STT and Llama LLM",
    )

    # --- Redis ----------------------------------------------------------------
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL",
    )
    REDIS_PASSWORD: Optional[str] = Field(
        default=None,
        description="Redis password",
    )
    REDIS_MAX_CONNECTIONS: int = Field(
        default=10,
        description="Maximum Redis connections",
    )

    # --- Database -------------------------------------------------------------
    DATABASE_URL: Optional[str] = Field(
        default=None,
        description="PostgreSQL connection URL",
    )
    DATABASE_POOL_SIZE: int = Field(
        default=20,
        description="Database connection pool size",
    )
    DATABASE_MAX_OVERFLOW: int = Field(
        default=10,
        description="Maximum extra connections allowed",
    )

    # --- Security -------------------------------------------------------------
    SECRET_KEY: str = Field(
        default="change-this-secret-key-in-production",
        min_length=32,
        description="Secret key for JWT signing",
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="JWT signing algorithm",
    )
    JWT_EXPIRATION_MINUTES: int = Field(
        default=1440,
        ge=5,
        description="JWT token validity in minutes",
    )

    # --- Rate Limiting --------------------------------------------------------
    RATE_LIMIT_REQUESTS: int = Field(
        default=100,
        ge=1,
        description="Allowed requests per period",
    )
    RATE_LIMIT_PERIOD: int = Field(
        default=60,
        ge=1,
        description="Rate limit period in seconds",
    )

    # --- CORS -----------------------------------------------------------------
    CORS_ORIGINS: List[str] = Field(
        default=["*"],
        description="Allowed CORS origins",
    )
    CORS_METHODS: List[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        description="Allowed HTTP methods",
    )
    CORS_HEADERS: List[str] = Field(
        default=["*"],
        description="Allowed HTTP headers",
    )

    # --- Languages ------------------------------------------------------------
    SUPPORTED_LANGUAGES: str = Field(
        default="fr,ln,sw",
        description="Supported language codes (comma-separated)",
    )
    DEFAULT_LANGUAGE: str = Field(
        default="fr",
        description="Default application language",
    )

    # --- Business Limits ------------------------------------------------------
    MAX_IMAGE_SIZE_MB: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum image size in megabytes",
    )
    MAX_QUIZ_QUESTIONS_PER_SESSION: int = Field(
        default=20,
        ge=1,
        le=50,
        description="Maximum quiz questions per session",
    )
    MAX_CHAT_HISTORY: int = Field(
        default=20,
        ge=5,
        le=100,
        description="Maximum chat history messages",
    )
    CHILD_MIN_AGE: int = Field(
        default=3,
        ge=2,
        description="Minimum child age",
    )
    CHILD_MAX_AGE: int = Field(
        default=15,
        le=18,
        description="Maximum child age",
    )

    # --- Paths ----------------------------------------------------------------
    BASE_DIR: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parent.parent.parent,
        description="Project root directory",
    )
    DATA_DIR: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parent.parent.parent / "data",
        description="Data directory",
       )
    KNOWLEDGE_DIR: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parent.parent.parent / "data" / "knowledge",
        description="Knowledge base directory",
    )
    MEMORY_DIR: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parent.parent.parent / "data" / "memory",
        description="Session memory directory",
    )

    # =========================================================================
    # Validators
    # =========================================================================

    @field_validator("SUPPORTED_LANGUAGES", mode="before")
    @classmethod
    def validate_and_parse_languages(cls, value: str) -> str:
        """Validate that provided languages are supported."""
        if isinstance(value, str):
            languages = [lang.strip() for lang in value.split(",")]
            valid_languages = {lang.value for lang in SupportedLanguage}
            for language in languages:
                if language not in valid_languages:
                    raise ValueError(
                        f"Unsupported language: '{language}'. "
                        f"Valid languages: {', '.join(valid_languages)}"
                    )
        return value

    # =========================================================================
    # Computed Properties
    # =========================================================================

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT == Environment.PRODUCTION

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT == Environment.DEVELOPMENT

    @property
    def supported_languages_list(self) -> List[str]:
        """Get list of supported language codes."""
        return [lang.strip() for lang in self.SUPPORTED_LANGUAGES.split(",")]

    @property
    def max_image_size_bytes(self) -> int:
        """Get maximum image size in bytes."""
        return self.MAX_IMAGE_SIZE_MB * 1024 * 1024

    @property
    def gemini_generation_config(self) -> dict:
        """Get Gemini generation configuration as dictionary."""
        return {
            "max_output_tokens": self.GEMINI_MAX_TOKENS,
            "temperature": self.GEMINI_TEMPERATURE,
            "top_p": self.GEMINI_TOP_P,
            "top_k": self.GEMINI_TOP_K,
        }

    @property
    def cors_config(self) -> dict:
        """Get CORS configuration as dictionary."""
        return {
            "allow_origins": self.CORS_ORIGINS,
            "allow_methods": self.CORS_METHODS,
            "allow_headers": self.CORS_HEADERS,
            "allow_credentials": True,
        }

    # =========================================================================
    # Utility Methods
    # =========================================================================

    def validate_configuration(self) -> bool:
        """
        Validate that configuration is complete and valid.

        Returns:
            True if configuration is valid.

        Raises:
            ValueError: If critical configuration is missing.
        """
        errors: List[str] = []

        if not self.GEMINI_API_KEY or self.GEMINI_API_KEY.startswith("your_"):
            errors.append(
                "GEMINI_API_KEY is missing or invalid. Set it in the .env file."
            )

        if not self.GROQ_API_KEY:
            errors.append(
                "GROQ_API_KEY is missing. Set it in the .env file. "
                "Get a key at https://console.groq.com"
            )

        if self.is_production and self.SECRET_KEY == "change-this-secret-key-in-production":
            errors.append(
                "SECRET_KEY must be changed in production environment."
            )

        if not self.REDIS_URL:
            errors.append("REDIS_URL is required.")

        if errors:
            raise ValueError(
                "Configuration errors detected:\n" +
                "\n".join(f"  - {error}" for error in errors)
            )

        return True

    def create_directories(self) -> None:
        """Create required directories for application operation."""
        for directory in [self.DATA_DIR, self.KNOWLEDGE_DIR, self.MEMORY_DIR]:
            directory.mkdir(parents=True, exist_ok=True)

    def display_summary(self) -> str:
        """Display configuration summary without sensitive values."""
        groq_status = "✅ définie" if self.GROQ_API_KEY else "❌ MANQUANTE"
        gemini_status = "✅ définie" if self.GEMINI_API_KEY else "❌ MANQUANTE"
        env_file_status = str(_ENV_FILE) if _ENV_FILE else "❌ NON TROUVÉ"

        lines = [
            "=" * 60,
            "  SOMAKID AI Engine - Configuration Summary",
            "=" * 60,
            "",
            f"  .env file         : {env_file_status}",
            f"  Environment       : {self.ENVIRONMENT.value}",
            f"  Debug             : {self.DEBUG}",
            f"  Log Level         : {self.LOG_LEVEL}",
            f"  Server            : {self.HOST}:{self.PORT}",
            f"  Workers           : {self.WORKERS}",
            f"  Gemini API Key    : {gemini_status}",
            f"  Gemini Model      : {self.GEMINI_MODEL}",
            f"  Max Tokens        : {self.GEMINI_MAX_TOKENS}",
            f"  Temperature       : {self.GEMINI_TEMPERATURE}",
            f"  Groq API Key      : {groq_status}",
            f"  Languages         : {', '.join(self.supported_languages_list)}",
            f"  Default Language  : {self.DEFAULT_LANGUAGE}",
            f"  Max Image Size    : {self.MAX_IMAGE_SIZE_MB} MB",
            f"  Rate Limit        : {self.RATE_LIMIT_REQUESTS}/{self.RATE_LIMIT_PERIOD}s",
            f"  Child Age Range   : {self.CHILD_MIN_AGE}-{self.CHILD_MAX_AGE} years",
            f"  Quiz/Session      : {self.MAX_QUIZ_QUESTIONS_PER_SESSION}",
            f"  Chat History      : {self.MAX_CHAT_HISTORY} messages",
            "",
            "=" * 60,
        ]
        return "\n".join(lines)


# =============================================================================
# Global Configuration Instance
# =============================================================================

settings = Settings()


# =============================================================================
# Derived Constants
# =============================================================================

LEVEL_TITLES: dict[int, str] = {
    1: "Junior Explorer",
    2: "Ecology Apprentice",
    3: "Confirmed Explorer",
    4: "Naturalist Expert",
    5: "Climate Guardian",
}

LEVEL_EMOJIS: dict[int, str] = {
    1: "🌱",
    2: "🌿",
    3: "🌳",
    4: "🦁",
    5: "🌍",
}

LEVEL_THRESHOLDS: dict[int, int] = {
    1: 0,
    2: 50,
    3: 150,
    4: 300,
    5: 500,
}

AVAILABLE_BADGES: list[dict] = [
    {
        "id": "first_step",
        "name": "First Step",
        "emoji": "🌱",
        "color": "#38A169",
        "description": "You started your SOMAKID adventure!",
        "condition": {"type": "quiz_completed", "value": 1},
    },
    {
        "id": "explorer_5",
        "name": "Explorer",
        "emoji": "🔬",
        "color": "#3B82F6",
        "description": "You identified 5 species!",
        "condition": {"type": "species_discovered", "value": 5},
    },
    {
        "id": "naturalist_10",
        "name": "Naturalist",
        "emoji": "🌿",
        "color": "#2D9B6E",
        "description": "You identified 10 species!",
        "condition": {"type": "species_discovered", "value": 10},
    },
    {
        "id": "quiz_master_10",
        "name": "Quiz Master",
        "emoji": "⚡",
        "color": "#F59E0B",
        "description": "You completed 10 quizzes!",
        "condition": {"type": "quiz_completed", "value": 10},
    },
    {
        "id": "climate_guardian",
        "name": "Climate Guardian",
        "emoji": "🌍",
        "color": "#8B5CF6",
        "description": "Environmental champion!",
        "condition": {"type": "total_points", "value": 500},
    },
    {
        "id": "mentor_50",
        "name": "Mentor",
        "emoji": "💬",
        "color": "#EC4899",
        "description": "50 conversations with SOMA!",
        "condition": {"type": "chat_messages", "value": 50},
    },
    {
        "id": "hygiene_champion",
        "name": "Champion de l'Hygiene",
        "emoji": "🥇",
        "color": "#2AA9B8",
        "description": "You completed 5 hygiene lessons!",
        "condition": {"type": "health_lessons_completed", "value": 5},
    },
    {
        "id": "health_protector",
        "name": "Protecteur de la Sante",
        "emoji": "🥇",
        "color": "#5B7FDB",
        "description": "You completed 10 health lessons!",
        "condition": {"type": "health_lessons_completed", "value": 10},
    },
    {
        "id": "nutrition_expert",
        "name": "Expert Nutrition",
        "emoji": "🥇",
        "color": "#E4A62B",
        "description": "You passed 3 nutrition quizzes!",
        "condition": {"type": "health_quiz_completed", "value": 3},
    },
    {
        "id": "prevention_hero",
        "name": "Heros de la Prevention",
        "emoji": "🥇",
        "color": "#D9534F",
        "description": "7-day hygiene streak!",
        "condition": {"type": "hygiene_streak_days", "value": 7},
    },
    {
        "id": "health_ambassador",
        "name": "Ambassadeur Sante",
        "emoji": "🥇",
        "color": "#8B5CF6",
        "description": "You earned 300 health points!",
        "condition": {"type": "health_points", "value": 300},
    },
]

MODULE_COLORS: dict[str, str] = {
    "explorer": "#2D9B6E",
    "academy": "#1B6CA8",
    "quiz": "#E8921A",
    "chat": "#8B5CF6",
    "health": "#2AA9B8",
}