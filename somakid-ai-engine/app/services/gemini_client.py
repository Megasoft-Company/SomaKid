"""
SOMAKID AI Engine - Google Gemini Client
Low-level client for communicating with the Google Gemini API.
"""

import asyncio
import time
import io
from typing import Optional, Dict, Any, List

import google.generativeai as genai
from google.generativeai import GenerativeModel
from google.generativeai.types import GenerationConfig
from google.api_core import exceptions as google_exceptions
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from ..core.config import settings
from ..core.exceptions import AIServiceException, RateLimitException
from ..core.logging_config import get_logger, log_performance, log_error

logger = get_logger(__name__)

TEXT_MODEL = "gemini-2.5-flash-lite"


class GeminiClient:
    RETRYABLE_EXCEPTIONS = (
        google_exceptions.ServiceUnavailable,
        google_exceptions.ResourceExhausted,
        google_exceptions.InternalServerError,
        google_exceptions.DeadlineExceeded,
        ConnectionError,
        TimeoutError,
    )

    def __init__(self, api_key: str, model_name: str = TEXT_MODEL, generation_config: Optional[Dict[str, Any]] = None):
        if not api_key:
            raise AIServiceException("Gemini API key is required.")
        self.api_key = api_key
        self.model_name = model_name
        self.generation_config = generation_config or settings.gemini_generation_config
        try:
            genai.configure(api_key=self.api_key)
            generation_config_obj = GenerationConfig(
                max_output_tokens=self.generation_config.get("max_output_tokens", 512),
                temperature=self.generation_config.get("temperature", 0.6),
                top_p=self.generation_config.get("top_p", 0.95),
                top_k=self.generation_config.get("top_k", 40),
            )
            self.text_model = GenerativeModel(model_name=TEXT_MODEL, generation_config=generation_config_obj)
            self.vision_model = GenerativeModel(model_name=TEXT_MODEL, generation_config=generation_config_obj)
            logger.info("gemini_client_initialized", model=TEXT_MODEL)
        except Exception as e:
            logger.error("gemini_client_init_failed", error=str(e))
            raise AIServiceException(f"Failed to initialize Gemini client: {str(e)}")

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=10), retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS))
    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        start_time = time.time()
        try:
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            response = await asyncio.to_thread(self.text_model.generate_content, full_prompt)
            duration_ms = (time.time() - start_time) * 1000
            log_performance(logger, "gemini_text_generation", duration_ms=duration_ms, prompt_length=len(prompt))
            return response.text
        except google_exceptions.ResourceExhausted:
            raise RateLimitException("AI service rate limit exceeded.")
        except self.RETRYABLE_EXCEPTIONS as e:
            raise AIServiceException(f"AI text generation failed: {str(e)}")

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=10), retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS))
    async def generate_with_image(self, prompt: str, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        start_time = time.time()
        try:
            image_part = {"mime_type": mime_type, "data": image_bytes}
            response = await asyncio.to_thread(self.vision_model.generate_content, [prompt, image_part])
            duration_ms = (time.time() - start_time) * 1000
            log_performance(logger, "gemini_vision_generation", duration_ms=duration_ms, image_size_bytes=len(image_bytes))
            return response.text
        except google_exceptions.ResourceExhausted:
            raise RateLimitException("AI vision service rate limit exceeded.")
        except self.RETRYABLE_EXCEPTIONS as e:
            raise AIServiceException(f"AI vision analysis failed: {str(e)}")

    @staticmethod
    def extract_json_from_response(text: str) -> Dict[str, Any]:
        import json
        cleaned = text.strip()
        try: return json.loads(cleaned)
        except json.JSONDecodeError: pass
        if "`json" in cleaned:
            cleaned = cleaned.split("`json")[1]
            if "`" in cleaned: cleaned = cleaned.split("`")[0]
        elif "`" in cleaned:
            cleaned = cleaned.split("`")[1]
            if "`" in cleaned: cleaned = cleaned.split("`")[0]
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and start < end:
            try: return json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError: pass
        raise AIServiceException("No valid JSON found in AI response.")

    async def health_check(self) -> Dict[str, Any]:
        try:
            start = time.time()
            response = await self.generate_text(prompt="Respond with 'OK' only.")
            duration_ms = (time.time() - start) * 1000
            return {"status": "healthy", "model": self.model_name, "latency_ms": round(duration_ms, 2), "response_ok": "OK" in response}
        except Exception as e:
            return {"status": "unhealthy", "model": self.model_name, "error": str(e)}
