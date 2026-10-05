// Shared UI components: Spinner, Modal wrapper, Grade badge, etc.
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// Spinner
// ──────────────────────────────────────────────────────────────
export function Spinner({ size = 24, color = '#4C5F4E', className = '' }) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        border: `3px solid rgba(76,95,78,0.2)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────
// PageWrapper – standard fade+slide in for pages
// ──────────────────────────────────────────────────────────────
export function PageWrapper({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// ModalOverlay
// ──────────────────────────────────────────────────────────────
export function ModalOverlay({ isOpen, onClose, children, maxWidth = '480px' }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(44,62,80,0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1.5rem',
              padding: '2rem',
              width: '100%',
              maxWidth,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 80px rgba(44,62,80,0.25)',
              position: 'relative',
            }}
          >
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: '#f0ece8',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#576574',
                }}
              >
                <X size={16} />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ──────────────────────────────────────────────────────────────
// GradeBadge
// ──────────────────────────────────────────────────────────────
const GRADE_COLORS = {
  A: { bg: '#27AE60', label: 'Excellent' },
  B: { bg: '#82c91e', label: 'Good' },
  C: { bg: '#F39C12', label: 'Moderate' },
  D: { bg: '#e67e22', label: 'Poor' },
  F: { bg: '#E74C3C', label: 'Harmful' },
};

export function GradeBadge({ grade, size = 80 }) {
  const g = GRADE_COLORS[grade] || GRADE_COLORS['C'];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: g.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        flexShrink: 0,
        boxShadow: `0 8px 24px ${g.bg}55`,
      }}
    >
      <span style={{ fontSize: size * 0.4, fontWeight: 800, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
        {grade || 'C'}
      </span>
      <span style={{ fontSize: size * 0.145, fontWeight: 600, opacity: 0.9, marginTop: 2 }}>
        {g.label}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// IngredientRow
// ──────────────────────────────────────────────────────────────
const CLASS_ICONS = {
  safe: <CheckCircle size={18} color="#27AE60" />,
  limited: <AlertCircle size={18} color="#F39C12" />,
  harmful: <XCircle size={18} color="#E74C3C" />,
};

export function IngredientRow({ ingredient, index }) {
  const icon = CLASS_ICONS[ingredient.classification] || CLASS_ICONS['limited'];
  const badgeClass = `badge-${ingredient.classification || 'limited'}`;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        borderRadius: '0.75rem',
        background: '#FAF8F5',
        marginBottom: '0.5rem',
        border: '1px solid rgba(76,95,78,0.08)',
      }}
    >
      <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: 600, color: '#2C3E50', fontSize: '0.9rem' }}>{ingredient.name}</span>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '0.1rem 0.5rem',
              borderRadius: '99px',
              background: ingredient.type === 'Natural' ? 'rgba(39,174,96,0.1)' : 'rgba(231,76,60,0.1)',
              color: ingredient.type === 'Natural' ? '#27AE60' : '#E74C3C',
              border: `1px solid ${ingredient.type === 'Natural' ? 'rgba(39,174,96,0.3)' : 'rgba(231,76,60,0.3)'}`,
            }}
          >
            {ingredient.type}
          </span>
        </div>
        <p style={{ color: '#576574', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>{ingredient.risk}</p>
      </div>
      <span className={badgeClass} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '99px', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {ingredient.classification}
      </span>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// NutritionCard
// ──────────────────────────────────────────────────────────────
export function NutritionCard({ label, value, unit, icon, color = '#4C5F4E' }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '1rem',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.35rem',
      boxShadow: '0 2px 12px rgba(76,95,78,0.08)',
      border: '1px solid rgba(76,95,78,0.08)',
      textAlign: 'center',
    }}>
      {icon && <div style={{ color, marginBottom: '0.25rem' }}>{icon}</div>}
      <span style={{ fontSize: '1.5rem', fontWeight: 800, color, fontFamily: 'Outfit, sans-serif' }}>{value}</span>
      <span style={{ fontSize: '0.75rem', color: '#576574', fontWeight: 500 }}>{unit}</span>
      <span style={{ fontSize: '0.8rem', color: '#2C3E50', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Empty State
// ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      color: '#576574',
      textAlign: 'center',
      gap: '0.75rem',
    }}>
      <div style={{ fontSize: '2.5rem', opacity: 0.4 }}>{icon}</div>
      <h3 style={{ margin: 0, color: '#2C3E50', fontSize: '1rem' }}>{title}</h3>
      {description && <p style={{ margin: 0, fontSize: '0.85rem' }}>{description}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// InfoCard (AI Insights)
// ──────────────────────────────────────────────────────────────
export function InfoCard({ children }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(76,95,78,0.06) 0%, rgba(39,174,96,0.08) 100%)',
      border: '1px solid rgba(76,95,78,0.15)',
      borderRadius: '1rem',
      padding: '1.25rem',
      fontSize: '0.88rem',
      color: '#2C3E50',
      lineHeight: 1.7,
      whiteSpace: 'pre-wrap',
    }}>
      {children}
    </div>
  );
}
