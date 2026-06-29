import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { Button, Field, inputStyle } from '../components/UI'
import Footer from '../components/Footer'
import { I18nProvider, useI18n } from '../lib/i18n'
import LanguageSelector from '../components/LanguageSelector'

function LoginInner() {
  const nav = useNavigate()
  const { t } = useI18n()
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function mapError(msg) {
    if (!msg) return t('common.retry')
    if (msg.includes('Invalid login')) return t('auth.wrongCredentials')
    if (msg.includes('already registered')) return t('auth.emailInUse')
    if (msg.includes('at least 6')) return t('auth.min6')
    return msg
  }

  async function submit(e) {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        nav('/dashboard')
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.session) {
          nav('/dashboard')
        } else {
          setInfo(t('auth.checkEmail'))
          setMode('signin')
        }
      }
    } catch (err) {
      setError(mapError(err.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.surface }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/logo-wisiorder.png" alt="" style={{ height: 24 }} onError={e => { e.currentTarget.style.display = 'none' }} />
              <span style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 18, color: T.primary, textTransform: 'uppercase' }}>WisiOrder</span>
            </Link>
            <LanguageSelector compact />
          </div>

          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 28 }}>
            <h1 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 4px' }}>
              {mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
            </h1>
            <p style={{ fontFamily: T.syne, fontSize: 13, color: T.textSecondary, margin: '0 0 20px' }}>
              {mode === 'signin' ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
            </p>

            <form onSubmit={submit}>
              <Field label={t('auth.email')}>
                <input style={inputStyle} type="email" value={email} required autoComplete="email"
                  onChange={e => setEmail(e.target.value)} placeholder="tu@locale.com" />
              </Field>
              <Field label={t('auth.password')} hint={mode === 'signup' ? t('auth.min6') : undefined}>
                <input style={inputStyle} type="password" value={password} required minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </Field>

              {error && <p style={{ fontFamily: T.syne, fontSize: 13, color: T.primary, margin: '0 0 12px' }}>{error}</p>}
              {info && <p style={{ fontFamily: T.syne, fontSize: 13, color: T.green, margin: '0 0 12px' }}>{info}</p>}

              <Button type="submit" disabled={busy} style={{ width: '100%', opacity: busy ? 0.6 : 1 }}>
                {busy ? t('common.loading') : (mode === 'signin' ? t('auth.signIn') : t('auth.signUp'))}
              </Button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.syne, fontSize: 12, color: T.textSecondary }}>
                {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default function Login() {
  return (
    <I18nProvider initialLang="en">
      <LoginInner />
    </I18nProvider>
  )
}
