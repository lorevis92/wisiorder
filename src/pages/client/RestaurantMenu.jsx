import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { T } from '../../lib/theme'
import { money } from '../../lib/format'
import { Spinner } from '../../components/UI'

export default function RestaurantMenu() {
  const { slug } = useParams()
  const nav = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [selected, setSelected] = useState(null) // item aperto in dettaglio
  const [cart, setCart] = useState([]) // [{item, quantity, note}]
  const [cartOpen, setCartOpen] = useState(false)
  const [checkout, setCheckout] = useState(false)

  const accent = restaurant?.primary_color || T.primary

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from('restaurants').select('*').eq('slug', slug).maybeSingle()
      if (!r) { setNotFound(true); setLoading(false); return }
      setRestaurant(r)
      const [{ data: c }, { data: i }] = await Promise.all([
        supabase.from('menu_categories').select('*').eq('restaurant_id', r.id).order('sort_order'),
        supabase.from('menu_items').select('*').eq('restaurant_id', r.id).eq('is_available', true).order('sort_order'),
      ])
      setCats(c || [])
      setItems(i || [])
      setLoading(false)
    })()
  }, [slug])

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0)
  const cartTotal = cart.reduce((s, l) => s + l.quantity * l.item.price, 0)

  function addToCart(item, quantity, note) {
    setCart(prev => {
      const idx = prev.findIndex(l => l.item.id === item.id && (l.note || '') === (note || ''))
      if (idx >= 0) {
        const copy = [...prev]; copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity }; return copy
      }
      return [...prev, { item, quantity, note }]
    })
    setSelected(null)
  }

  function setQty(i, q) {
    setCart(prev => q <= 0 ? prev.filter((_, idx) => idx !== i) : prev.map((l, idx) => idx === i ? { ...l, quantity: q } : l))
  }

  if (loading) return <Spinner />
  if (notFound) return <NotFound />

  return (
    <div style={{ minHeight: '100vh', background: T.surface, paddingBottom: cartCount > 0 ? 88 : 24 }}>
      {/* Header brand ristorante (white-label, niente WisiOrder) */}
      <header style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: '20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        {restaurant.logo_url
          ? <img src={restaurant.logo_url} alt="" style={{ height: 44, maxWidth: 120, objectFit: 'contain' }} />
          : <div style={{ width: 44, height: 44, borderRadius: T.rSection, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: T.syne, fontWeight: 800, fontSize: 20 }}>{restaurant.name[0]}</div>}
        <div>
          <h1 style={{ fontFamily: T.georgia, fontWeight: 700, fontSize: 22, margin: 0, color: T.text }}>{restaurant.name}</h1>
          <span style={{ fontFamily: T.syne, fontSize: 12, color: T.textSecondary }}>Ordina dal tavolo</span>
        </div>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: 20 }}>
        {items.length === 0 && (
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 40, textAlign: 'center' }}>
            <p style={{ fontFamily: T.syne, fontSize: 15, color: T.textSecondary, margin: 0 }}>Il menu non è ancora disponibile. Torna più tardi.</p>
          </div>
        )}

        {cats.map(cat => {
          const its = items.filter(i => i.category_id === cat.id)
          if (its.length === 0) return null
          return (
            <section key={cat.id} style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, borderTop: `1px solid ${T.border}`, paddingTop: 12, margin: '0 0 12px' }}>
                {cat.name}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {its.map(item => (
                  <button key={item.id} onClick={() => setSelected(item)} style={{
                    display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left', width: '100%',
                    background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 12, cursor: 'pointer',
                  }}>
                    {item.photo_url && (
                      <img src={item.photo_url} alt="" style={{ width: 72, height: 72, borderRadius: T.rSection, objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 15, color: T.text, display: 'block' }}>{item.name}</span>
                      {item.description && <span style={{ fontFamily: T.syne, fontSize: 13, color: T.textSecondary, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</span>}
                      <span style={{ fontFamily: T.mono, fontSize: 14, color: accent, fontWeight: 500, display: 'block', marginTop: 4 }}>{money(item.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )
        })}

        {/* Voci senza categoria */}
        <Uncategorized items={items} cats={cats} accent={accent} onPick={setSelected} />

        <p style={{ textAlign: 'center', fontFamily: T.syne, fontSize: 11, color: T.textMuted, marginTop: 24 }}>
          Powered by WisiOrder
        </p>
      </div>

      {/* Barra carrello fissa */}
      {cartCount > 0 && !cartOpen && !checkout && (
        <button onClick={() => setCartOpen(true)} style={{
          position: 'fixed', bottom: 16, left: 16, right: 16, maxWidth: 648, margin: '0 auto',
          background: accent, color: '#fff', border: 'none', borderRadius: T.rCard, padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
          fontFamily: T.syne, fontWeight: 700, fontSize: 15, boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        }}>
          <span>{cartCount} {cartCount === 1 ? 'articolo' : 'articoli'}</span>
          <span style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Vedi ordine · {money(cartTotal)}</span>
        </button>
      )}

      {selected && <ItemDetail item={selected} accent={accent} onClose={() => setSelected(null)} onAdd={addToCart} />}
      {cartOpen && !checkout && (
        <Cart cart={cart} accent={accent} total={cartTotal} onQty={setQty} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); setCheckout(true) }} />
      )}
      {checkout && (
        <Checkout restaurant={restaurant} cart={cart} accent={accent} total={cartTotal}
          onBack={() => { setCheckout(false); setCartOpen(true) }}
          onPlaced={(orderId) => nav(`/o/${orderId}`)} />
      )}
    </div>
  )
}

function Uncategorized({ items, cats, accent, onPick }) {
  const catIds = new Set(cats.map(c => c.id))
  const orphans = items.filter(i => !i.category_id || !catIds.has(i.category_id))
  if (orphans.length === 0) return null
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, borderTop: `1px solid ${T.border}`, paddingTop: 12, margin: '0 0 12px' }}>Altro</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {orphans.map(item => (
          <button key={item.id} onClick={() => onPick(item)} style={{ display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left', width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 12, cursor: 'pointer' }}>
            {item.photo_url && <img src={item.photo_url} alt="" style={{ width: 72, height: 72, borderRadius: T.rSection, objectFit: 'cover', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 15, color: T.text, display: 'block' }}>{item.name}</span>
              <span style={{ fontFamily: T.mono, fontSize: 14, color: accent, fontWeight: 500, display: 'block', marginTop: 4 }}>{money(item.price)}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function ItemDetail({ item, accent, onClose, onAdd }) {
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.45)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg, borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto', animation: 'wo-slidein 0.2s ease' }}>
        {item.photo_url && <img src={item.photo_url} alt="" style={{ width: '100%', height: 220, objectFit: 'cover' }} />}
        <div style={{ padding: 20 }}>
          <h2 style={{ fontFamily: T.georgia, fontWeight: 700, fontSize: 24, margin: '0 0 6px', color: T.text }}>{item.name}</h2>
          {item.description && <p style={{ fontFamily: T.syne, fontSize: 14, lineHeight: 1.5, color: T.textSecondary, margin: '0 0 14px' }}>{item.description}</p>}
          <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 500, color: accent }}>{money(item.price)}</span>

          <div style={{ marginTop: 18 }}>
            <span style={{ display: 'block', fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, marginBottom: 6 }}>Nota (facoltativa)</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Es. senza arachidi"
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: T.syne, fontSize: 14, border: `1px solid ${T.border}`, borderRadius: T.rSection, padding: '10px 12px', outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${T.border}`, borderRadius: T.rBtn }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={qtyBtn}>−</button>
              <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 500, minWidth: 32, textAlign: 'center' }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={qtyBtn}>+</button>
            </div>
            <button onClick={() => onAdd(item, qty, note.trim())} style={{
              flex: 1, background: accent, color: '#fff', border: 'none', borderRadius: T.rBtn, padding: '13px',
              fontFamily: T.syne, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer',
            }}>
              Aggiungi · {money(item.price * qty)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Cart({ cart, accent, total, onQty, onClose, onCheckout }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.45)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg, borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto', animation: 'wo-slidein 0.2s ease' }}>
        <div style={{ padding: 20 }}>
          <h2 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 18px' }}>Il tuo ordine</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cart.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.border}`, paddingBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 15, color: T.text }}>{l.item.name}</span>
                  {l.note && <span style={{ display: 'block', fontFamily: T.syne, fontSize: 12, color: T.textSecondary, fontStyle: 'italic' }}>“{l.note}”</span>}
                  <span style={{ fontFamily: T.mono, fontSize: 13, color: T.textSecondary }}>{money(l.item.price)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${T.border}`, borderRadius: T.rBtn }}>
                  <button onClick={() => onQty(i, l.quantity - 1)} style={qtyBtnSm}>−</button>
                  <span style={{ fontFamily: T.mono, fontSize: 14, minWidth: 28, textAlign: 'center' }}>{l.quantity}</span>
                  <button onClick={() => onQty(i, l.quantity + 1)} style={qtyBtnSm}>+</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0' }}>
            <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: T.textSecondary }}>Totale</span>
            <span style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 500, color: T.text }}>{money(total)}</span>
          </div>
          <button onClick={onCheckout} style={{ width: '100%', background: accent, color: '#fff', border: 'none', borderRadius: T.rBtn, padding: '14px', fontFamily: T.syne, fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer' }}>
            Procedi
          </button>
        </div>
      </div>
    </div>
  )
}

function Checkout({ restaurant, cart, accent, total, onBack, onPlaced }) {
  const [name, setName] = useState('')
  const [table, setTable] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function place() {
    if (!name.trim()) { setError('Inserisci il tuo nome.'); return }
    setBusy(true); setError('')
    const payload = cart.map(l => ({ menu_item_id: l.item.id, quantity: l.quantity, note: l.note || null }))
    const { data, error } = await supabase.rpc('place_order', {
      p_restaurant_id: restaurant.id,
      p_customer_name: name.trim(),
      p_table_number: table.trim() || null,
      p_items: payload,
    })
    setBusy(false)
    if (error) { setError('Invio fallito. Riprova.'); return }
    onPlaced(data)
  }

  return (
    <div onClick={onBack} style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.45)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg, borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto', animation: 'wo-slidein 0.2s ease' }}>
        <div style={{ padding: 20 }}>
          <h2 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 18px' }}>Quasi fatto</h2>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ display: 'block', fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, marginBottom: 6 }}>Il tuo nome *</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Mario"
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: T.syne, fontSize: 15, border: `1px solid ${T.border}`, borderRadius: T.rSection, padding: '11px 12px', outline: 'none' }} />
          </label>
          <label style={{ display: 'block', marginBottom: 18 }}>
            <span style={{ display: 'block', fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, marginBottom: 6 }}>Numero tavolo</span>
            <input value={table} onChange={e => setTable(e.target.value)} placeholder="Es. 12" inputMode="numeric"
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: T.syne, fontSize: 15, border: `1px solid ${T.border}`, borderRadius: T.rSection, padding: '11px 12px', outline: 'none' }} />
          </label>

          {error && <p style={{ fontFamily: T.syne, fontSize: 13, color: T.primary }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 16px' }}>
            <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: T.textSecondary }}>Totale</span>
            <span style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 500, color: T.text }}>{money(total)}</span>
          </div>

          <button onClick={place} disabled={busy} style={{ width: '100%', background: accent, color: '#fff', border: 'none', borderRadius: T.rBtn, padding: '15px', fontFamily: T.syne, fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Invio…' : 'Invia ordine'}
          </button>
          <button onClick={onBack} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.syne, fontSize: 12, color: T.textSecondary, marginTop: 12 }}>← Torna all'ordine</button>
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: T.surface }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h1 style={{ fontFamily: T.georgia, fontWeight: 700, fontSize: 28, color: T.text, margin: '0 0 10px' }}>Locale non trovato</h1>
        <p style={{ fontFamily: T.syne, fontSize: 15, color: T.textSecondary, margin: 0 }}>
          Il QR potrebbe non essere più valido. Chiedi al personale del locale.
        </p>
      </div>
    </div>
  )
}

const qtyBtn = { width: 40, height: 40, border: 'none', background: T.surface, cursor: 'pointer', fontSize: 20, color: T.text, fontFamily: T.syne }
const qtyBtnSm = { width: 32, height: 32, border: 'none', background: T.surface, cursor: 'pointer', fontSize: 16, color: T.text, fontFamily: T.syne }
