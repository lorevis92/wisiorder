import { useEffect, useRef, useState } from 'react'
import { LANGUAGES, useI18n } from '../lib/i18n'
import { T } from '../lib/theme'

export default function LanguageSelector({ compact = false }) {
  const { lang, changeLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: compact ? 0 : 6,
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rBtn,
          padding: compact ? '6px 8px' : '6px 10px',
          fontFamily: T.syne, fontWeight: 700, fontSize: 12, color: T.text,
          cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>{current.flag}</span>
        {!compact && <span>{current.label}</span>}
        {!compact && <span style={{ fontSize: 9, color: T.textMuted, marginLeft: 2 }}>▾</span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 150, overflow: 'hidden',
        }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              type="button"
              onClick={() => { changeLang(l.code); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 14px', border: 'none', cursor: 'pointer',
                background: l.code === lang ? T.surfaceAlt : 'transparent',
                fontFamily: T.syne, fontSize: 13,
                fontWeight: l.code === lang ? 700 : 400,
                color: l.code === lang ? T.text : T.textSecondary,
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
