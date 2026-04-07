import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare, User, Sparkles } from 'lucide-react';
import { chatWithAI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { renderMarkdown } from '../utils/markdown';

const QUICK_PROMPTS = [
  "What is a P/E ratio?",
  "Explain ETFs simply",
  "What's compound interest?",
  "Bull vs bear market?",
];

export default function AISidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSend = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', content: msg };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInput('');
    setLoading(true);

    try {
      const history = currentMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await chatWithAI(msg, history);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ai-sidebar-overlay" onClick={onClose}>
      <div className="ai-sidebar" onClick={e => e.stopPropagation()}>
        <div className="ai-sidebar-header">
          <div className="ai-sidebar-title">
            <Bot size={18} />
            <span>AI Study Assistant</span>
          </div>
          <button className="ai-sidebar-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="ai-sidebar-messages">
          {messages.length === 0 && !loading && (
            <div className="ai-sidebar-empty">
              <Sparkles size={32} className="ai-sidebar-empty-icon" />
              <p>Stuck on something? Ask me anything about investing, stocks, or what you're learning.</p>
              <div className="ai-sidebar-quick-prompts">
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} className="ai-sidebar-quick" onClick={() => handleSend(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`ai-sidebar-msg ${msg.role}`}>
              <div className="ai-sidebar-msg-avatar">
                {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
              </div>
              <div className="ai-sidebar-msg-bubble">
                {msg.role === 'assistant' ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                ) : (
                  <div>{msg.content}</div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="ai-sidebar-msg assistant">
              <div className="ai-sidebar-msg-avatar"><Bot size={14} /></div>
              <div className="ai-sidebar-msg-bubble">
                <div className="typing-indicator"><span></span><span></span><span></span></div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="ai-sidebar-input">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            disabled={loading}
          />
          <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="ai-sidebar-send">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
