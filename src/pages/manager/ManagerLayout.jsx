import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { T } from '../../lib/theme'
import { Button, Field, inputStyle, Spinner } from '../../components/UI'
import Footer from '../../components/Footer'
import { I18nProvider, LANGUAGES, useI18n } from '../../lib/i18n'

function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function Onboarding() {
  const { user, reloadRestaurant } = useAuth()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function create(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    const finalSlug = slugify(slug || name)
    if (!finalSlug) { setError(t('onboarding.chooseValidName')); setBusy(false); return }
    const { error: dbErr } = await supabase.from('restaurants').insert({
      name: name.trim(), slug: finalSlug, owner_user_id: user.id, primary_color: T.primary,
    })
    if (dbErr) {
      setError(dbErr.message.includes('duplicate') ? t('onboarding.addressInUse') : dbErr.message)
      setBusy(false); return
    }
    await reloadRestaurant()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: T.surface }}>
      <div style={{ width: '100%', maxWidth: 440, background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 28 }}>
        <h1 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>
          {t('onboarding.createVenue')}
        </h1>
        <p style={{ fontFamily: T.syne, fontSize: 13, color: T.textSecondary, margin: '0 0 20px' }}>
          {t('onboarding.lastStep')}
        </p>
        <form onSubmit={create}>
          <Field label={t('onboarding.venueName')}>
            <input style={inputStyle} value={name} required placeholder="Trattoria da Mario"
              onChange={e => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)) }} />
          </Field>
          <Field label={t('onboarding.menuAddress')} hint={t('onboarding.addressHint') + `/r/${slugify(slug || name) || 'my-venue'}`}>
            <input style={inputStyle} value={slug} placeholder="trattoria-da-mario"
              onChange={e => setSlug(slugify(e.target.value))} />
          </Field>
          {error && <p style={{ fontFamily: T.syne, fontSize: 13, color: T.primary }}>{error}</p>}
          <Button type="submit" disabled={busy} style={{ width: '100%', marginTop: 8, opacity: busy ? 0.6 : 1 }}>
            {busy ? t('common.loading') : t('onboarding.createContinue')}
          </Button>
        </form>
      </div>
    </div>
  )
}

function PanelLangSelector({ restaurantId }) {
  const { lang, changeLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    function h(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  function handleChange(code) {
    changeLang(code)
    supabase.from('restaurants').update({ panel_language: code }).eq('id', restaurantId)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center',
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rBtn,
        padding: '6px 8px', fontFamily: T.syne, fontWeight: 700, fontSize: 12, color: T.text,
        cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
      }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{current.flag}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 150, overflow: 'hidden',
        }}>
          {LANGUAGES.map(l => (
            <button key={l.code} type="button" onClick={() => { handleChange(l.code); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 14px', border: 'none', cursor: 'pointer',
                background: l.code === lang ? T.surfaceAlt : 'transparent',
                fontFamily: T.syne, fontSize: 13,
                fontWeight: l.code === lang ? 700 : 400,
                color: l.code === lang ? T.text : T.textSecondary,
                textAlign: 'left',
              }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ManagerLayoutInner() {
  const { restaurant, signOut } = useAuth()
  const { t } = useI18n()
  const nav = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!restaurant) return <Onboarding />

  const TABS = [
    { to: '/dashboard', label: t('nav.orders') },
    { to: '/menu', label: t('nav.menu') },
    { to: '/settings', label: t('nav.settings') },
  ]

  const tabStyle = ({ isActive }) => ({
    fontFamily: T.syne, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5,
    textDecoration: 'none', padding: '7px 14px', borderRadius: T.rBtn, border: `1px solid ${isActive ? T.primary : T.border}`,
    background: isActive ? T.primary : T.surface, color: isActive ? '#fff' : T.textSecondary,
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 20, background: T.bg, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <img src="/logo-wisiorder.png" alt="" style={{ height: 24 }} onError={e => { e.currentTarget.style.display = 'none' }} />
            <span style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 16, color: T.primary, textTransform: 'uppercase' }}>WisiOrder</span>
            <span style={{ fontFamily: T.syne, fontSize: 13, color: T.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              · {restaurant.name}
            </span>
          </div>
          {/* Desktop */}
          <div className="wo-tabs-desktop" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {TABS.map(tab => <NavLink key={tab.to} to={tab.to} style={tabStyle}>{tab.label}</NavLink>)}
            <PanelLangSelector restaurantId={restaurant.id} />
            <Button variant="ghost" onClick={async () => { await signOut(); nav('/login') }} style={{ padding: '7px 12px' }}>{t('nav.signOut')}</Button>
          </div>
          {/* Hamburger mobile */}
          <button className="wo-hamburger" onClick={() => setMenuOpen(o => !o)} style={{
            display: 'none', border: `1px solid ${T.border}`, borderRadius: T.rBtn, padding: '7px 10px',
            background: T.bg, cursor: 'pointer', fontSize: 16,
          }}>☰</button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="wo-tabs-mobile" style={{ padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TABS.map(tab => <NavLink key={tab.to} to={tab.to} onClick={() => setMenuOpen(false)} style={tabStyle}>{tab.label}</NavLink>)}
            <div style={{ display: 'flex', gap: 8 }}>
              <PanelLangSelector restaurantId={restaurant.id} />
              <Button variant="ghost" onClick={async () => { await signOut(); nav('/login') }} style={{ flex: 1 }}>{t('nav.signOut')}</Button>
            </div>
          </div>
        )}
      </nav>

      <main style={{ flex: 1, width: '100%' }}>
        <Outlet />
      </main>
      <Footer />

      <style>{`
        @media (max-width: 720px) {
          .wo-tabs-desktop { display: none !important; }
          .wo-hamburger { display: block !important; }
        }
      `}</style>
    </div>
  )
}

export default function ManagerLayout() {
  const { restaurant, loading } = useAuth()
  if (loading) return <Spinner />
  return (
    <I18nProvider initialLang={restaurant?.panel_language || 'en'}>
      <ManagerLayoutInner />
    </I18nProvider>
  )
}
