import { Bot } from 'lucide-react';

export default function LoadingIndicator() {
  return (
    <div 
      className="flex items-start gap-2.5 sm:gap-3.5 w-full animate-in fade-in duration-200"
      role="status"
      aria-live="polite"
    >
      {/* Bot Avatar with gentle subtle pulse */}
      <div 
        className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/10 ring-1 ring-white/10 mt-0.5 animate-subtle-shimmer"
        aria-hidden="true"
      >
        <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
      </div>

      {/* Bubble Container */}
      <div className="bg-[#111625]/90 border border-slate-800/90 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[85%] sm:max-w-xl backdrop-blur-sm">
        <div className="flex items-center space-x-2.5">
          {/* Subtle fluid dots */}
          <div className="flex items-center space-x-1.5 py-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400/90 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 rounded-full bg-purple-400/90 animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 rounded-full bg-pink-400/90 animate-bounce"></span>
          </div>
          <span className="text-xs text-slate-400 font-medium pl-1">
            Gemini is thinking...
          </span>
        </div>
      </div>
    </div>
  );
}
