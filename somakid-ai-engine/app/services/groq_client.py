"""
SOMAKID AI Engine - Groq Client
Low-level client used as a text-generation fallback when Gemini is rate-limited.
"""

import asyncio
import time
from typing import Optional

from groq import Groq

from ..core.exceptions import AIServiceException
from ..core.logging_config import get_logger, log_performance

logger = get_logger(__name__)

TEXT_MODEL = "llama-3.3-70b-versatile"


class GroqClient:
    def __init__(self, api_key: str, model_name: str = TEXT_MODEL):
        if not api_key:
            raise AIServiceException("Groq API key is required.")
        self.model_name = model_name
        self.client = Groq(api_key=api_key)

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        start_time = time.time()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model_name,
                messages=messages,
                temperature=0.4,
                max_tokens=1024,
            )
            duration_ms = (time.time() - start_time) * 1000
            log_performance(logger, "groq_text_generation", duration_ms=duration_ms, prompt_length=len(prompt))
            return response.choices[0].message.content
        except Exception as e:
            raise AIServiceException(f"Groq text generation failed: {str(e)}")
