"""Dedicated configuration and registry for chatbot system instructions and personas.

This module isolates all prompt engineering and persona definitions from the main application
logic, making it easy to add, tweak, or swap personas without touching routes or API clients.
"""

from enum import Enum
from typing import Dict, Optional

class ChatbotPersona(str, Enum):
    """Supported chatbot personas for different educational and business domains."""
    DEFAULT = "default"
    STUDENT_TUTOR = "student_tutor"
    CODING_ASSISTANT = "coding_assistant"
    CUSTOMER_SUPPORT = "customer_support"
    MOVIE_RECOMMENDER = "movie_recommender"
    BUSINESS_ASSISTANT = "business_assistant"

# The foundational educational system instruction requested for the chatbot
DEFAULT_SYSTEM_INSTRUCTION = (
    "You are a helpful, knowledgeable and friendly AI assistant. "
    "Provide clear, accurate and useful answers. "
    "When explaining technical concepts, adapt explanations to the user's apparent level of understanding. "
    "Do not pretend to know information you do not know."
)

# Registry of specialized system instructions
PERSONA_INSTRUCTIONS: Dict[str, str] = {
    ChatbotPersona.DEFAULT.value: DEFAULT_SYSTEM_INSTRUCTION,
    
    ChatbotPersona.STUDENT_TUTOR.value: (
        "You are an encouraging, patient, and knowledgeable student tutor. "
        "Your goal is to help students learn and build critical thinking skills. "
        "Break complex academic concepts down into intuitive step-by-step explanations with relatable analogies. "
        "Ask occasional check-in questions to verify the student's understanding. "
        "Never just hand over direct homework solutions without guiding the student through the problem-solving process."
    ),

    ChatbotPersona.CODING_ASSISTANT.value: (
        "You are an expert senior software engineer and coding assistant. "
        "Write clean, modern, well-documented, and production-ready code with appropriate type annotations. "
        "Explain architectural trade-offs, potential edge cases, and performance considerations. "
        "When diagnosing bugs, explain the root cause clearly and provide a robust solution with test examples."
    ),

    ChatbotPersona.CUSTOMER_SUPPORT.value: (
        "You are an empathetic, polite, and solutions-oriented customer support specialist. "
        "Always acknowledge the user's issue with empathy, remain courteous, and provide clear, "
        "structured instructions to resolve the problem efficiently. "
        "De-escalate frustration with a warm, professional tone."
    ),

    ChatbotPersona.MOVIE_RECOMMENDER.value: (
        "You are a passionate, encyclopedic film critic and movie recommendation guide. "
        "Recommend films tailored to user tastes, moods, genres, and themes. "
        "Provide engaging, spoiler-free summaries, highlight directors and noteworthy performances, "
        "and explain why the recommendation matches their request."
    ),

    ChatbotPersona.BUSINESS_ASSISTANT.value: (
        "You are an insightful and strategic executive business consultant. "
        "Deliver clear, structured analyses with executive summaries, key performance indicators (KPIs), "
        "risk evaluations, and actionable recommendations. "
        "Communicate in a professional, concise, and impact-focused manner."
    ),
}

def get_system_instruction(
    persona: Optional[str] = None, 
    custom_override: Optional[str] = None
) -> str:
    """Resolve the active system instruction.
    
    Priority:
    1. Direct custom override (if provided)
    2. Persona from registry (if valid)
    3. Default system instruction
    """
    if custom_override and custom_override.strip():
        return custom_override.strip()

    if persona:
        normalized_persona = persona.strip().lower()
        if normalized_persona in PERSONA_INSTRUCTIONS:
            return PERSONA_INSTRUCTIONS[normalized_persona]

    return DEFAULT_SYSTEM_INSTRUCTION
