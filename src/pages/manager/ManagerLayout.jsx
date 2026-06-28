import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { T } from '../../lib/theme'
import { Button, Field, inputStyle, Spinner } from '../../components/UI'
import Footer from '../../components/Footer'

const TABS = [
  { to: '/dashboard', label: 'Ordini' },
  { to: '/menu', label: 'Menu' },
  { to: '/settings', label: 'Impostazioni' },
]

function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function Onboarding() {
  const { user, reloadRestaurant } = useAuth()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function create(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    const finalSlug = slugify(slug || name)
    if (!finalSlug) { setError('Scegli un nome valido.'); setBusy(false); return }
    const { error } = await supabase.from('restaurants').insert({
      name: name.trim(), slug: finalSlug, owner_user_id: user.id, primary_color: T.primary,
    })
    if (error) {
      setError(error.message.includes('duplicate') ? 'Questo indirizzo è già in uso, scegline un altro.' : error.message)
      setBusy(false); return
    }
    await reloadRestaurant()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: T.surface }}>
      <div style={{ width: '100%', maxWidth: 440, background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 28 }}>
        <h1 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>
          Crea il tuo locale
        </h1>
        <p style={{ fontFamily: T.syne, fontSize: 13, color: T.textSecondary, margin: '0 0 20px' }}>
          Un ultimo passo prima di iniziare a costruire il menu.
        </p>
        <form onSubmit={create}>
          <Field label="Nome del locale">
            <input style={inputStyle} value={name} required placeholder="Trattoria da Mario"
              onChange={e => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)) }} />
          </Field>
          <Field label="Indirizzo del menu" hint={`I clienti apriranno: /r/${slugify(slug || name) || 'tuo-locale'}`}>
            <input style={inputStyle} value={slug} placeholder="trattoria-da-mario"
              onChange={e => setSlug(slugify(e.target.value))} />
          </Field>
          {error && <p style={{ fontFamily: T.syne, fontSize: 13, color: T.primary }}>{error}</p>}
          <Button type="submit" disabled={busy} style={{ width: '100%', marginTop: 8, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Creazione…' : 'Crea e continua'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ManagerLayout() {
  const { restaurant, loading, signOut } = useAuth()
  const nav = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  if (loading) return <Spinner />
  if (!restaurant) return <Onboarding />

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
          {/* Tabs desktop */}
          <div className="wo-tabs-desktop" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {TABS.map(t => <NavLink key={t.to} to={t.to} style={tabStyle}>{t.label}</NavLink>)}
            <Button variant="ghost" onClick={async () => { await signOut(); nav('/login') }} style={{ padding: '7px 12px' }}>Esci</Button>
          </div>
          {/* Hamburger mobile */}
          <button className="wo-hamburger" onClick={() => setMenuOpen(o => !o)} style={{
            display: 'none', border: `1px solid ${T.border}`, borderRadius: T.rBtn, padding: '7px 10px',
            background: T.bg, cursor: 'pointer', fontSize: 16,
          }}>☰</button>
        </div>
        {/* Tabs mobile */}
        {menuOpen && (
          <div className="wo-tabs-mobile" style={{ padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TABS.map(t => <NavLink key={t.to} to={t.to} onClick={() => setMenuOpen(false)} style={tabStyle}>{t.label}</NavLink>)}
            <Button variant="ghost" onClick={async () => { await signOut(); nav('/login') }}>Esci</Button>
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
