import { Link } from 'react-router-dom'
import { T } from '../lib/theme'
import { Button } from '../components/UI'
import Footer from '../components/Footer'
import { I18nProvider, useI18n } from '../lib/i18n'
import LanguageSelector from '../components/LanguageSelector'

function Nav() {
  const { t } = useI18n()
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 10, background: T.bg,
      borderBottom: `1px solid ${T.border}`, padding: '12px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo-wisiorder.png" alt="" style={{ height: 26 }}
          onError={e => { e.currentTarget.style.display = 'none' }} />
        <span style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 18, color: T.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          WisiOrder
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LanguageSelector compact />
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <Button>{t('landing.signIn')}</Button>
        </Link>
      </div>
    </nav>
  )
}

function LandingInner() {
  const { t } = useI18n()

  const STEPS = [
    { n: '01', title: t('landing.step1'), body: t('landing.step1body') },
    { n: '02', title: t('landing.step2'), body: t('landing.step2body') },
    { n: '03', title: t('landing.step3'), body: t('landing.step3body') },
    { n: '04', title: t('landing.step4'), body: t('landing.step4body') },
  ]

  const features = [
    t('landing.feature1'),
    t('landing.feature2'),
    t('landing.feature3'),
    t('landing.feature4'),
    t('landing.feature5'),
    t('landing.feature6'),
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      {/* Hero */}
      <header style={{ maxWidth: 880, margin: '0 auto', padding: '64px 20px 40px', textAlign: 'center' }}>
        <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: T.primary }}>
          {t('landing.tagline')}
        </span>
        <h1 style={{ fontFamily: T.georgia, fontWeight: 700, fontSize: 'clamp(34px, 6vw, 56px)', lineHeight: 1.08, margin: '18px 0 16px', color: T.text }}>
          {t('landing.heroTitle')}
        </h1>
        <p style={{ fontFamily: T.syne, fontSize: 17, lineHeight: 1.5, color: T.textSecondary, maxWidth: 560, margin: '0 auto 28px' }}>
          {t('landing.heroSub')}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login" style={{ textDecoration: 'none' }}><Button>{t('landing.startNow')}</Button></Link>
          <a href="#come-funziona" style={{ textDecoration: 'none' }}><Button variant="ghost">{t('landing.howItWorks')}</Button></a>
        </div>
      </header>

      {/* Come funziona */}
      <section id="come-funziona" style={{ maxWidth: 920, margin: '0 auto', padding: '24px 20px 16px', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 24 }}>
              <span style={{ fontFamily: T.mono, fontSize: 13, color: T.primary, fontWeight: 500 }}>{s.n}</span>
              <h3 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 17, margin: '8px 0 6px', color: T.text }}>{s.title}</h3>
              <p style={{ fontFamily: T.syne, fontSize: 14, lineHeight: 1.5, color: T.textSecondary, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cosa ottieni */}
      <section style={{ maxWidth: 920, margin: '0 auto', padding: '24px 20px', width: '100%' }}>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 28 }}>
          <h2 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 18px', color: T.text }}>
            {t('landing.featuresTitle')}
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {features.map((f, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: T.syne, fontSize: 14, color: T.text }}>
                <span style={{ color: T.primary, fontWeight: 800 }}>→</span>{f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div style={{ textAlign: 'center', padding: '8px 20px 48px' }}>
        <Link to="/login" style={{ textDecoration: 'none' }}><Button>{t('landing.createMenu')}</Button></Link>
      </div>

      <div style={{ flex: 1 }} />
      <Footer />
    </div>
  )
}

export default function Landing() {
  return (
    <I18nProvider initialLang="en">
      <LandingInner />
    </I18nProvider>
  )
}
