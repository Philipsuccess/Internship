import { useState, useRef, useEffect } from 'react';
import { ArrowUp, CornerDownLeft } from 'lucide-react';

export default function ChatInput({ onSendMessage, isLoading }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea dynamically based on input content (up to max height 160px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    onSendMessage(trimmed);
    setText('');

    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  /**
   * Keyboard handler with IME-safe submission for non-Latin and virtual keyboards
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Block submission if user is actively composing characters in an IME (e.g., CJK)
      if (e.isComposing || e.keyCode === 229) {
        return;
      }
      handleSubmit();
    }
  };

  const isSendDisabled = !text.trim() || isLoading;

  return (
    <div className="shrink-0 z-20 border-t border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3.5">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative flex items-end">
          {/* Multiline Textarea Container with elevated focus ring */}
          <div className="relative flex-1 bg-[#101626]/90 border border-slate-700/80 hover:border-slate-600 focus-within:border-indigo-500/80 focus-within:ring-4 focus-within:ring-indigo-500/15 rounded-2xl sm:rounded-2xl transition-all shadow-inner overflow-hidden">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or explore a topic..."
              rows={1}
              maxLength={10000}
              disabled={isLoading}
              className="w-full resize-none bg-transparent px-3.5 sm:px-4 py-3 sm:py-3.5 pr-12 sm:pr-14 text-sm sm:text-[15px] text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50 max-h-40 leading-relaxed"
              aria-label="Chat message input"
            />

            {/* Send Button anchored inside input */}
            <div className="absolute right-2 bottom-2">
              <button
                type="submit"
                disabled={isSendDisabled}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-150 ${
                  isSendDisabled
                    ? 'bg-slate-800/70 text-slate-500 cursor-not-allowed border border-slate-700/40 opacity-50'
                    : 'bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-md shadow-indigo-500/25 active:scale-95 cursor-pointer'
                } focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900`}
                title={isLoading ? 'Gemini is responding...' : 'Send message (Enter)'}
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>

        {/* Microcopy hints & accessibility guidance */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1.5 mt-1.5">
          <span className="hidden sm:flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3 text-slate-400" aria-hidden="true" />
            <span>
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono text-[10px]">Shift + Enter</kbd> for new line
            </span>
          </span>

          <span className="text-[10px] sm:text-[11px] text-slate-400 ml-auto sm:ml-0 flex items-center gap-1.5 truncate">
            {text.length > 80 && (
              <span className="font-mono text-slate-400 mr-2 shrink-0">{text.length} chars</span>
            )}
            <span className="truncate">Powered by Gemini 3.5 Flash Lite</span>
          </span>
        </div>
      </div>
    </div>
  );
}
