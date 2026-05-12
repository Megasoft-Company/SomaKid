"""
SOMAKID AI Engine - Learning Routes
HTTP endpoints for structured learning paths, units, lessons, and exercises.
Inspired by Duolingo's gamified progression system.
"""

from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..deps import get_learning_service, get_lesson_service, get_memory_repository
from ...services.learning_service import LearningService
from ...services.lesson_service import LessonService
from ...repositories.memory_repository import MemoryRepository
from ...core.config import settings
from ...core.exceptions import ValidationException, AIServiceException
from ...core.logging_config import get_logger
from ...core.security import limiter

logger = get_logger(__name__)
router = APIRouter()


class GenerateLessonRequest(BaseModel):
    path_id: str = Field(description="Learning path identifier")
    unit_number: int = Field(ge=1, le=5, description="Unit number")
    lesson_number: int = Field(ge=1, le=4, description="Lesson number")
    langue: str = Field(default="fr", description="Language for lesson content")
    child_age: int = Field(default=8, ge=3, le=15, description="Child's age")
    child_level: int = Field(default=1, ge=1, le=5, description="Child's level")


class GenerateExercisesRequest(BaseModel):
    topic: str = Field(description="Topic for exercises")
    exercise_type: str = Field(default="multiple_choice", description="Type of exercise")
    count: int = Field(default=4, ge=1, le=10, description="Number of exercises")
    langue: str = Field(default="fr", description="Language")
    difficulty: int = Field(default=1, ge=1, le=5, description="Difficulty level")


class GenerateUnitTestRequest(BaseModel):
    path_id: str = Field(description="Learning path identifier")
    unit_number: int = Field(ge=1, le=5, description="Unit number")
    langue: str = Field(default="fr", description="Language")
    question_count: int = Field(default=10, ge=5, le=20, description="Number of questions")


class SubmitExerciseRequest(BaseModel):
    exercise_id: str = Field(description="Exercise identifier")
    lesson_id: str = Field(description="Lesson identifier")
    answer: str = Field(description="User's answer")
    child_id: Optional[str] = Field(default=None, description="Child identifier")
    session_id: Optional[str] = Field(default=None, description="Session identifier")


class SubmitUnitTestRequest(BaseModel):
    test_id: str = Field(description="Test identifier")
    unit_id: str = Field(description="Unit identifier")
    path_id: str = Field(description="Path identifier")
    answers: List[str] = Field(description="List of answers")
    child_id: str = Field(description="Child identifier")
    time_spent_seconds: int = Field(default=0, description="Time spent on test")


class LessonCompleteRequest(BaseModel):
    lesson_id: str = Field(description="Lesson identifier")
    unit_id: str = Field(description="Unit identifier")
    path_id: str = Field(description="Path identifier")
    child_id: str = Field(description="Child identifier")
    score: int = Field(default=100, ge=0, le=100, description="Lesson score")
    time_spent_seconds: int = Field(default=0, description="Time spent on lesson")


@router.get("/paths")
async def get_learning_paths(
    language: str = Query(default="fr"),
    child_id: Optional[str] = Query(default=None),
    learning_service: LearningService = Depends(get_learning_service),
):
    paths = learning_service.get_learning_paths(language=language)
    if child_id:
        for path in paths:
            progress = learning_service.get_child_path_progress(child_id, path["slug"])
            path["progress"] = progress.get("overall_progress", 0)
    return JSONResponse(content={"success": True, "data": paths, "total": len(paths)})


@router.get("/paths/{path_id}")
async def get_learning_path_detail(
    path_id: str,
    language: str = Query(default="fr"),
    child_id: Optional[str] = Query(default=None),
    learning_service: LearningService = Depends(get_learning_service),
):
    path_detail = learning_service.get_path_detail(path_id, language=language)
    if not path_detail:
        raise HTTPException(status_code=404, detail=f"Learning path '{path_id}' not found.")
    if child_id:
        path_detail["child_progress"] = learning_service.get_child_path_progress(child_id, path_id)
    return JSONResponse(content={"success": True, "data": path_detail})


