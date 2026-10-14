import { Sparkles, MessageSquareCode } from 'lucide-react';
import { SUGGESTED_PROMPTS } from '../data/mockData';

export default function EmptyState({ onSelectPrompt }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-2xl mx-auto my-auto animate-in fade-in duration-300">
      {/* Visual Avatar / Icon Badge */}
      <div className="relative mb-4 sm:mb-5">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center shadow-xl shadow-indigo-500/10 backdrop-blur-sm">
          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-400 animate-subtle-shimmer" aria-hidden="true" />
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 bg-indigo-500 border-2 border-[#0b0f19]"></span>
        </span>
      </div>

      <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white mb-2">
        How can I help you today?
      </h2>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 sm:mb-8 leading-relaxed px-2">
        Ask questions, explore programming concepts, brainstorm educational topics, or pick a sample prompt below to get started.
      </p>

      {/* Suggested Prompts Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left">
        {SUGGESTED_PROMPTS.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelectPrompt(item.prompt)}
            className="group p-3.5 sm:p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-150 shadow-sm hover:shadow-md hover:shadow-indigo-500/5 text-left active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            aria-label={`Prompt: ${item.title}`}
          >
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="text-base group-hover:scale-110 transition-transform" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                {item.title}
              </span>
            </div>
            <p className="text-xs text-slate-400 group-hover:text-slate-300 line-clamp-2 leading-relaxed">
              {item.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
