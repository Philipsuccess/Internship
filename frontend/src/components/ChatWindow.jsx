import { useState, useEffect } from 'react';
import Header from './Header';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { AlertCircle, X, AlertTriangle } from 'lucide-react';

export default function ChatWindow({
  messages,
  isLoading,
  error,
  persona,
  onSelectPersona,
  onSendMessage,
  onClearConversation,
  onLoadSample,
  onRetry,
  onDismissError,
  onExportTranscript,
}) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Close modal on Escape key press for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showClearConfirm) {
        setShowClearConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showClearConfirm]);

  const handleClearRequest = () => {
    if (messages.length > 0) {
      setShowClearConfirm(true);
    }
  };

  const confirmClear = () => {
    onClearConversation();
    setShowClearConfirm(false);
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-full bg-[#0b0f19] text-slate-100 overflow-hidden relative">
      {/* Subtle SaaS background radial light glow */}
      <div 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(99,102,241,0.08),transparent_50%)]" 
        aria-hidden="true" 
      />

      {/* Top Header */}
      <Header
        messageCount={messages.length}
        persona={persona}
        onSelectPersona={onSelectPersona}
        onClear={handleClearRequest}
        onLoadSample={onLoadSample}
        onExportTranscript={onExportTranscript}
        isLoading={isLoading}
      />

      {/* Optional Error Alert Banner */}
      {error && (
        <div 
          className="shrink-0 z-20 bg-rose-950/90 border-b border-rose-800/80 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between gap-3 animate-in fade-in duration-150 backdrop-blur-sm"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span className="truncate">{error}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={isLoading}
                className="px-2.5 py-1 text-[11px] font-medium bg-rose-900/60 hover:bg-rose-900 border border-rose-700/80 text-white rounded-lg transition active:scale-95 disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                aria-label="Retry sending message"
              >
                Retry
              </button>
            )}
            {onDismissError && (
              <button
                onClick={onDismissError}
                className="p-1 text-rose-300 hover:text-white rounded-md transition hover:bg-rose-900/50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Conversation Area */}
      <main className="flex-1 flex flex-col min-h-0 relative z-10">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onSelectPrompt={onSendMessage}
        />
      </main>

      {/* Fixed Chat Input Area */}
      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />

      {/* Confirmation Modal for Clearing Chat */}
      {showClearConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
        >
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                </div>
                <h3 id="clear-dialog-title" className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Clear conversation?
                </h3>
              </div>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition hover:bg-slate-800 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will remove all messages from the current conversation view. You can restore the sample conversation at any time.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="px-3.5 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-md shadow-rose-600/30 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
              >
                Clear all messages
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
