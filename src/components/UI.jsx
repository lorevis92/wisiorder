import { T } from '../lib/theme'

export function Spinner({ label = 'Caricamento…' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 48, color: T.textSecondary, fontFamily: T.syne, fontSize: 13 }}>
      <div style={{
        width: 28, height: 28, border: `3px solid ${T.border}`,
        borderTopColor: T.primary, borderRadius: '50%', animation: 'wo-spin 0.8s linear infinite',
      }} />
      <span style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
    </div>
  )
}

export function Button({ children, variant = 'primary', style, ...rest }) {
  const base = {
    fontFamily: T.syne, fontWeight: 700, fontSize: 13, textTransform: 'uppercase',
    letterSpacing: 0.5, borderRadius: T.rBtn, padding: '11px 18px', cursor: 'pointer',
    border: '1px solid transparent', transition: 'opacity 0.15s', lineHeight: 1,
  }
  const variants = {
    primary: { background: T.primary, color: '#fff', borderColor: T.primary },
    ghost: { background: 'transparent', color: T.text, borderColor: T.border },
    danger: { background: 'transparent', color: T.primary, borderColor: T.primaryBorder },
    success: { background: T.green, color: '#fff', borderColor: T.green },
  }
  return (
    <button style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={e => e.currentTarget.style.opacity = '0.8'}
      onMouseUp={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      {...rest}>
      {children}
    </button>
  )
}

export function Badge({ children, color = T.textSecondary, bg }) {
  return (
    <span style={{
      fontFamily: T.syne, fontWeight: 700, fontSize: 10, textTransform: 'uppercase',
      letterSpacing: 0.5, color, background: bg || 'transparent',
      border: `1px solid ${bg ? 'transparent' : T.border}`, borderRadius: T.rBtn,
      padding: '3px 8px', display: 'inline-block',
    }}>{children}</span>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ display: 'block', fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, marginBottom: 6 }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontFamily: T.syne, fontSize: 11, color: T.textMuted, marginTop: 4 }}>{hint}</span>}
    </label>
  )
}

export const inputStyle = {
  width: '100%', boxSizing: 'border-box', fontFamily: T.syne, fontSize: 14,
  color: T.text, background: T.bg, border: `1px solid ${T.border}`,
  borderRadius: T.rSection, padding: '10px 12px', outline: 'none',
}
