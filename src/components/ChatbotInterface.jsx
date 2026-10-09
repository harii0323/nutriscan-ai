// AI Chatbot Interface – Evidence-based nutritional science assistant
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Lock, ShieldCheck, HelpCircle } from 'lucide-react';
import { PageWrapper, Spinner } from './Shared.jsx';
import { sendChatMessageAI } from '../services/gemini.js';

const SUGGESTED = [
  'Is Maggi noodles healthy?',
  'What are the risks of sodium benzoate?',
  'Best protein sources for vegetarians?',
  'How to read food labels in India?',
];

function FormattedMessage({ content }) {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} style={{ height: 6 }} />;

        // Header check
        const isHeader = /^#{1,3}\s+/.test(trimmed);
        const headerText = isHeader ? trimmed.replace(/^#{1,3}\s+/, '') : trimmed;

        // Bullet point check
        const isBullet = /^[*-•]\s+/.test(headerText);
        const textToFormat = isBullet ? headerText.replace(/^[*-•]\s+/, '') : headerText;

        // Parse **bold** parts
        const parts = textToFormat.split(/(\*\*.*?\*\*)/g);
        const formatted = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx} style={{ fontWeight: 700, color: 'inherit' }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        if (isHeader) {
          return (
            <div key={idx} style={{ fontWeight: 800, fontSize: '0.98rem', marginTop: 6, marginBottom: 2, color: 'inherit' }}>
              {formatted}
            </div>
          );
        }

        if (isBullet) {
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', paddingLeft: '0.25rem', lineHeight: 1.6 }}>
              <span style={{ color: '#166534', fontWeight: 700 }}>•</span>
              <div style={{ flex: 1 }}>{formatted}</div>
            </div>
          );
        }

        return <div key={idx} style={{ lineHeight: 1.65 }}>{formatted}</div>;
      })}
    </div>
  );
}

let chatMsgId = 100;
function getMsgId() {
  return ++chatMsgId;
}

export default function ChatbotInterface({ user, onAuthRequest }) {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: 'Hello! I am NutriScan Assistant. Ask me anything about food ingredients, nutrition, or product safety. I am here to help you make healthier choices!' },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    if (!user) { onAuthRequest?.(); return; }

    setInput('');
    const userMsg = { id: getMsgId(), role: 'user', content: msg };
    const history = [...messages, userMsg];
    setMessages(history);
    setThinking(true);

    try {
      const aiText = await sendChatMessageAI(history.filter(m => m.role !== 'system'));
      setMessages(prev => [...prev, { id: getMsgId(), role: 'assistant', content: aiText }]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages(prev => [...prev, { id: getMsgId(), role: 'assistant', content: err.message || 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <PageWrapper style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: '#F8FAF9' }}>
      {/* Chat header */}
      <div style={{
        background: '#FFFFFF', padding: '0.9rem 1.5rem',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #0E3B2E 0%, #166534 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(14, 59, 46, 0.25)',
          }}>
            <Bot size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
              NutriScan Assistant
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: '#059669', fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              Online & Ready to Help
            </div>
          </div>
        </div>

        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#64748B' }}>
          <ShieldCheck size={14} color="#059669" />
          <span>Grounded in FSSAI & WHO Dietary Standards</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1.75rem 1.25rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
        maxWidth: 780, width: '100%', margin: '0 auto', alignSelf: 'center',
      }}>
        {/* Suggested questions */}
        {messages.length === 1 && (
          <div style={{
            background: '#FFFFFF', borderRadius: '1rem', padding: '1.25rem',
            border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            marginTop: '0.5rem', marginBottom: '0.5rem',
          }}>
            <p style={{ color: '#0F172A', fontSize: '0.86rem', marginBottom: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <HelpCircle size={15} color="#059669" /> Common Food Safety & Ingredient Inquiries:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {SUGGESTED.map(q => (
                <button key={q}
                  onClick={() => handleSend(q)}
                  style={{
                    background: '#F8FAFC', border: '1px solid #CBD5E1',
                    borderRadius: '99px', padding: '0.4rem 0.95rem',
                    fontSize: '0.82rem', color: '#1E293B', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ECFDF5'; e.currentTarget.style.borderColor = '#A7F3D0'; e.currentTarget.style.color = '#065F46'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#1E293B'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              {/* Avatar capsule */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user'
                  ? '#0E3B2E'
                  : '#166534',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              }}>
                {msg.role === 'user' ? <User size={15} color="white" /> : <Bot size={15} color="white" />}
              </div>

              {/* Message Bubble */}
              <div style={{
                maxWidth: '78%',
                background: msg.role === 'user'
                  ? '#0E3B2E'
                  : '#FFFFFF',
                color: msg.role === 'user' ? '#FFFFFF' : '#0F172A',
                border: msg.role === 'user' ? 'none' : '1px solid rgba(15, 23, 42, 0.08)',
                borderRadius: msg.role === 'user' ? '1rem 1rem 0.2rem 1rem' : '1rem 1rem 1rem 0.2rem',
                padding: '0.95rem 1.25rem',
                fontSize: '0.92rem',
                lineHeight: 1.65,
                boxShadow: msg.role === 'user' ? '0 4px 14px rgba(14, 59, 46, 0.2)' : '0 1px 3px rgba(15, 23, 42, 0.04)',
                wordBreak: 'break-word',
              }}>
                <FormattedMessage content={msg.content} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Thinking indicator */}
        {thinking && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={15} color="white" />
            </div>
            <div style={{
              background: '#FFFFFF', borderRadius: '1rem 1rem 1rem 0.2rem',
              padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem',
              border: '1px solid rgba(15, 23, 42, 0.08)', color: '#475569', fontSize: '0.86rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}>
              <Spinner size={16} /> Evaluating nutritional databases…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Auth notice */}
      {!user && (
        <div style={{
          background: '#FEF3C7', borderTop: '1px solid #FDE68A',
          padding: '0.75rem 1.5rem', textAlign: 'center',
          fontSize: '0.84rem', color: '#92400E',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        }}>
          <Lock size={14} color="#B45309" />
          <span>Sign in to send messages and save your chat history.</span>
          <button onClick={onAuthRequest} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#B45309', fontWeight: 700, fontSize: '0.84rem', textDecoration: 'underline',
          }}>Sign In</button>
        </div>
      )}

      {/* Input bar */}
      <div style={{
        background: '#FFFFFF', padding: '1rem 1.25rem',
        borderTop: '1px solid rgba(15, 23, 42, 0.08)',
        maxWidth: 780, width: '100%', margin: '0 auto', alignSelf: 'center',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: '#F8FAFC', borderRadius: '0.875rem', padding: '0.5rem 0.6rem 0.5rem 1rem',
          border: '1.5px solid #CBD5E1', transition: 'border-color 0.15s',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={user ? 'Type your question here…' : 'Sign in to chat…'}
            disabled={!user || thinking}
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontSize: '0.92rem', color: '#0F172A', fontFamily: 'Inter, sans-serif',
            }}
          />
          <button
            onClick={() => handleSend()}
            aria-label="Send message"
            disabled={!user || !input.trim() || thinking}
            style={{
              width: 38, height: 38, borderRadius: '0.65rem', border: 'none',
              background: user && input.trim() ? '#0E3B2E' : '#E2E8F0',
              color: user && input.trim() ? '#FFFFFF' : '#94A3B8',
              cursor: user && input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
