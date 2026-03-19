import { useState, useRef, useEffect } from 'react';
import HeaderNav from '../components/Navbar/HeaderNav';
import VerticalNav from '../components/Navbar/VerticalNav';
import ChatThread from '../components/chat/ChatThread';
import { TypingIndicator } from '../components/chat/ChatThread';
import EvidencePanel from '../components/chat/EvidencePanel';
import DailyHighlights from '../components/chat/DailyHighlights';
import PromptSuggestions from '../components/chat/PromptSuggestions';
import { Send, RefreshCw, Sparkles, PanelRight } from 'lucide-react';
import { suggestedPrompts, dailyHighlights, getRAGResponse } from '../data/chatData';

const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const WELCOME = {
  role: 'assistant',
  text: "Hello! I'm your AEGIS financial risk assistant. I can analyse sector risks, balance sheet trends, market volatility, and company financials.\n\nTry one of the suggested queries below, or ask me anything about the dataset.",
  time: now(),
  followUps: [],
};

export default function ChatPage() {
  const [messages, setMessages]         = useState([WELCOME]);
  const [input, setInput]               = useState('');
  const [typing, setTyping]             = useState(false);
  const [evidence, setEvidence]         = useState({ cards: [], citations: [] });
  const [showEvidence, setShowEvidence] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = (text) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg, time: now() }]);
    setTyping(true);
    setShowEvidence(false);
    setTimeout(() => {
      const rag = getRAGResponse(msg);
      setTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: rag.text,
        time: now(),
        followUps: rag.followUps,
      }]);
      setEvidence({ cards: rag.evidenceCards, citations: rag.citations });
      setShowEvidence(true);
    }, 1500);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const resetChat = () => {
    setMessages([WELCOME]);
    setEvidence({ cards: [], citations: [] });
    setShowEvidence(false);
  };

  const isFirstMessage = messages.length <= 1;

  return (
    <div className="h-screen flex flex-col bg-[#f4f6f4] overflow-hidden">
      <HeaderNav />
      <div className="flex flex-1 min-h-0">
        <VerticalNav />

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* COL 1 — Daily highlights sidebar */}
          <div className="w-[272px] shrink-0 flex flex-col bg-white border-r border-[#e4ebe4] overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-[#f0f5f0]">
              <h2 className="text-[13px] font-black text-[#1a2e1a]">AI Insights</h2>
              <p className="text-[11px] text-[#9ab09a] mt-0.5">Live risk signals · updated daily</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <DailyHighlights highlights={dailyHighlights} />
            </div>
          </div>

          {/* COL 2 — Chat */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">

            {/* header */}
            <div className="px-5 py-3.5 bg-white border-b border-[#e4ebe4] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#1a3c2e] flex items-center justify-center">
                  <Sparkles size={14} className="text-[#7ab89a]" />
                </div>
                <div>
                  <p className="text-[13px] font-black text-[#1a2e1a]">AEGIS Assistant</p>
                  <p className="text-[11px] text-[#2d6a4f] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f] animate-pulse inline-block" />
                    Online · RAG-powered Financial AI
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEvidence(s => !s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all
                    ${showEvidence
                      ? 'bg-[#1a3c2e] text-white border-[#1a3c2e]'
                      : 'bg-white text-[#4a6a4a] border-[#e4ebe4] hover:border-[#b5d8c5]'}`}
                >
                  <PanelRight size={12} /> Evidence
                </button>
                <button
                  onClick={resetChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e4ebe4] text-[11px] font-semibold text-[#4a6a4a] hover:border-[#b5d8c5] transition-all"
                >
                  <RefreshCw size={11} /> New Chat
                </button>
              </div>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <ChatThread messages={messages} typing={typing} onFollowUp={sendMessage} />
              <div ref={bottomRef} />
            </div>

            {/* suggested prompts — first message only */}
            {isFirstMessage && (
              <div className="px-5 pb-3">
                <PromptSuggestions prompts={suggestedPrompts} onSelect={sendMessage} />
              </div>
            )}

            {/* input */}
            <div className="px-5 py-4 bg-white border-t border-[#e4ebe4] shrink-0">
              <div className="flex items-end gap-3 bg-[#f7f9f7] border border-[#d5e8d5] rounded-2xl px-4 py-3 focus-within:border-[#2d6a4f] transition-colors">
                <textarea
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask about sector risks, balance sheets, market signals..."
                  className="flex-1 bg-transparent text-[13px] text-[#1a2e1a] placeholder-[#9ab09a] outline-none resize-none leading-relaxed"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  className="w-8 h-8 rounded-xl bg-[#1a3c2e] flex items-center justify-center shrink-0 disabled:opacity-30 hover:bg-[#2d6a4f] transition-colors"
                >
                  <Send size={13} className="text-white" />
                </button>
              </div>
              <p className="text-[10px] text-[#9ab09a] mt-2 text-center">
                AEGIS AI · Responses grounded in mock financial data for demonstration
              </p>
            </div>
          </div>

          {/* COL 3 — Evidence panel (toggleable) */}
          {showEvidence && (
            <div className="w-[340px] shrink-0 flex flex-col bg-white border-l border-[#e4ebe4] overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-[#f0f5f0]">
                <h2 className="text-[13px] font-black text-[#1a2e1a]">Evidence</h2>
                <p className="text-[11px] text-[#9ab09a] mt-0.5">Charts, tables &amp; data citations</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <EvidencePanel evidenceCards={evidence.cards} citations={evidence.citations} />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
