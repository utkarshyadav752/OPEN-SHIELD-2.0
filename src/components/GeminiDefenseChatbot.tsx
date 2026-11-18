import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Shield, Zap, Globe, X, Loader2, ExternalLink } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
  sources?: Array<{ title: string; uri: string }>;
}

export const GeminiDefenseChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<'general' | 'search' | 'fast'>('general');
  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: 'Hi! I am the OpenShield Consumer Rights & ToS Analyst. Ask me to decode any suspicious Terms of Service clause, explain how to cancel a Roach Motel subscription, or check a checkout page for dark patterns.',
      modelUsed: 'gemini-4-hydrogen'
    }
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (overrideText?: string) => {
    const textToSend = (overrideText ?? input).trim();
    if (!textToSend || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!overrideText) setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, text: m.text })),
          mode
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            text: `Unable to reach Gemini right now: ${data.error || 'Unknown error'}`
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `model-${Date.now()}`,
            role: 'model',
            text: data.reply,
            modelUsed: data.modelUsed,
            sources: data.sources
          }
        ]);
      }
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: err instanceof Error ? err.message : 'Network error.'
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <div className="fixed bottom-4 left-4 z-50">
        {!isOpen && (
          <button
            type="button"
            data-testid="open-chatbot-btn"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs shadow-2xl cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <MessageSquare className="w-4 h-4" />
            <span>OpenShield Policy Advisor</span>
          </button>
        )}
      </div>

      {/* Multi-Turn Chat Drawer */}
      {isOpen && (
        <aside
          aria-label="OpenShield Consumer Protection Advisor"
          className="fixed bottom-4 left-4 z-50 w-[92vw] sm:w-[400px] h-[520px] rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-xs font-extrabold text-white">
                  OpenShield ToS &amp; Rights Advisor
                </div>
                <div className="text-[11px] text-slate-400">
                  Real-Time Clause &amp; Cancellation Guidance
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close Policy Advisor"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scan Mode Selector */}
          <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-1 text-[11px]">
            <span className="text-slate-400 font-medium">Depth:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMode('fast')}
                className={`px-2 py-1 rounded font-semibold cursor-pointer inline-flex items-center gap-1 ${
                  mode === 'fast'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Zap className="w-3 h-3" />
                Instant
              </button>
              <button
                type="button"
                onClick={() => setMode('general')}
                className={`px-2 py-1 rounded font-semibold cursor-pointer ${
                  mode === 'general'
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Deep Audit
              </button>
              <button
                type="button"
                onClick={() => setMode('search')}
                className={`px-2 py-1 rounded font-semibold cursor-pointer inline-flex items-center gap-1 ${
                  mode === 'search'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Globe className="w-3 h-3" />
                Live Web Search
              </button>
            </div>
          </div>

          {/* Scrollable Conversation Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[86%] rounded-xl px-3.5 py-2.5 whitespace-pre-line leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-sky-500 text-slate-950 font-medium'
                      : 'bg-slate-900 border border-slate-800 text-slate-200'
                  }`}
                >
                  {msg.text.replace(/\*\*/g, '')}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {msg.sources.map((s, i) => (
                      <a
                        key={`${s.uri}-${i}`}
                        href={s.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-sky-400"
                      >
                        <span className="truncate max-w-[160px]">{s.title}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Analyzing clauses...</span>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Suggested Prompt Chips */}
          <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
            {[
              'What is binding arbitration?',
              'How does confirm-shaming work?',
              'Check ShadyAirlines ToS'
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => sendMessage(chip)}
                className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap cursor-pointer shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              aria-label="Ask OpenShield AI Analyst"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about dark patterns or ToS clauses..."
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              aria-label="Send chat message"
              className="p-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
};
