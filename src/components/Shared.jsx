// Shared UI components: Spinner, Modal wrapper, Grade badge, etc.
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// Spinner
// ──────────────────────────────────────────────────────────────
export function Spinner({ size = 22, color = '#0E3B2E', className = '' }) {
  return (
    <div
      className={className}
      role="status"
      aria-label="Loading"
      style={{
        width: size,
        height: size,
        border: `2.5px solid rgba(14, 59, 46, 0.15)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────
// PageWrapper – standard fade+slide in for pages
// ──────────────────────────────────────────────────────────────
export function PageWrapper({ children, className = '', style = {} }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// ModalOverlay
// ──────────────────────────────────────────────────────────────
export function ModalOverlay({ isOpen, onClose, children, maxWidth = '500px' }) {
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
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '1.25rem',
              padding: '2rem',
              width: '100%',
              maxWidth,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
              position: 'relative',
            }}
          >
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                  transition: 'background-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
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
// GradeBadge - Scientific Health Score Indicator
// ──────────────────────────────────────────────────────────────
const GRADE_METRICS = {
  A: {
    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    glow: 'rgba(5, 150, 105, 0.35)',
    label: 'Excellent',
    score: '90-100',
    colorHex: '#059669',
  },
  B: {
    bg: 'linear-gradient(135deg, #65A30D 0%, #4D7C0F 100%)',
    glow: 'rgba(101, 163, 13, 0.35)',
    label: 'Good',
    score: '75-89',
    colorHex: '#65A30D',
  },
  C: {
    bg: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    glow: 'rgba(217, 119, 6, 0.35)',
    label: 'Moderate',
    score: '50-74',
    colorHex: '#D97706',
  },
  D: {
    bg: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
    glow: 'rgba(234, 88, 12, 0.35)',
    label: 'Poor',
    score: '30-49',
    colorHex: '#EA580C',
  },
  F: {
    bg: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    glow: 'rgba(220, 38, 38, 0.35)',
    label: 'Harmful',
    score: '< 30',
    colorHex: '#DC2626',
  },
};

export function GradeBadge({ grade, size = 80 }) {
  const g = GRADE_METRICS[grade] || GRADE_METRICS['C'];
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
        color: '#FFFFFF',
        flexShrink: 0,
        boxShadow: `0 8px 24px ${g.glow}, inset 0 1px 1px rgba(255,255,255,0.4)`,
        border: '2.5px solid rgba(255,255,255,0.3)',
        position: 'relative',
      }}
    >
      <span
        style={{
          fontSize: size * 0.42,
          fontWeight: 800,
          fontFamily: 'Outfit, -apple-system, sans-serif',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          textShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
      >
        {grade || 'C'}
      </span>
      <span
        style={{
          fontSize: Math.max(10, size * 0.13),
          fontWeight: 700,
          opacity: 0.95,
          marginTop: 2,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {g.label}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// IngredientRow - Laboratory Breakdown
// ──────────────────────────────────────────────────────────────
const CLASS_ICONS = {
  safe: <CheckCircle size={17} color="#059669" />,
  limited: <AlertTriangle size={17} color="#D97706" />,
  harmful: <AlertOctagon size={17} color="#DC2626" />,
};

export function IngredientRow({ ingredient, index }) {
  const icon = CLASS_ICONS[ingredient.classification] || CLASS_ICONS['limited'];
  const badgeClass = `badge-${ingredient.classification || 'limited'}`;
  const isNatural = ingredient.type === 'Natural';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        padding: '0.9rem 1.1rem',
        borderRadius: '0.875rem',
        background: '#FAFCFB',
        marginBottom: '0.5rem',
        border: '1px solid rgba(15, 23, 42, 0.06)',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
    >
      <div style={{ marginTop: 3, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.3rem' }}>
          <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.92rem', letterSpacing: '-0.01em' }}>
            {ingredient.name}
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              padding: '0.12rem 0.5rem',
              borderRadius: '99px',
              background: isNatural ? '#ECFDF5' : '#F1F5F9',
              color: isNatural ? '#065F46' : '#475569',
              border: `1px solid ${isNatural ? '#A7F3D0' : '#CBD5E1'}`,
              letterSpacing: '0.02em',
            }}
          >
            {ingredient.type}
          </span>
        </div>
        <p style={{ color: '#4B5563', fontSize: '0.83rem', margin: 0, lineHeight: 1.5 }}>
          {ingredient.risk}
        </p>
      </div>
      <span
        className={badgeClass}
        style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          padding: '0.22rem 0.65rem',
          borderRadius: '99px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          textTransform: 'capitalize',
        }}
      >
        {ingredient.classification}
      </span>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// NutritionCard - Clinical Nutrient Box
// ──────────────────────────────────────────────────────────────
export function NutritionCard({ label, value, unit, icon, color = '#0E3B2E' }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '0.875rem',
        padding: '1.1rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        border: '1px solid rgba(15, 23, 42, 0.07)',
        textAlign: 'center',
        transition: 'transform 0.15s, border-color 0.15s',
      }}
    >
      {icon && <div style={{ color, marginBottom: '0.2rem' }}>{icon}</div>}
      <span
        style={{
          fontSize: '1.45rem',
          fontWeight: 800,
          color,
          fontFamily: 'Outfit, sans-serif',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: '0.73rem', color: '#6B7280', fontWeight: 500 }}>{unit}</span>
      <span style={{ fontSize: '0.8rem', color: '#111827', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Empty State
// ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
        color: '#64748B',
        textAlign: 'center',
        gap: '0.65rem',
        background: '#F8FAFC',
        borderRadius: '1rem',
        border: '1px dashed #CBD5E1',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: '#EDF2F7',
        color: '#475569',
        marginBottom: '0.25rem',
      }}>
        {icon}
      </div>
      <h3 style={{ margin: 0, color: '#0F172A', fontSize: '0.96rem', fontWeight: 600 }}>{title}</h3>
      {description && <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B', maxWidth: 360, lineHeight: 1.5 }}>{description}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// InfoCard (Scientific Insights)
// ──────────────────────────────────────────────────────────────
export function InfoCard({ children }) {
  return (
    <div
      style={{
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderLeft: '4px solid #166534',
        borderRadius: '0.875rem',
        padding: '1.25rem 1.4rem',
        fontSize: '0.9rem',
        color: '#14532D',
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
      }}
    >
      {children}
    </div>
  );
}
