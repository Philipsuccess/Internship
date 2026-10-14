import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import ChatInput from '../components/ChatInput';
import * as api from '../services/api';

describe('Frontend Chat Application Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders initial state with conversation history', () => {
    render(<App />);
    expect(screen.getByText('Gemini Chat')).toBeDefined();
    expect(screen.getByText(/FastAPI Connected/i)).toBeDefined();
    expect(screen.getByText(/Can you explain the difference between synchronous and asynchronous/i)).toBeDefined();
    expect(screen.getByText(/The Breakfast Analogy/i)).toBeDefined();
  });

  it('prevents sending empty or whitespace-only messages', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSendMessage={handleSend} isLoading={false} />);

    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton.hasAttribute('disabled')).toBe(true);

    const input = screen.getByPlaceholderText(/Ask anything or explore/i);
    fireEvent.change(input, { target: { value: '   ' } });
    expect(sendButton.hasAttribute('disabled')).toBe(true);

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(handleSend).not.toHaveBeenCalled();
  });

  it('sends message on Enter key and preserves Shift + Enter for new lines', () => {
    const handleSend = vi.fn();
    render(<ChatInput onSendMessage={handleSend} isLoading={false} />);

    const input = screen.getByPlaceholderText(/Ask anything or explore/i);
    
    // Shift + Enter should NOT send
    fireEvent.change(input, { target: { value: 'Line 1' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });
    expect(handleSend).not.toHaveBeenCalled();
    expect(input.value).toBe('Line 1');

    // Enter alone should send
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: false });
    expect(handleSend).toHaveBeenCalledWith('Line 1');
    expect(input.value).toBe('');
  });

  it('handles normal conversation: captures message, displays immediately, shows loading, displays AI reply', async () => {
    vi.spyOn(api, 'sendChatMessage').mockResolvedValueOnce({
      response: 'Gemini says: FastAPI and React work smoothly together!',
    });

    render(<App />);

    const input = screen.getByPlaceholderText(/Ask anything or explore/i);
    fireEvent.change(input, { target: { value: 'Tell me about FastAPI' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // 1. Immediately displays user message
    expect(screen.getByText('Tell me about FastAPI')).toBeDefined();

    // 2. Shows loading indicator
    expect(screen.getByText('Gemini is thinking...')).toBeDefined();

    // 3. Receives and displays AI response
    await waitFor(() => {
      expect(screen.getByText(/Gemini says: FastAPI and React work smoothly together!/i)).toBeDefined();
    });

    // 4. Loading indicator disappears
    expect(screen.queryByText('Gemini is thinking...')).toBeNull();
  });

  it('handles multiple messages and sends conversation history to backend', async () => {
    const sendSpy = vi.spyOn(api, 'sendChatMessage').mockResolvedValue({
      response: 'Answer to follow-up query',
    });

    render(<App />);

    const input = screen.getByPlaceholderText(/Ask anything or explore/i);
    fireEvent.change(input, { target: { value: 'First follow-up question' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('First follow-up question')).toBeDefined();
    });

    // Verify history passed to backend contains initial sample messages
    expect(sendSpy).toHaveBeenCalled();
    const historyArg = sendSpy.mock.calls[0][1];
    expect(historyArg.length).toBeGreaterThanOrEqual(2);
    expect(historyArg[0].role).toBe('user');
  });

  it('handles slow responses by keeping send button and input disabled', async () => {
    let resolvePromise;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(api, 'sendChatMessage').mockReturnValue(delayedPromise);

    render(<App />);

    const input = screen.getByPlaceholderText(/Ask anything or explore/i);
    fireEvent.change(input, { target: { value: 'Testing slow response' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Verify input is disabled while waiting
    expect(input.hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /send message/i }).hasAttribute('disabled')).toBe(true);

    // Resolve response
    resolvePromise({ response: 'Finally done!' });

    await waitFor(() => {
      expect(screen.getByText('Finally done!')).toBeDefined();
    });

    // Input re-enabled
    expect(input.hasAttribute('disabled')).toBe(false);
  });

  it('handles backend unavailable error gracefully with retry option', async () => {
    vi.spyOn(api, 'sendChatMessage').mockRejectedValueOnce(
      new Error('Backend server is unreachable. Please ensure FastAPI is running on http://127.0.0.1:8000')
    );

    render(<App />);

    const input = screen.getByPlaceholderText(/Ask anything or explore/i);
    fireEvent.change(input, { target: { value: 'Ping backend' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Error alert banner should display
    await waitFor(() => {
      expect(screen.getByText(/Backend server is unreachable/i)).toBeDefined();
    });

    // Retry button should be available
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeDefined();

    // Now mock recovery and click retry
    vi.spyOn(api, 'sendChatMessage').mockResolvedValueOnce({
      response: 'Recovered successfully!',
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Recovered successfully!')).toBeDefined();
    });

    // Error alert is cleared
    expect(screen.queryByText(/Backend server is unreachable/i)).toBeNull();
  });

  it('handles Gemini API error returned from backend cleanly', async () => {
    vi.spyOn(api, 'sendChatMessage').mockRejectedValueOnce(
      new Error('Gemini API rate limit or quota exceeded. Please try again shortly.')
    );

    render(<App />);

    const input = screen.getByPlaceholderText(/Ask anything or explore/i);
    fireEvent.change(input, { target: { value: 'Quota test' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Gemini API rate limit or quota exceeded/i)).toBeDefined();
    });

    // User can dismiss the error banner
    const dismissBtn = screen.getByRole('button', { name: /dismiss error/i });
    fireEvent.click(dismissBtn);

    expect(screen.queryByText(/Gemini API rate limit or quota exceeded/i)).toBeNull();
  });

  it('clears conversation after confirmation and displays interactive empty state', async () => {
    render(<App />);

    // Click "Clear Chat" in header
    const clearButton = screen.getByRole('button', { name: /clear conversation/i });
    fireEvent.click(clearButton);

    // Modal appears
    expect(screen.getByText('Clear conversation?')).toBeDefined();

    // Confirm clear
    const confirmButton = screen.getByText('Clear all messages');
    fireEvent.click(confirmButton);

    // Empty state displays prompt options
    await waitFor(() => {
      expect(screen.getByText('How can I help you today?')).toBeDefined();
      expect(screen.getByText('Explain Async in FastAPI')).toBeDefined();
    });

    // Clicking prompt card starts a new conversation
    vi.spyOn(api, 'sendChatMessage').mockResolvedValueOnce({
      response: 'Here is how FastAPI uses async...',
    });

    const promptCard = screen.getByRole('button', { name: /Prompt: Explain Async in FastAPI/i });
    fireEvent.click(promptCard);

    await waitFor(() => {
      expect(screen.getByText(/How does FastAPI achieve high performance/i)).toBeDefined();
    });
  });

  it('allows changing persona and includes selected persona in chat request', async () => {
    const sendSpy = vi.spyOn(api, 'sendChatMessage').mockResolvedValueOnce({
      response: 'Step 1: Understand the problem...',
    });

    render(<App />);

    // Select "Student Tutor" persona
    const select = screen.getByLabelText(/Select Chatbot Persona/i);
    fireEvent.change(select, { target: { value: 'student_tutor' } });

    const input = screen.getByPlaceholderText(/Ask anything or explore/i);
    fireEvent.change(input, { target: { value: 'Help me with math' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalled();
    });

    // Check third argument was 'student_tutor'
    expect(sendSpy.mock.calls[0][2]).toBe('student_tutor');
  });

  it('rejects messages exceeding character limit gracefully', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText(/Ask anything or explore/i);
    // Note that textarea has maxLength=10000 attribute
    expect(input.getAttribute('maxlength')).toBe('10000');
  });

  it('handles client timeout error cleanly', async () => {
    vi.spyOn(api, 'sendChatMessage').mockRejectedValueOnce(
      new Error('Request timed out. The AI model is taking longer than expected. Please try again.')
    );

    render(<App />);

    const input = screen.getByPlaceholderText(/Ask anything or explore/i);
    fireEvent.change(input, { target: { value: 'Trigger slow request' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Request timed out/i)).toBeDefined();
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeDefined();
  });

  it('exports conversation transcript to clipboard formatted as Markdown', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<App />);

    const exportBtn = screen.getByRole('button', { name: /export conversation transcript/i });
    expect(exportBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });

    const copiedContent = writeTextMock.mock.calls[0][0];
    expect(copiedContent).toContain('# AI Chatbot Conversation Transcript');
    expect(copiedContent).toContain('Persona: default');
    expect(copiedContent).toContain('### You');
    expect(copiedContent).toContain('### Gemini');

    // Button should briefly show "Copied!" feedback
    expect(screen.getByText('Copied!')).toBeDefined();
  });

  it('persists conversation in localStorage and clears upon clearing conversation', async () => {
    localStorage.clear();
    render(<App />);

    // Check localStorage was populated with default initial sample messages
    const saved = localStorage.getItem('chatbot_transcript_v1');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved);
    expect(parsed.length).toBeGreaterThan(0);

    // Clear conversation
    const clearButton = screen.getByRole('button', { name: /clear conversation/i });
    fireEvent.click(clearButton);
    const confirmButton = screen.getByText('Clear all messages');
    fireEvent.click(confirmButton);

    // LocalStorage should now record empty conversation
    const cleared = JSON.parse(localStorage.getItem('chatbot_transcript_v1'));
    expect(cleared).toEqual([]);
  });
});


