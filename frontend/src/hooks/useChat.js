import { useState, useCallback, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/api';
import { INITIAL_SAMPLE_MESSAGES } from '../data/mockData';

const STORAGE_KEY_MESSAGES = 'chatbot_transcript_v1';
const STORAGE_KEY_PERSONA = 'chatbot_persona_v1';

/**
 * Custom React Hook for Chat State & Conversation Management
 * 
 * CONTEXT MANAGEMENT & PERSISTENCE ARCHITECTURE:
 * - Session Persistence: Automatically preserves the active conversation transcript in
 *   localStorage across page refreshes and accidental tab closures.
 * - History Dispatch: Captures an immutable snapshot of `messages` prior to appending the new prompt,
 *   sending that snapshot to POST /api/chat so Gemini understands prior context.
 * - Context Reset: `clearConversation` resets both in-memory state and localStorage.
 * - Export Capability: Generates a structured Markdown export of the multi-turn exchange.
 * - Persona Support: Configurable persona selection (default, student_tutor, coding_assistant, etc.)
 *   sent to the backend to activate tailored system instructions.
 */
export function useChat(initialMessages = undefined) {
  const [messages, setMessages] = useState(() => {
    if (initialMessages !== undefined) return initialMessages;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore localStorage read errors (e.g., restricted iframe or private browsing)
    }
    return INITIAL_SAMPLE_MESSAGES;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [persona, setPersona] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PERSONA) || 'default';
    } catch {
      return 'default';
    }
  });
  
  // Track last attempted message for retry functionality
  const lastPromptRef = useRef(null);

  // Sync messages to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch {
      // Ignore storage quota errors
    }
  }, [messages]);

  // Sync selected persona to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PERSONA, persona);
    } catch {
      // Ignore
    }
  }, [persona]);

  const formatTimestamp = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Send a new message, trigger optimistic UI update, and fetch response from FastAPI backend.
   */
  const sendMessage = useCallback(async (content, messagePersona = null) => {
    const trimmed = content?.trim();
    if (!trimmed || isLoading) {
      return;
    }

    lastPromptRef.current = trimmed;
    setError(null);

    const userMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: trimmed,
      timestamp: formatTimestamp(),
    };

    // Snapshot current conversation history to preserve multi-turn context
    const currentHistory = [...messages];

    // Optimistically append user message to UI immediately
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Send prompt, prior history, and active persona to FastAPI backend
      const activePersona = messagePersona || persona;
      const result = await sendChatMessage(trimmed, currentHistory, activePersona);

      const aiMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'assistant',
        content: result.response,
        timestamp: formatTimestamp(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error in sendMessage:', err);
      setError(err.message || 'An error occurred while generating the response.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, persona]);

  /**
   * Retry the last attempted user prompt if a request failed.
   */
  const retryLastMessage = useCallback(() => {
    if (lastPromptRef.current && !isLoading) {
      // Remove the last failed user message before re-sending to avoid duplication
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'user') {
          return prev.slice(0, -1);
        }
        return prev;
      });
      sendMessage(lastPromptRef.current);
    }
  }, [isLoading, sendMessage]);

  /**
   * Clear error state banner.
   */
  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear all conversation messages and purge persisted local storage.
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    lastPromptRef.current = null;
    try {
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
    } catch {
      // Ignore
    }
  }, []);

  /**
   * Restore realistic sample conversation data.
   */
  const loadSampleConversation = useCallback(() => {
    setMessages(INITIAL_SAMPLE_MESSAGES);
    setError(null);
  }, []);

  /**
   * Export the complete conversation transcript formatted as clean Markdown.
   */
  const exportTranscript = useCallback(async () => {
    if (messages.length === 0) return false;
    const header = `# AI Chatbot Conversation Transcript\nDate: ${new Date().toLocaleString()}\nPersona: ${persona}\n\n---\n\n`;
    const body = messages
      .map((msg) => `### ${msg.role === 'user' ? 'You' : 'Gemini'} (${msg.timestamp})\n\n${msg.content}\n`)
      .join('\n---\n\n');
    const fullText = header + body;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullText);
        return true;
      }
    } catch (err) {
      console.error('Failed to copy transcript:', err);
    }
    return false;
  }, [messages, persona]);

  return {
    messages,
    isLoading,
    error,
    persona,
    setPersona,
    sendMessage,
    retryLastMessage,
    dismissError,
    clearConversation,
    loadSampleConversation,
    exportTranscript,
  };
}
