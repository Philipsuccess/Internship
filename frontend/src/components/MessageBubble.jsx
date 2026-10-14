import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Copy, Check, Terminal } from 'lucide-react';

function CodeBlock({ language, code }) {
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-800 bg-[#070b14] shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 font-mono text-slate-300">
          <Terminal className="w-3 h-3 text-indigo-400" aria-hidden="true" />
          <span>{language || 'code'}</span>
        </span>
        <button
          onClick={handleCopyCode}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition py-0.5 px-1.5 rounded hover:bg-slate-800 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 cursor-pointer"
          title="Copy code snippet"
          aria-label="Copy code snippet"
        >
          {copiedCode ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" aria-hidden="true" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-xs sm:text-[13px] font-mono text-indigo-200 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div
      className={`flex items-start gap-2.5 sm:gap-3.5 w-full max-w-full min-w-0 group animate-in fade-in duration-200 ${
        isUser ? 'flex-row-reverse justify-start' : 'justify-start'
      }`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md ring-1 ring-white/10 mt-0.5 ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-indigo-500/10'
            : 'bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 text-white shadow-purple-500/15'
        }`}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        ) : (
          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        )}
      </div>

      {/* Message Bubble Container */}
      <div
        className={`relative min-w-0 max-w-[calc(100%-2.75rem)] sm:max-w-2xl px-3.5 py-2.5 sm:px-4.5 sm:py-3.5 rounded-2xl shadow-sm transition-all ${
          isUser
            ? 'bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 text-white rounded-tr-sm border border-indigo-500/30'
            : 'bg-[#111625]/90 border border-slate-800/90 text-slate-100 rounded-tl-sm backdrop-blur-sm'
        }`}
      >
        {/* Header: Role & Timestamp */}
        <div
          className={`flex items-center gap-2 mb-1.5 text-[11px] ${
            isUser ? 'text-indigo-200 justify-end' : 'text-slate-400'
          }`}
        >
          <span className="font-semibold tracking-tight">
            {isUser ? 'You' : 'Gemini'}
          </span>
          <span className="opacity-40">•</span>
          <span className="text-[10px] sm:text-[11px]">{message.timestamp}</span>
        </div>

        {/* Content Body */}
        {isUser ? (
          <p className="text-sm sm:text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        ) : (
          <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-slate-200 leading-relaxed break-words space-y-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed text-slate-200">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 text-slate-200">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-200">{children}</ol>,
                li: ({ children }) => <li className="text-slate-300 leading-normal">{children}</li>,
                h1: ({ children }) => <h1 className="text-base sm:text-lg font-bold text-white mt-3 mb-1.5 tracking-tight">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm sm:text-base font-bold text-white mt-2.5 mb-1 tracking-tight">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs sm:text-sm font-semibold text-white mt-2 mb-1">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-indigo-500/80 pl-3 my-2 text-slate-400 italic bg-indigo-950/10 py-1 rounded-r-md">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 rounded-lg border border-slate-800">
                    <table className="min-w-full divide-y divide-slate-800 text-xs sm:text-sm">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="px-3 py-2 bg-slate-800/80 font-semibold text-left text-slate-200">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 border-t border-slate-800/60 text-slate-300">{children}</td>
                ),
                pre: ({ children }) => {
                  return <>{children}</>;
                },
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isBlock = match || (typeof children === 'string' && children.includes('\n'));
                  
                  if (isBlock) {
                    const language = match ? match[1] : '';
                    const codeString = String(children).replace(/\n$/, '');
                    return <CodeBlock language={language} code={codeString} />;
                  }

                  return (
                    <code
                      className="bg-slate-800/90 text-indigo-300 px-1.5 py-0.5 rounded text-[12px] font-mono border border-slate-700/60"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Action Toolbar for AI responses */}
        {!isUser && (
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
            <span className="text-[10px] text-slate-400 font-medium">AI generated</span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 px-2 py-1 rounded-md transition focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 cursor-pointer"
              title="Copy message to clipboard"
              aria-label="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
