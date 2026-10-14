import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import LoadingIndicator from './LoadingIndicator';
import EmptyState from './EmptyState';

export default function MessageList({ 
  messages, 
  isLoading, 
  onSelectPrompt 
}) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom smoothly whenever messages list or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return <EmptyState onSelectPrompt={onSelectPrompt} />;
  }

  return (
    <div 
      className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 scroll-smooth focus:outline-none"
      tabIndex={0}
      role="region"
      aria-label="Conversation messages"
      aria-live="polite"
    >
      <div className="max-w-4xl mx-auto w-full space-y-4 sm:space-y-5.5">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && <LoadingIndicator />}

        {/* Scroll anchor target */}
        <div ref={bottomRef} className="h-1 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}
