/**
 * API Service Layer for Communicating with FastAPI Backend
 * Handles /health checks and /api/chat requests with comprehensive error and timeout handling.
 */

// Normalize base URL by removing any trailing slash to avoid double-slash routes
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');
const DEFAULT_TIMEOUT_MS = 30000; // 30-second client-side timeout

/**
 * Perform health check against the FastAPI backend
 * @returns {Promise<{ status: string, message: string, model_configured: string }>}
 */
export async function checkBackendHealth() {
  const url = `${API_BASE_URL}/health`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to connect to backend health check:', error);
    throw error;
  }
}

/**
 * Send a user message and conversation history to POST /api/chat
 * @param {string} message - Current user message
 * @param {Array<{ role: string, content: string }>} [conversationHistory=[]] - Prior messages
 * @param {string|null} [persona=null] - Optional persona identifier for backend system instruction
 * @param {string|null} [sessionId=null] - Optional session ID for future persistence
 * @returns {Promise<{ response: string, session_id?: string }>} - Generated AI response from backend
 */
export async function sendChatMessage(message, conversationHistory = [], persona = null, sessionId = null) {
  const url = `${API_BASE_URL}/api/chat`;

  // Normalize message history to { role, content } expected by FastAPI Pydantic schema
  const formattedHistory = conversationHistory.map((item) => ({
    role: item.role === 'assistant' ? 'model' : item.role,
    content: item.content,
  }));

  // Client-side offline check
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine) {
    throw new Error('You are currently offline. Please check your internet connection.');
  }

  // Pre-flight character limit check
  if (message && message.length > 10000) {
    throw new Error('Message exceeds the maximum limit of 10,000 characters.');
  }

  const payload = {
    message,
    conversation_history: formattedHistory,
  };

  if (persona) {
    payload.persona = persona;
  }
  if (sessionId) {
    payload.session_id = sessionId;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      let errorDetail = `Backend server returned status ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          if (typeof errorJson.detail === 'string') {
            errorDetail = errorJson.detail;
          } else if (Array.isArray(errorJson.detail) && errorJson.detail[0]?.msg) {
            errorDetail = errorJson.detail[0].msg;
          } else {
            errorDetail = JSON.stringify(errorJson.detail);
          }
        }
      } catch {
        if (response.statusText) {
          errorDetail = `${response.status} ${response.statusText}`;
        }
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    // Handle timeout
    if (err.name === 'TimeoutError' || (err.name === 'AbortError' && err.message?.includes('timeout'))) {
      throw new Error(
        'Request timed out. The AI model is taking longer than expected. Please try again.'
      );
    }

    // Handle connection refused / network error
    if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
      throw new Error(
        'Backend server is unreachable. Please ensure FastAPI is running on http://127.0.0.1:8000'
      );
    }
    throw err;
  }
}
