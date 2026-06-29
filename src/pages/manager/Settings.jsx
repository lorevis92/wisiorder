import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { T } from '../../lib/theme'
import { Button, Field, inputStyle } from '../../components/UI'
import QRCodeStyling from 'qr-code-styling'

const BUCKET = 'menu-photos'

export default function Settings() {
  const { restaurant, reloadRestaurant } = useAuth()
  const [name, setName] = useState(restaurant.name)
  const [color, setColor] = useState(restaurant.primary_color || T.primary)
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url || '')
  const [uploading, setUploading] = useState(false)
  const [requireConfirmation, setRequireConfirmation] = useState(restaurant.require_confirmation ?? true)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const menuUrl = `${window.location.origin}/r/${restaurant.slug}`
  const qrRef = useRef(null)
  const qrInstance = useRef(null)

  // Inizializza / aggiorna il QR
  useEffect(() => {
    if (!qrInstance.current) {
      qrInstance.current = new QRCodeStyling({
        width: 240, height: 240, type: 'svg', data: menuUrl,
        dotsOptions: { color: '#111111', type: 'rounded' },
        backgroundOptions: { color: '#FFFFFF' },
        cornersSquareOptions: { color: color, type: 'extra-rounded' },
        cornersDotOptions: { color: color },
      })
      if (qrRef.current) { qrRef.current.innerHTML = ''; qrInstance.current.append(qrRef.current) }
    } else {
      qrInstance.current.update({ data: menuUrl, cornersSquareOptions: { color }, cornersDotOptions: { color } })
    }
  }, [menuUrl, color])

  async function uploadLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${restaurant.id}/logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      setLogoUrl(data.publicUrl)
    }
    setUploading(false)
  }

  async function save() {
    setBusy(true); setSaved(false)
    await supabase.from('restaurants').update({
      name: name.trim(), primary_color: color, logo_url: logoUrl || null,
      require_confirmation: requireConfirmation,
    }).eq('id', restaurant.id)
    await reloadRestaurant()
    setBusy(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function downloadQR(ext) {
    qrInstance.current?.download({ name: `qr-${restaurant.slug}`, extension: ext })
  }

  function copyLink() {
    navigator.clipboard?.writeText(menuUrl)
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 4px' }}>
        Impostazioni
      </h1>
      <p style={{ fontFamily: T.syne, fontSize: 13, color: T.textSecondary, margin: '0 0 24px' }}>
        Personalizza ciò che vede il cliente e genera il QR da mettere sui tavoli.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
        {/* White-label */}
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 24 }}>
          <h2 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, margin: '0 0 18px' }}>
            Il tuo brand
          </h2>
          <Field label="Nome del locale">
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Colore principale" hint="Usato su pulsanti e accenti del menu cliente.">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                style={{ width: 44, height: 38, border: `1px solid ${T.border}`, borderRadius: T.rSection, background: T.bg, cursor: 'pointer', padding: 2 }} />
              <input style={{ ...inputStyle, flex: 1 }} value={color} onChange={e => setColor(e.target.value)} />
            </div>
          </Field>
          <Field label="Logo">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: T.rSection, background: T.surfaceAlt, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {logoUrl ? <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.syne }}>logo</span>}
              </div>
              <label>
                <span style={{ display: 'inline-block', fontFamily: T.syne, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, border: `1px solid ${T.border}`, borderRadius: T.rBtn, padding: '9px 14px', cursor: 'pointer', background: T.surface }}>
                  {uploading ? 'Caricamento…' : 'Carica logo'}
                </span>
                <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: 'none' }} />
              </label>
            </div>
          </Field>
          <Field label="Conferma ordini">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={requireConfirmation}
                onChange={e => setRequireConfirmation(e.target.checked)}
                style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer', flexShrink: 0, accentColor: T.primary }}
              />
              <div>
                <span style={{ fontFamily: T.syne, fontSize: 13, color: T.text, display: 'block' }}>
                  Richiedi conferma degli ordini
                </span>
                <span style={{ fontFamily: T.syne, fontSize: 12, color: T.textSecondary, display: 'block', marginTop: 3 }}>
                  Gli ordini entrano in cucina solo dopo che li accetti. Protegge dagli ordini falsi.
                </span>
              </div>
            </label>
          </Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <Button onClick={save} disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>{busy ? 'Salvataggio…' : 'Salva modifiche'}</Button>
            {saved && <span style={{ fontFamily: T.syne, fontSize: 13, color: T.green, fontWeight: 700 }}>✓ Salvato</span>}
          </div>
        </div>

        {/* QR */}
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 24 }}>
          <h2 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, margin: '0 0 18px' }}>
            QR del locale
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div ref={qrRef} style={{ border: `1px solid ${T.border}`, borderRadius: T.rSection, padding: 12, background: '#fff' }} />
            <div style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rSection, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <code style={{ fontFamily: T.mono, fontSize: 12, color: T.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{menuUrl}</code>
              <button onClick={copyLink} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: T.syne, fontSize: 11, fontWeight: 700, color: T.primary, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Copia</button>
            </div>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <Button onClick={() => downloadQR('png')} style={{ flex: 1 }}>Scarica PNG</Button>
              <Button variant="ghost" onClick={() => downloadQR('svg')} style={{ flex: 1 }}>SVG</Button>
            </div>
            <p style={{ fontFamily: T.syne, fontSize: 12, color: T.textMuted, textAlign: 'center', margin: 0 }}>
              Stampa il QR e mettilo sui tavoli. Chi lo scansiona apre direttamente il tuo menu.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
