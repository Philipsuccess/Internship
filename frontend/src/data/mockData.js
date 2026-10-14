/**
 * Mock data and response generator for testing UI states, responsiveness,
 * and conversational flows before integrating live backend API.
 */

export const INITIAL_SAMPLE_MESSAGES = [
  {
    id: 'sample-1',
    role: 'user',
    content: 'Can you explain the difference between synchronous and asynchronous code in simple terms?',
    timestamp: '10:42 AM',
  },
  {
    id: 'sample-2',
    role: 'assistant',
    content: `Certainly! Here is a simple everyday analogy to understand **Synchronous** vs **Asynchronous** execution:

### 🍳 The Breakfast Analogy

* **Synchronous (Blocking):**
  Imagine cooking breakfast where you must finish each step before starting the next:
  1. Put bread in toaster $\\rightarrow$ *stand still and wait 2 minutes*.
  2. Start coffee machine $\\rightarrow$ *stand still and wait 3 minutes*.
  3. Fry an egg $\\rightarrow$ *wait 2 minutes*.
  Total time: **7 minutes**, during which you did nothing else.

* **Asynchronous (Non-blocking):**
  How people actually make breakfast:
  1. Put bread in toaster and press start.
  2. While the toast browns, start the coffee machine.
  3. While both brew and toast, crack the egg onto the pan.
  Total time: **~3 minutes**, because operations occur concurrently while waiting for external I/O!

### 💻 In Web Development
In backend frameworks like **FastAPI**, \`async def\` endpoints allow the server to handle other incoming requests while waiting for slow operations like database queries or external API calls (such as the Gemini API) to finish.`,
    timestamp: '10:42 AM',
  },
];

export const SUGGESTED_PROMPTS = [
  {
    icon: '⚡',
    title: 'Explain Async in FastAPI',
    prompt: 'How does FastAPI achieve high performance with Python async/await?',
  },
  {
    icon: '🧠',
    title: 'Explain Large Language Models',
    prompt: 'How do LLMs predict the next token in a sentence? Explain simply with an analogy.',
  },
  {
    icon: '🛠️',
    title: 'Write a Python Utility',
    prompt: 'Write a clean Python function with type hints to safely parse and validate an API JSON response.',
  },
  {
    icon: '🎨',
    title: 'Frontend Architecture Tips',
    prompt: 'What are the top 3 best practices for managing state in modern React applications?',
  },
];

/**
 * Generate contextually realistic mock AI responses with markdown formatting
 * to verify message bubbles, code blocks, lists, and layout.
 */
export async function getMockAiResponse(prompt) {
  // Realistic delay to thoroughly test loading state and animations
  await new Promise((resolve) => setTimeout(resolve, 1100));

  const lower = prompt.toLowerCase();

  if (lower.includes('async') || lower.includes('fastapi')) {
    return `### FastAPI Asynchronous Architecture

FastAPI is built on top of **Starlette** (for ASGI web routing) and **Pydantic** (for data validation).

Key benefits of FastAPI's async design:
1. **Event Loop Non-Blocking**: Handlers declared with \`async def\` release the main thread during I/O awaits.
2. **Automatic Concurrency**: Under high load, thousands of concurrent requests can be handled on a single worker.

\`\`\`python
from fastapi import FastAPI
import asyncio

app = FastAPI()

@app.get("/items")
async def get_items():
    # Non-blocking wait (e.g. database query or AI API call)
    await asyncio.sleep(0.5)
    return {"status": "success", "items": ["Item A", "Item B"]}
\`\`\`

> **Note**: For CPU-bound tasks (like image processing), traditional worker pools or background tasks are recommended over raw async coroutines.`;
  }

  if (lower.includes('llm') || lower.includes('token') || lower.includes('model')) {
    return `### How Large Language Models Work

At their foundation, modern models like **Google Gemini** are sequence-to-sequence transformers trained on vast amounts of multimodal data.

Here is the step-by-step pipeline:
1. **Tokenization**: Input text is sliced into sub-word tokens (e.g., words, syllables, or character fragments).
2. **Embedding & Attention**: Self-attention layers compute relationships between every token in the context window.
3. **Probability Distribution**: The model outputs a probability distribution over the entire vocabulary for what token should come next.
4. **Sampling**: Based on temperature and top-p settings, the next token is picked and fed back into the model recursively.`;
  }

  if (lower.includes('python') || lower.includes('code') || lower.includes('function')) {
    return `Here is a robust, production-ready Python utility function with type annotations and error handling:

\`\`\`python
from typing import Any, Dict, Optional
import json

def parse_api_payload(raw_json: str) -> Optional[Dict[str, Any]]:
    """Safely parse and validate a JSON string payload.
    
    Args:
        raw_json: Incoming raw JSON string.
        
    Returns:
        Dict if parsing succeeded, None if invalid.
    """
    if not raw_json or not raw_json.strip():
        return None
        
    try:
        data = json.loads(raw_json)
        if isinstance(data, dict):
            return data
        return None
    except (json.JSONDecodeError, ValueError) as err:
        print(f"Failed to parse payload: {err}")
        return None
\`\`\`

You can integrate this directly into your data validation pipeline!`;
  }

  // Default intelligent educational response
  return `Thank you for asking: *"**${prompt.trim()}**"*

Here is a structured overview:

* **Key Takeaway**: In modern full-stack systems, clean separation of concerns between state management, network transport, and visual presentation ensures high reliability.
* **Component Modularity**: Breaking down UIs into focused components like \`ChatWindow\`, \`MessageBubble\`, and \`ChatInput\` makes testing and accessibility straightforward.
* **Next Steps**: When we connect this interface to Google's live **Gemini 3.8 Flash** model, responses will stream back with real-time reasoning and deep educational insights.

Is there anything specific you would like to test or modify in this conversation layout?`;
}