@router.get("/paths/{path_id}/units")
async def get_units_for_path(
    path_id: str,
    language: str = Query(default="fr"),
    child_id: Optional[str] = Query(default=None),
    learning_service: LearningService = Depends(get_learning_service),
):
    units = learning_service.get_units_for_path(path_id, language=language)
    if child_id:
        for unit in units:
            unit["is_completed"] = learning_service.check_unit_completion(child_id, path_id, unit["unit_number"])
            unit["test_passed"] = learning_service.check_test_passed(child_id, path_id, unit["unit_number"])
    return JSONResponse(content={"success": True, "data": units, "total": len(units)})


@router.get("/paths/{path_id}/units/{unit_number}")
async def get_unit_detail(
    path_id: str,
    unit_number: int,
    language: str = Query(default="fr"),
    child_id: Optional[str] = Query(default=None),
    learning_service: LearningService = Depends(get_learning_service),
):
    if not 1 <= unit_number <= 5:
        raise HTTPException(status_code=400, detail="Unit number must be between 1 and 5.")
    unit_detail = learning_service.get_unit_detail(path_id, unit_number, language=language)
    if not unit_detail:
        raise HTTPException(status_code=404, detail=f"Unit {unit_number} not found in path '{path_id}'.")
    if child_id:
        unit_detail["child_progress"] = learning_service.get_child_unit_progress(child_id, path_id, unit_number)
    return JSONResponse(content={"success": True, "data": unit_detail})


@router.post("/lessons/generate")
@limiter.limit("20/minute")
async def generate_lesson(
    request: Request,
    body: GenerateLessonRequest,
    lesson_service: LessonService = Depends(get_lesson_service),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    try:
        lesson = await lesson_service.generate_lesson(
            path_id=body.path_id,
            unit_number=body.unit_number,
            lesson_number=body.lesson_number,
            language=body.langue,
            child_age=body.child_age,
            child_level=body.child_level,
        )
        memory_repo.save_progress(f"lesson:{lesson.get('id')}", lesson)
        return JSONResponse(content={"success": True, "data": lesson})
    except ValidationException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)
    except AIServiceException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)


@router.get("/lessons/{lesson_id}")
async def get_lesson_detail(
    lesson_id: str,
    language: str = Query(default="fr"),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    lesson = memory_repo.load_progress(f"lesson:{lesson_id}")
    if not lesson:
        raise HTTPException(status_code=404, detail=f"Lesson '{lesson_id}' not found.")
    return JSONResponse(content={"success": True, "data": lesson})


@router.post("/lessons/complete")
async def complete_lesson(
    body: LessonCompleteRequest,
    learning_service: LearningService = Depends(get_learning_service),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    try:
        result = learning_service.mark_lesson_completed(
            child_id=body.child_id,
            path_id=body.path_id,
            unit_id=body.unit_id,
            lesson_id=body.lesson_id,
            score=body.score,
            time_spent_seconds=body.time_spent_seconds,
        )
        all_lessons_done = learning_service.check_all_lessons_completed(body.child_id, body.path_id, body.unit_id)
        return JSONResponse(content={
            "success": True,
            "data": {
                "lesson_completed": True,
                "score": body.score,
                "points_earned": body.score,
                "all_lessons_completed": all_lessons_done,
                "can_take_test": all_lessons_done,
                "next_action": "take_unit_test" if all_lessons_done else "continue_lessons",
            },
        })
    except ValidationException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)


@router.post("/exercises/generate")
@limiter.limit("30/minute")
async def generate_exercises(
    request: Request,
    body: GenerateExercisesRequest,
    lesson_service: LessonService = Depends(get_lesson_service),
):
    try:
        exercises = await lesson_service.generate_exercises(
            topic=body.topic,
            exercise_type=body.exercise_type,
            count=body.count,
            language=body.langue,
            difficulty=body.difficulty,
        )
        return JSONResponse(content={"success": True, "data": exercises, "total": len(exercises)})
    except ValidationException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)


