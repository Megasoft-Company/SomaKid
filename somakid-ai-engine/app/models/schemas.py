"""
SOMAKID AI Engine - Pydantic Schemas
Request/response validation schemas for all API endpoints.
Defines the contract between client and server.
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum


# =============================================================================
# Enumerations
# =============================================================================

class LanguageEnum(str, Enum):
    """Supported languages for SOMAKID AI."""
    FRENCH = "fr"
    LINGALA = "ln"
    SWAHILI = "sw"


class SpeciesCategoryEnum(str, Enum):
    """Species categories for identification."""
    PLANT = "plant"
    ANIMAL = "animal"
    INSECT = "insect"
    FUNGUS = "fungus"
    OTHER = "other"


class QuizSubjectEnum(str, Enum):
    """Available quiz subjects."""
    BIODIVERSITY = "biodiversity"
    CLIMATE = "climate"
    DISASTERS = "disasters"
    BEHAVIORS = "behaviors"


class DangerLevelEnum(str, Enum):
    """Species danger levels."""
    NONE = "none"
    LOW = "low"
    MODERATE = "moderate"


class MessageRoleEnum(str, Enum):
    """Chat message roles."""
    USER = "user"
    ASSISTANT = "assistant"


class UserRoleEnum(str, Enum):
    """User roles in the platform."""
    PARENT = "parent"
    TEACHER = "teacher"
    ADMIN = "admin"


class ModuleEnum(str, Enum):
    """Application modules."""
    EXPLORER = "explorer"
    ACADEMY = "academy"
    QUIZ = "quiz"
    CHAT = "chat"


# =============================================================================
# Base Schemas
# =============================================================================

class BaseResponse(BaseModel):
    """Base response schema for all API endpoints."""
    success: bool = Field(default=True, description="Whether the request succeeded")
    message: Optional[str] = Field(default=None, description="Informational message")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Response timestamp in ISO 8601 format",
    )


class ErrorResponse(BaseModel):
    """Standardized error response schema."""
    success: bool = Field(default=False)
    error_code: str = Field(description="Unique error code identifier")
    message: str = Field(description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional error details")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )


class Pagination(BaseModel):
    """Pagination metadata schema."""
    page: int = Field(default=1, ge=1, description="Current page number")
    per_page: int = Field(default=20, ge=1, le=100, description="Items per page")
    total: int = Field(description="Total number of items")
    pages: int = Field(description="Total number of pages")


# =============================================================================
# User and Child Schemas
# =============================================================================

class CreateParentRequest(BaseModel):
    """Schema for parent account creation."""
    last_name: str = Field(min_length=2, max_length=100, alias="nom")
    first_name: str = Field(min_length=2, max_length=100, alias="prenom")
    email: str = Field(max_length=255, description="Parent email address")
    password: str = Field(min_length=8, max_length=128, alias="mot_de_passe")
    password_confirmation: str = Field(alias="confirmation_mot_de_passe")
    language: LanguageEnum = Field(default=LanguageEnum.FRENCH, alias="langue")
    country: str = Field(default="CD", min_length=2, max_length=2, alias="pays")

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        """Validate and normalize email address."""
        import re
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, value):
            raise ValueError("Invalid email format")
        return value.lower().strip()

    @model_validator(mode="after")
    def validate_passwords_match(self) -> "CreateParentRequest":
        """Ensure password and confirmation match."""
        if self.password != self.password_confirmation:
            raise ValueError("Passwords do not match")
        return self


class LoginParentRequest(BaseModel):
    """Schema for parent login."""
    email: str = Field(description="Parent email address")
    password: str = Field(alias="mot_de_passe", description="Parent password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        """Normalize email to lowercase."""
        return value.lower().strip()


class CreateChildRequest(BaseModel):
    """Schema for child profile creation."""
    first_name: str = Field(min_length=2, max_length=50, alias="prenom")
    age: int = Field(ge=3, le=15, description="Child age")
    avatar: str = Field(default="🦁", max_length=5, description="Avatar emoji")
    pin_code: str = Field(min_length=4, max_length=4, alias="code_pin", description="4-digit PIN")
    language: LanguageEnum = Field(default=LanguageEnum.FRENCH, alias="langue")

    @field_validator("pin_code")
    @classmethod
    def validate_pin(cls, value: str) -> str:
        """Validate PIN is exactly 4 digits."""
        if not value.isdigit() or len(value) != 4:
            raise ValueError("PIN must contain exactly 4 digits")
        return value


class ChildInfo(BaseModel):
    """Schema for child information."""
    id: str
    first_name: str = Field(alias="prenom")
    age: int
    avatar: str
    language: LanguageEnum = Field(alias="langue")
    total_points: int = Field(default=0, alias="points_total")
    level: int = Field(default=1, ge=1, le=5, alias="niveau")
    title: str = Field(default="Junior Explorer", alias="titre")
    badges: List[Dict[str, Any]] = Field(default_factory=list)
    species_discovered: List[str] = Field(default_factory=list, alias="especes_decouvertes")
    quiz_completed: int = Field(default=0, alias="quiz_completes")
    created_at: Optional[str] = Field(default=None, alias="date_creation")
    last_activity: Optional[str] = Field(default=None, alias="derniere_activite")


class ParentInfo(BaseModel):
    """Schema for parent information."""
    id: str
    last_name: str = Field(alias="nom")
    first_name: str = Field(alias="prenom")
    email: str
    language: LanguageEnum = Field(alias="langue")
    country: str = Field(alias="pays")
    role: UserRoleEnum
    children: List[ChildInfo] = Field(default_factory=list, alias="enfants")


# =============================================================================
# Vision Analysis Schemas
# =============================================================================

class AnalyseImageResult(BaseModel):
    """Schema for image analysis result."""
    espece: str = Field(description="Identified species name")
    nom_local: Optional[str] = Field(default=None, description="Local African name")
    categorie: str = Field(default="other", description="Species category")
    description_enfant: str = Field(description="Child-friendly description")
    role_ecologique: str = Field(description="Ecological role")
    fait_amusant: str = Field(description="Fun fact")
    menaces: Optional[str] = Field(default=None, description="Threats to the species")
    action_enfant: str = Field(description="Action child can take")
    emoji: str = Field(default="🌿", description="Representative emojis")
    niveau_danger: str = Field(default="none", description="Danger level")
    conseils_securite: Optional[str] = Field(default=None, description="Safety advice")
    points_gagnes: int = Field(default=10, ge=0, description="Points earned")
    titre_gardien: Optional[str] = Field(default=None, description="Guardian title")
    confiance: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Confidence score")


class VisionAnalyzeResponse(BaseResponse):
    """Schema for vision analysis response."""
    data: AnalyseImageResult


# =============================================================================
# Quiz Schemas
# =============================================================================

class GenerationQuizRequete(BaseModel):
    """Schema for quiz generation request."""
    sujet: str = Field(description="Quiz subject")
    niveau: int = Field(default=1, ge=1, le=5, description="Difficulty level (1-5)")
    langue: str = Field(default="fr", description="Quiz language")
    identifiant_session: Optional[str] = Field(default=None, description="Session ID")


class QuestionQuiz(BaseModel):
    """Schema for a quiz question."""
    identifiant: str = Field(description="Unique question ID")
    question: str = Field(description="The question text")
    options: List[str] = Field(min_length=2, max_length=4, description="Answer options")
    reponse_correcte: int = Field(ge=0, le=3, description="Correct answer index")
    explication: str = Field(description="Explanation of the correct answer")
    fait_bonus: Optional[str] = Field(default=None, description="Bonus fun fact")
    points: int = Field(default=10, description="Points for correct answer")
    emoji_sujet: str = Field(default="🌿", description="Subject emoji")
    message_felicitations: str = Field(description="Congratulations message")
    conseil_pratique: Optional[str] = Field(default=None, description="Practical tip")


class ReponseQuizRequete(BaseModel):
    """Schema for quiz answer submission."""
    identifiant_question: str = Field(description="Question ID")
    reponse_donnee: int = Field(ge=0, le=3, description="Chosen answer index")
    temps_reponse_ms: Optional[int] = Field(default=None, description="Response time in ms")
    identifiant_session: str = Field(description="Session ID")
    identifiant_enfant: Optional[str] = Field(default=None, description="Child ID")
    langue: str = Field(default="fr", description="Language for result message")
    
class ResultatQuiz(BaseModel):
    """Schema for quiz answer result."""
    est_correcte: bool = Field(description="Whether answer is correct")
    reponse_correcte: int = Field(description="Correct answer index")
    explication: str = Field(description="Detailed explanation")
    points_gagnes: int = Field(default=0, description="Points earned")
    message: str = Field(description="Encouragement message")


class QuizGenerateResponse(BaseResponse):
    """Schema for quiz generation response."""
    data: QuestionQuiz


class QuizSubmitResponse(BaseResponse):
    """Schema for quiz submission response."""
    data: ResultatQuiz


# =============================================================================
# Chat Schemas
# =============================================================================

class MessageChat(BaseModel):
    """Schema for a chat message."""
    role: str = Field(description="Message role (user or assistant)")
    contenu: str = Field(min_length=1, max_length=1000, description="Message content")


class ChatRequete(BaseModel):
    """Schema for chat request."""
    message: str = Field(min_length=1, max_length=1000, description="Child's message")
    langue: str = Field(default="fr", description="Conversation language")
    identifiant_session: str = Field(description="Session ID")
    historique: Optional[List[MessageChat]] = Field(default=None, max_length=20, description="Recent history")


class ChatReponse(BaseModel):
    """Schema for SOMA tutor response."""
    reponse: str = Field(description="SOMA's response text")
    suggestion_activite: Optional[str] = Field(default=None, description="Activity suggestion")
    points_gagnes: int = Field(default=5, description="Points earned")
    badge_debloque: Optional[str] = Field(default=None, description="Badge unlocked")
    question_suivi: Optional[str] = Field(default=None, description="Follow-up question")


class ChatResponse(BaseResponse):
    """Schema for chat API response."""
    data: ChatReponse


# =============================================================================
# Progression Schemas
# =============================================================================

class ProgressionRequete(BaseModel):
    """Schema for progression update request."""
    identifiant_session: str = Field(description="Session ID")
    module: str = Field(description="Module name")
    score: int = Field(default=0, ge=0, description="Score to add")
    temps_passe: int = Field(default=0, ge=0, alias="temps_passe_secondes", description="Time spent in seconds")


class Badge(BaseModel):
    """Schema for a badge."""
    identifiant: str = Field(alias="id", description="Badge ID")
    nom: str = Field(alias="name", description="Badge name")
    description: str = Field(description="Badge description")
    emoji: str = Field(description="Badge emoji")
    couleur: str = Field(alias="color", description="Badge color (hex)")
    obtenu_le: Optional[str] = Field(default=None, description="Date earned")


class ProgressionEnfant(BaseModel):
    """Schema for child progression data."""
    identifiant_session: str = Field(description="Session ID")
    identifiant_enfant: Optional[str] = Field(default=None, description="Child ID")
    points_total: int = Field(default=0, description="Total points")
    niveau: int = Field(default=1, ge=1, le=5, description="Current level")
    titre: str = Field(default="Junior Explorer", description="Level title")
    badges: List[Badge] = Field(default_factory=list, description="Earned badges")
    especes_decouvertes: List[str] = Field(default_factory=list, description="Discovered species")
    quiz_completes: int = Field(default=0, description="Quizzes completed")
    total_messages: int = Field(default=0, description="Total messages exchanged")
    derniere_activite: Optional[str] = Field(default=None, description="Last activity timestamp")


class ProgressionResponse(BaseResponse):
    """Schema for progression API response."""
    data: ProgressionEnfant


# =============================================================================
# Voice Schemas
# =============================================================================

class SyntheseVocaleRequete(BaseModel):
    """Schema for text-to-speech request."""
    texte: str = Field(min_length=1, max_length=5000, description="Text to synthesize")
    langue: str = Field(default="fr", description="Language for synthesis")
    vitesse: float = Field(default=1.0, ge=0.5, le=2.0, description="Speech speed")


class ReconnaissanceVocaleRequete(BaseModel):
    """Schema for speech-to-text request."""
    audio_base64: str = Field(description="Base64 encoded audio")
    langue: str = Field(default="fr", description="Language for recognition")
    identifiant_session: str = Field(description="Session ID")


# =============================================================================
# Module Schemas
# =============================================================================

class ModuleApplication(BaseModel):
    """Schema for an application module."""
    identifiant: str = Field(description="Module ID")
    nom: str = Field(description="Module name")
    description: str = Field(description="Module description")
    emoji: str = Field(description="Module emoji")
    couleur: str = Field(description="Module color (hex)")
    niveaux: Optional[int] = Field(default=None, description="Number of levels")


class ModulesResponse(BaseResponse):
    """Schema for modules list response."""
    data: List[ModuleApplication]