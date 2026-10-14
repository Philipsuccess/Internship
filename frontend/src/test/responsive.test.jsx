import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import Header from '../components/Header';
import MessageBubble from '../components/MessageBubble';
import EmptyState from '../components/EmptyState';
import ChatInput from '../components/ChatInput';

describe('Frontend Responsive Behavior & Mobile Adaptability Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders header with responsive layout classes for mobile and desktop viewports', () => {
    render(
      <Header
        messageCount={2}
        persona="default"
        onSelectPersona={vi.fn()}
        onClear={vi.fn()}
        isLoading={false}
      />
    );

    // Fast API Connected status pill has 'hidden sm:inline-flex' to collapse on small screens
    const statusBadge = screen.getByText(/FastAPI Connected/i);
    expect(statusBadge.className).toContain('hidden sm:inline-flex');

    // Model subtitle contains 'hidden sm:flex' for compact mobile presentation
    const modelSubtitle = screen.getByText(/gemini-3.5-flash-lite/i);
    expect(modelSubtitle.closest('p').className).toContain('hidden sm:flex');

    // Clear Chat text has 'hidden md:inline' (icon displays on mobile, text on desktop)
    const clearChatSpan = screen.getByText('Clear Chat');
    expect(clearChatSpan.className).toContain('hidden md:inline');

    // Persona dropdown has mobile-constrained width class
    const personaSelect = screen.getByLabelText(/Select Chatbot Persona/i);
    expect(personaSelect.className).toContain('w-[88px]');
    expect(personaSelect.className).toContain('sm:w-auto');
  });

  it('renders empty state suggestion cards in responsive single/multi-column grid', () => {
    render(<EmptyState onSelectPrompt={vi.fn()} />);

    // Prompt container uses 'grid grid-cols-1 sm:grid-cols-2'
    const promptButtons = screen.getAllByRole('button');
    expect(promptButtons.length).toBeGreaterThanOrEqual(4);

    const gridContainer = promptButtons[0].closest('.grid');
    expect(gridContainer).toBeDefined();
    expect(gridContainer.className).toContain('grid-cols-1');
    expect(gridContainer.className).toContain('sm:grid-cols-2');
  });

  it('renders message bubbles with adaptive max-width for compact and wide screens', () => {
    const userMsg = {
      id: 'msg-1',
      role: 'user',
      content: 'Testing responsive layout for user message bubble.',
      timestamp: '10:00 AM',
    };
    const assistantMsg = {
      id: 'msg-2',
      role: 'assistant',
      content: 'Here is the assistant response with responsive formatting.',
      timestamp: '10:01 AM',
    };

    const { rerender } = render(<MessageBubble message={userMsg} isLast={false} />);
    const userBubble = screen.getByText('Testing responsive layout for user message bubble.').closest('.rounded-2xl');
    expect(userBubble.className).toContain('max-w-[calc(100%-2.75rem)]');
    expect(userBubble.className).toContain('sm:max-w-2xl');

    rerender(<MessageBubble message={assistantMsg} isLast={true} />);
    const assistantBubble = screen.getByText('Here is the assistant response with responsive formatting.').closest('.rounded-2xl');
    expect(assistantBubble.className).toContain('max-w-[calc(100%-2.75rem)]');
    expect(assistantBubble.className).toContain('sm:max-w-2xl');
  });

  it('maintains usable layout and interactive buttons across simulated viewport resize', () => {
    // Simulate mobile viewport
    window.innerWidth = 375;
    window.innerHeight = 667;
    fireEvent(window, new Event('resize'));

    render(<App />);

    // App header remains intact
    expect(screen.getByText('Gemini Chat')).toBeDefined();

    // Textarea input remains accessible and editable
    const input = screen.getByPlaceholderText(/Ask anything or explore/i);
    expect(input).toBeDefined();
    expect(input.hasAttribute('disabled')).toBe(false);

    // Send button remains accessible with proper ARIA attributes
    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeDefined();

    // Simulate desktop viewport resize
    window.innerWidth = 1280;
    window.innerHeight = 800;
    fireEvent(window, new Event('resize'));

    expect(screen.getByText('Gemini Chat')).toBeDefined();
  });

  it('chat input container incorporates responsive margins and paddings', () => {
    render(<ChatInput onSendMessage={vi.fn()} isLoading={false} />);

    const textarea = screen.getByPlaceholderText(/Ask anything or explore/i);
    expect(textarea).toBeDefined();

    // Sizing and container constraints
    const outerContainer = textarea.closest('.shrink-0');
    expect(outerContainer.className).toContain('px-3');
    expect(outerContainer.className).toContain('sm:px-6');

    const innerContainer = outerContainer.querySelector('.max-w-4xl');
    expect(innerContainer).not.toBeNull();
  });
});
