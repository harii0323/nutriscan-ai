// AI Chatbot Interface
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Lock } from 'lucide-react';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
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
            return <strong key={pIdx} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        if (isHeader) {
          return (
            <div key={idx} style={{ fontWeight: 800, fontSize: '0.96rem', marginTop: 4, marginBottom: 2 }}>
              {formatted}
            </div>
          );
        }

        if (isBullet) {
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', paddingLeft: '0.2rem' }}>
              <span style={{ color: '#4C5F4E', fontWeight: 700 }}>•</span>
              <div style={{ flex: 1 }}>{formatted}</div>
            </div>
          );
        }

        return <div key={idx}>{formatted}</div>;
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
    { id: 1, role: 'assistant', content: '👋 Hi! I\'m NutriScan Assistant. Ask me anything about food ingredients, nutrition, or product safety. I\'m here to help you make healthier choices!' },
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
      setMessages(prev => [...prev, { id: getMsgId(), role: 'assistant', content: `⚠️ ${err.message || 'Sorry, I encountered an error. Please try again.'}` }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <PageWrapper style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: '#F8F4F0' }}>
      {/* Chat header */}
      <div style={{
        background: 'white', padding: '1rem 1.5rem',
        borderBottom: '1px solid rgba(76,95,78,0.08)',
        display: 'flex', alignItems: 'center', gap: '0.85rem',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, #4C5F4E, #27AE60)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(76,95,78,0.3)',
        }}>
          <Bot size={22} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#2C3E50', fontFamily: 'Outfit, sans-serif', fontSize: '1rem' }}>
            🤖 NutriScan Assistant
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#27AE60' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#27AE60', display: 'inline-block', animation: 'pulse-glow 2s ease-in-out infinite' }} />
            Online & Ready to Help
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
        maxWidth: 760, width: '100%', margin: '0 auto', alignSelf: 'center',
      }}>
        {/* Suggested questions */}
        {messages.length === 1 && (
          <div style={{ marginTop: '0.5rem' }}>
            <p style={{ color: '#576574', fontSize: '0.82rem', marginBottom: '0.6rem', fontWeight: 500 }}>Try asking:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {SUGGESTED.map(q => (
                <motion.button key={q} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => handleSend(q)}
                  style={{
                    background: 'white', border: '1.5px solid rgba(76,95,78,0.2)',
                    borderRadius: '99px', padding: '0.4rem 0.9rem',
                    fontSize: '0.8rem', color: '#4C5F4E', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}>
                  {q}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '0.65rem',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #4C5F4E, #3a4e3c)'
                  : 'linear-gradient(135deg, #27AE60, #2ecc71)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}>
                {msg.role === 'user' ? <User size={15} color="white" /> : <Bot size={15} color="white" />}
              </div>
              {/* Bubble */}
              <div style={{
                maxWidth: '75%',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #4C5F4E, #3a4e3c)'
                  : 'white',
                color: msg.role === 'user' ? 'white' : '#2C3E50',
                borderRadius: msg.role === 'user' ? '1.1rem 1.1rem 0.2rem 1.1rem' : '1.1rem 1.1rem 1.1rem 0.2rem',
                padding: '0.85rem 1.1rem',
                fontSize: '0.9rem',
                lineHeight: 1.65,
                boxShadow: msg.role === 'user' ? '0 4px 16px rgba(76,95,78,0.3)' : '0 2px 12px rgba(0,0,0,0.08)',
                wordBreak: 'break-word',
              }}>
                <FormattedMessage content={msg.content} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Thinking indicator */}
        {thinking && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #27AE60, #2ecc71)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={15} color="white" />
            </div>
            <div style={{
              background: 'white', borderRadius: '1.1rem 1.1rem 1.1rem 0.2rem',
              padding: '0.75rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)', color: '#576574', fontSize: '0.85rem',
            }}>
              <Spinner size={16} /> Thinking…
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Auth notice */}
      {!user && (
        <div style={{
          background: 'rgba(76,95,78,0.08)', borderTop: '1px solid rgba(76,95,78,0.12)',
          padding: '0.75rem 1.5rem', textAlign: 'center',
          fontSize: '0.83rem', color: '#576574',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        }}>
          <Lock size={14} color="#4C5F4E" />
          <span>Sign in to send messages and save your chat history.</span>
          <button onClick={onAuthRequest} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#4C5F4E', fontWeight: 700, fontSize: '0.83rem', textDecoration: 'underline',
          }}>Sign In</button>
        </div>
      )}

      {/* Input bar */}
      <div style={{
        background: 'white', padding: '1rem 1.25rem',
        borderTop: '1px solid rgba(76,95,78,0.08)',
        maxWidth: 760, width: '100%', margin: '0 auto', alignSelf: 'center',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: '#FAF8F5', borderRadius: '1rem', padding: '0.6rem 0.6rem 0.6rem 1rem',
          border: '2px solid rgba(76,95,78,0.15)',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={user ? 'Type your question here…' : 'Sign in to chat…'}
            disabled={!user || thinking}
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontSize: '0.9rem', color: '#2C3E50', fontFamily: 'Inter, sans-serif',
            }}
          />
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={() => handleSend()}
            aria-label="Send message"
            disabled={!user || !input.trim() || thinking}
            style={{
              width: 40, height: 40, borderRadius: '0.75rem', border: 'none',
              background: user && input.trim() ? 'linear-gradient(135deg, #4C5F4E, #3a4e3c)' : '#e8e4e0',
              color: user && input.trim() ? 'white' : '#aaa',
              cursor: user && input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            <Send size={17} />
          </motion.button>
        </div>
      </div>
    </PageWrapper>
  );
}