@router.post("/exercises/submit")
async def submit_exercise(
    body: SubmitExerciseRequest,
    lesson_service: LessonService = Depends(get_lesson_service),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    exercise = memory_repo.load_progress(f"exercise:{body.exercise_id}")
    if not exercise:
        cached = memory_repo.load_progress(f"lesson:{body.lesson_id}")
        exercises = cached.get("exercises", []) if cached else []
        exercise = next((ex for ex in exercises if ex.get("id") == body.exercise_id), None)
    if not exercise:
        raise HTTPException(status_code=404, detail=f"Exercise '{body.exercise_id}' not found.")

    result = lesson_service.evaluate_exercise(exercise, body.answer)

    if body.child_id and body.session_id:
        memory_repo.save_progress(
            f"exercise_result:{body.child_id}:{body.exercise_id}",
            {"exercise_id": body.exercise_id, "answer": body.answer, "is_correct": result["is_correct"], "points_earned": result["points_earned"], "timestamp": datetime.now(timezone.utc).isoformat()},
        )

    return JSONResponse(content={"success": True, "data": result})


@router.get("/exercises/types")
async def get_exercise_types(
    language: str = Query(default="fr"),
    lesson_service: LessonService = Depends(get_lesson_service),
):
    types = lesson_service.get_exercise_types(language=language)
    return JSONResponse(content={"success": True, "data": types})


@router.post("/tests/generate")
@limiter.limit("10/minute")
async def generate_unit_test(
    request: Request,
    body: GenerateUnitTestRequest,
    lesson_service: LessonService = Depends(get_lesson_service),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    try:
        test = await lesson_service.generate_unit_test(
            path_id=body.path_id,
            unit_number=body.unit_number,
            language=body.langue,
            question_count=body.question_count,
        )
        memory_repo.save_progress(f"unit_test:{test.get('id')}", test)
        return JSONResponse(content={"success": True, "data": test})
    except ValidationException as e:
        raise HTTPException(status_code=e.http_status, detail=e.message)


@router.post("/tests/submit")
async def submit_unit_test(
    body: SubmitUnitTestRequest,
    lesson_service: LessonService = Depends(get_lesson_service),
    learning_service: LearningService = Depends(get_learning_service),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
):
    test = memory_repo.load_progress(f"unit_test:{body.test_id}")
    if not test:
        raise HTTPException(status_code=404, detail=f"Test '{body.test_id}' not found.")

    questions = test.get("questions", [])
    passing_score = test.get("passing_score", 70)
    correct_count = 0

    for i, (question, answer) in enumerate(zip(questions, body.answers)):
        if i >= len(questions):
            break
        exercise = {
            "exercise_type": question.get("exercise_type", "multiple_choice"),
            "correct_answer": question.get("correct_answer", question.get("correct", 0)),
            "keywords": question.get("keywords", []),
        }
        result = lesson_service.evaluate_exercise(exercise, answer)
        if result["is_correct"]:
            correct_count += 1

    score = int((correct_count / len(questions)) * 100) if questions else 0
    passed = score >= passing_score

    if passed and body.child_id:
        learning_service.unlock_next_unit(child_id=body.child_id, path_id=body.path_id, current_unit=test.get("unit_number", 1))

    memory_repo.save_progress(
        f"test_result:{body.child_id}:{body.test_id}",
        {"test_id": body.test_id, "path_id": body.path_id, "unit_id": body.unit_id, "score": score, "passed": passed, "total_questions": len(questions), "correct_answers": correct_count, "time_spent_seconds": body.time_spent_seconds, "completed_at": datetime.now(timezone.utc).isoformat()},
    )

    return JSONResponse(content={
        "success": True,
        "data": {"score": score, "passing_score": passing_score, "passed": passed, "correct_answers": correct_count, "total_questions": len(questions), "grade": "A" if score >= 90 else "B" if score >= 80 else "C" if score >= 70 else "D", "next_action": "next_unit_unlocked" if passed else "retry_test"},
    })


@router.get("/progress/{child_id}")
async def get_child_learning_progress(
    child_id: str,
    path_id: Optional[str] = Query(default=None),
    learning_service: LearningService = Depends(get_learning_service),
):
    if path_id:
        progress = learning_service.get_child_path_progress(child_id, path_id)
    else:
        progress = learning_service.get_all_progress(child_id)
    return JSONResponse(content={"success": True, "data": progress})


@router.get("/progress/{child_id}/streak")
async def get_child_streak(
    child_id: str,
    learning_service: LearningService = Depends(get_learning_service),
):
    streak = learning_service.get_streak_info(child_id)
    return JSONResponse(content={"success": True, "data": streak})