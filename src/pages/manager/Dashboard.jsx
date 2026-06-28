import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { T, STATUS_LABEL, STATUS_COLOR } from '../../lib/theme'
import { money, relTime } from '../../lib/format'
import { Button, Badge, Spinner } from '../../components/UI'
import { initAudio, beep, vibrate } from '../../lib/sound'

const ACTIVE = ['received', 'preparing', 'ready']

export default function Dashboard() {
  const { restaurant } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const soundRef = useRef(true)
  soundRef.current = soundOn

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', restaurant.id)
      .in('status', ACTIVE)
      .order('created_at', { ascending: true })
    setOrders(data || [])
    setLoading(false)
  }, [restaurant.id])

  useEffect(() => { load() }, [load])

  // Realtime: nuovi ordini + cambi stato
  useEffect(() => {
    const ch = supabase
      .channel(`orders-${restaurant.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        () => {
          if (soundRef.current) { beep({ freq: 880, repeat: 2 }); vibrate() }
          load()
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [restaurant.id, load])

  // Aggiorna i "min fa" ogni 30s
  useEffect(() => {
    const t = setInterval(() => setOrders(o => [...o]), 30000)
    return () => clearInterval(t)
  }, [])

  async function advance(order) {
    const next = { received: 'preparing', preparing: 'ready', ready: 'completed' }[order.status]
    const patch = { status: next }
    if (next === 'ready') patch.ready_at = new Date().toISOString()
    // Aggiornamento ottimistico
    setOrders(prev => next === 'completed'
      ? prev.filter(o => o.id !== order.id)
      : prev.map(o => o.id === order.id ? { ...o, ...patch } : o))
    await supabase.from('orders').update(patch).eq('id', order.id)
  }

  function enableSound() {
    initAudio(); beep({ freq: 660, repeat: 1 }); setSoundOn(true)
  }

  if (loading) return <Spinner label="Carico ordini…" />

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
            Ordini in corso
          </h1>
          <p style={{ fontFamily: T.syne, fontSize: 13, color: T.textSecondary, margin: '4px 0 0' }}>
            {orders.length === 0 ? 'Nessun ordine attivo.' : `${orders.length} ${orders.length === 1 ? 'ordine attivo' : 'ordini attivi'} · aggiornamento in tempo reale`}
          </p>
        </div>
        <Button variant={soundOn ? 'ghost' : 'primary'} onClick={() => soundOn ? setSoundOn(false) : enableSound()}>
          {soundOn ? '🔔 Suono attivo' : '🔕 Attiva suono'}
        </Button>
      </div>

      {orders.length === 0 ? (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 48, textAlign: 'center' }}>
          <p style={{ fontFamily: T.syne, fontSize: 15, color: T.textSecondary, margin: 0 }}>
            Quando un cliente invia un ordine comparirà qui, con un avviso sonoro.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
          {orders.map(o => <OrderCard key={o.id} order={o} onAdvance={advance} />)}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, onAdvance }) {
  const items = order.order_items || []
  const c = STATUS_COLOR[order.status]
  const nextLabel = { received: 'Inizia preparazione', preparing: 'Segna come pronto', ready: 'Consegnato' }[order.status]
  const isReady = order.status === 'ready'

  return (
    <div style={{
      background: T.bg, border: `1px solid ${isReady ? T.green : T.border}`, borderRadius: T.rCard,
      padding: 18, animation: 'wo-slidein 0.25s ease', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 20, color: T.text }}>#{order.order_number ?? '—'}</span>
            <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 15, color: T.text }}>{order.customer_name}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            {order.table_number && <Badge color={T.textSecondary}>Tavolo {order.table_number}</Badge>}
            <span style={{ fontFamily: T.syne, fontSize: 12, color: T.textMuted }}>{relTime(order.created_at)}</span>
          </div>
        </div>
        <Badge color={c} bg={'transparent'}>
          <span style={{ color: c }}>● {STATUS_LABEL[order.status]}</span>
        </Badge>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(it => (
          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: T.syne, fontSize: 14, color: T.text }}>
              <span style={{ fontFamily: T.mono, color: T.primary, fontWeight: 500 }}>{it.quantity}×</span> {it.item_name}
              {it.note && <span style={{ display: 'block', fontSize: 12, color: T.textSecondary, fontStyle: 'italic' }}>“{it.note}”</span>}
            </span>
            <span style={{ fontFamily: T.mono, fontSize: 13, color: T.textSecondary, whiteSpace: 'nowrap' }}>
              {money(it.unit_price * it.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 16, color: T.text }}>{money(order.total)}</span>
        <Button variant={isReady ? 'success' : 'primary'} onClick={() => onAdvance(order)} style={{ padding: '9px 14px' }}>
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}
