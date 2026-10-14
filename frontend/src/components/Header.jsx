import { useState } from 'react';
import { Sparkles, Trash2, RotateCcw, Bot, ChevronDown, Share2, Check } from 'lucide-react';

const PERSONAS = [
  { id: 'default', label: 'General Assistant' },
  { id: 'student_tutor', label: 'Student Tutor' },
  { id: 'coding_assistant', label: 'Coding Assistant' },
  { id: 'customer_support', label: 'Customer Support' },
  { id: 'movie_recommender', label: 'Movie Recommender' },
  { id: 'business_assistant', label: 'Business Assistant' },
];

export default function Header({ 
  messageCount, 
  persona = 'default',
  onSelectPersona,
  onClear, 
  onLoadSample, 
  onExportTranscript,
  isLoading 
}) {
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    if (onExportTranscript) {
      const success = await onExportTranscript();
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };
  return (
    <header className="shrink-0 z-20 border-b border-slate-800/80 bg-[#0d121f]/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 transition-colors w-full overflow-hidden">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Model Identity */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-white/10 shrink-0">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-sm sm:text-base text-white tracking-tight truncate">
                Gemini Chat
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" aria-hidden="true"></span>
                FastAPI Connected
              </span>
            </div>
            <p className="hidden sm:flex text-[10px] sm:text-xs text-slate-400 items-center gap-1 truncate">
              <Sparkles className="w-3 h-3 text-purple-400 shrink-0" aria-hidden="true" />
              <span className="truncate">gemini-3.5-flash-lite (/api/chat)</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Persona Selector */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Persona Selector with custom styled container */}
          <div className="relative inline-flex items-center">
            <select
              value={persona || 'default'}
              onChange={(e) => onSelectPersona && onSelectPersona(e.target.value)}
              disabled={isLoading}
              className="appearance-none pl-2 pr-5 sm:pl-2.5 sm:pr-7 py-1.5 text-[11px] sm:text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-[88px] sm:w-auto max-w-[88px] sm:max-w-none truncate"
              title="Select Chatbot Persona"
              aria-label="Select Chatbot Persona"
            >
              {PERSONAS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 sm:right-2 pointer-events-none" aria-hidden="true" />
          </div>

          {/* Load Sample button (displayed when empty) */}
          {messageCount === 0 && onLoadSample && (
            <button
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 rounded-lg transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 cursor-pointer"
              title="Load sample conversation"
              aria-label="Load sample conversation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Load Sample</span>
            </button>
          )}

          {/* Export Transcript Button */}
          <button
            onClick={handleExport}
            disabled={messageCount === 0 || isLoading}
            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 rounded-lg transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 cursor-pointer"
            title="Export conversation transcript to clipboard as Markdown"
            aria-label="Export conversation transcript"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="hidden md:inline text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" aria-hidden="true" />
                <span className="hidden md:inline">Export</span>
              </>
            )}
          </button>

          {/* Clear Chat Button */}
          <button
            onClick={onClear}
            disabled={messageCount === 0 || isLoading}
            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-rose-300 bg-slate-800/80 hover:bg-rose-950/40 border border-slate-700/80 hover:border-rose-800/60 rounded-lg transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 cursor-pointer"
            title="Clear all messages from conversation"
            aria-label="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Clear Chat</span>
          </button>
        </div>
      </div>
    </header>
  );
}
