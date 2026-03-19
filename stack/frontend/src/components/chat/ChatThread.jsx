import { Bot, User, ChevronRight } from 'lucide-react';

// ── Format markdown-lite text ───────────────────────────────────────────────
function FormattedText({ text }) {
  return (
    <div className="flex flex-col gap-1">
      {text.split('\n').map((line, i) => {
        if (line === '') return <div key={i} className="h-1" />;
        const html = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^🔴\s/, '<span class="mr-1">🔴</span>')
          .replace(/^🟡\s/, '<span class="mr-1">🟡</span>')
          .replace(/^🟢\s/, '<span class="mr-1">🟢</span>');
        return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

// ── User bubble ─────────────────────────────────────────────────────────────
function UserBubble({ msg }) {
  return (
    <div className="flex gap-3 flex-row-reverse">
      <div className="w-8 h-8 rounded-full bg-[#1a3c2e] flex items-center justify-center shrink-0">
        <User size={13} className="text-white" />
      </div>
      <div className="max-w-[72%] px-4 py-3 rounded-2xl rounded-tr-sm bg-[#1a3c2e] text-white text-[13px]">
        <p>{msg.text}</p>
        <span className="text-[10px] text-white/40 mt-1.5 block">{msg.time}</span>
      </div>
    </div>
  );
}

// ── Assistant bubble ────────────────────────────────────────────────────────
function AssistantBubble({ msg, onFollowUp }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-[#eaf5ee] border border-[#b5d8c5] flex items-center justify-center shrink-0 mt-0.5">
        <Bot size={13} className="text-[#2d6a4f]" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="bg-white border border-[#e4ebe4] px-4 py-3.5 rounded-2xl rounded-tl-sm text-[13px] text-[#1a2e1a] shadow-sm">
          <FormattedText text={msg.text} />
          <span className="text-[10px] text-[#9ab09a] mt-2 block">{msg.time}</span>
        </div>

        {/* Follow-up chips */}
        {msg.followUps?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {msg.followUps.map((f, i) => (
              <button
                key={i}
                onClick={() => onFollowUp(f)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#e4ebe4] rounded-xl text-[11px] text-[#2d6a4f] font-semibold hover:bg-[#eaf5ee] hover:border-[#b5d8c5] transition-all"
              >
                <ChevronRight size={10} className="text-[#2d6a4f]" />
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ────────────────────────────────────────────────────────
export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-[#eaf5ee] border border-[#b5d8c5] flex items-center justify-center shrink-0">
        <Bot size={13} className="text-[#2d6a4f]" />
      </div>
      <div className="bg-white border border-[#e4ebe4] px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
        {[0, 150, 300].map(delay => (
          <span key={delay} className="w-1.5 h-1.5 bg-[#2d6a4f] rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </div>
  );
}

// ── Thread ──────────────────────────────────────────────────────────────────
export default function ChatThread({ messages, typing, onFollowUp }) {
  return (
    <div className="flex flex-col gap-5">
      {messages.map((msg, i) =>
        msg.role === 'user'
          ? <UserBubble key={i} msg={msg} />
          : <AssistantBubble key={i} msg={msg} onFollowUp={onFollowUp} />
      )}
      {typing && <TypingIndicator />}
    </div>
  );
}
