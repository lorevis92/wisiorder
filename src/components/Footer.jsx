import { T } from '../lib/theme'

export default function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${T.border}`, background: T.surface, padding: 20,
      marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo-wisiverse.png" alt="WiSiVERSE" style={{ height: 32 }}
          onError={e => { e.currentTarget.style.display = 'none' }} />
        <span style={{ fontFamily: T.syne, fontSize: 11, color: T.textSecondary }}>
          Part of the WiSiVERSE ecosystem
        </span>
      </div>
      <a href="https://wisiverse.com" target="_blank" rel="noreferrer" style={{
        fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
        letterSpacing: 0.5, color: T.primary, textDecoration: 'none',
      }}>wisiverse.com →</a>
    </footer>
  )
}
