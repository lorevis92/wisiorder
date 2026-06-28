import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { T, ORDER_FLOW, STATUS_LABEL } from '../../lib/theme'
import { money } from '../../lib/format'
import { Spinner } from '../../components/UI'
import { initAudio, beep, vibrate } from '../../lib/sound'

export default function OrderStatus() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const prevStatus = useRef(null)
  const notifiedReady = useRef(false)

  async function fetchOrder() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), restaurants(name, logo_url, primary_color)')
      .eq('id', orderId)
      .maybeSingle()
    if (!data) { setNotFound(true); setLoading(false); return }
    setRestaurant(data.restaurants)
    setOrder(data)
    setLoading(false)
    // Notifica passaggio a "pronto"
    if (data.status === 'ready' && prevStatus.current && prevStatus.current !== 'ready' && !notifiedReady.current) {
      notifiedReady.current = true
      beep({ freq: 660, repeat: 3 }); vibrate([200, 100, 200])
    }
    prevStatus.current = data.status
  }

  useEffect(() => { fetchOrder() }, [orderId])

  // Realtime sul singolo ordine
  useEffect(() => {
    const ch = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => fetchOrder())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orderId])

  if (loading) return <Spinner />
  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: T.surface }}>
      <p style={{ fontFamily: T.syne, fontSize: 15, color: T.textSecondary }}>Ordine non trovato.</p>
    </div>
  )

  const accent = restaurant?.primary_color || T.primary
  const items = order.order_items || []
  const currentStep = order.status === 'completed' ? 2 : ORDER_FLOW.indexOf(order.status)
  const isReady = order.status === 'ready' || order.status === 'completed'

  return (
    <div style={{ minHeight: '100vh', background: T.surface }}>
      <header style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        {restaurant?.logo_url
          ? <img src={restaurant.logo_url} alt="" style={{ height: 36, maxWidth: 110, objectFit: 'contain' }} />
          : <div style={{ width: 36, height: 36, borderRadius: T.rSection, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.syne, fontWeight: 800 }}>{restaurant?.name?.[0]}</div>}
        <span style={{ fontFamily: T.georgia, fontWeight: 700, fontSize: 18, color: T.text }}>{restaurant?.name}</span>
      </header>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: 20 }}>
        {/* Stato grande */}
        <div style={{ background: T.bg, border: `1px solid ${isReady ? T.green : T.border}`, borderRadius: T.rCard, padding: 28, textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontFamily: T.mono, fontSize: 14, color: T.textMuted }}>Ordine #{order.order_number ?? '—'}</span>
          <h1 style={{ fontFamily: T.georgia, fontWeight: 700, fontSize: 30, margin: '8px 0 6px', color: isReady ? T.green : T.text }}>
            {order.status === 'ready' ? 'Il tuo ordine è pronto!' : order.status === 'completed' ? 'Ordine consegnato' : 'Ordine ricevuto'}
          </h1>
          <p style={{ fontFamily: T.syne, fontSize: 14, color: T.textSecondary, margin: 0 }}>
            {order.status === 'ready' ? 'Vai a ritirarlo al banco.' : order.status === 'completed' ? 'Buon appetito!' : 'Lo stiamo preparando, tieni aperta questa pagina.'}
          </p>
        </div>

        {/* Timeline */}
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 24, marginBottom: 16 }}>
          {ORDER_FLOW.map((step, i) => {
            const done = i <= currentStep
            const active = i === currentStep && order.status !== 'completed'
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: done ? accent : T.surfaceAlt, color: done ? '#fff' : T.textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.mono, fontSize: 13,
                  animation: active ? 'wo-pulse 1.6s infinite' : 'none',
                }}>{done ? '✓' : i + 1}</div>
                <span style={{ fontFamily: T.syne, fontWeight: done ? 700 : 500, fontSize: 15, color: done ? T.text : T.textMuted }}>
                  {STATUS_LABEL[step]}
                </span>
              </div>
            )
          })}
        </div>

        {/* Riepilogo */}
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 24 }}>
          <h2 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, margin: '0 0 14px' }}>
            {order.customer_name}{order.table_number ? ` · Tavolo ${order.table_number}` : ''}
          </h2>
          {items.map(it => (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: T.syne, fontSize: 14, color: T.text }}>
                <span style={{ fontFamily: T.mono, color: accent }}>{it.quantity}×</span> {it.item_name}
              </span>
              <span style={{ fontFamily: T.mono, fontSize: 13, color: T.textSecondary }}>{money(it.unit_price * it.quantity)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${T.border}`, paddingTop: 12, marginTop: 8 }}>
            <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: T.textSecondary }}>Totale</span>
            <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 500, color: T.text }}>{money(order.total)}</span>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontFamily: T.syne, fontSize: 11, color: T.textMuted, marginTop: 20 }}>Powered by WisiOrder</p>
      </div>
    </div>
  )
}
