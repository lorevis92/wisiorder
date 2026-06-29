import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { T, STATUS_LABEL } from '../../lib/theme'
import { money, relTime } from '../../lib/format'
import { Button, Badge, Spinner } from '../../components/UI'
import { initAudio, beep, vibrate } from '../../lib/sound'

const isReady = (i) => i.status === 'ready'
const isPreparing = (i) => i.status === 'preparing'
const isPending = (i) => !isReady(i) && !isPreparing(i)

const sortItems = (arr) => [...(arr || [])].sort((a, b) => {
  const ca = a.created_at || '', cb = b.created_at || ''
  if (ca !== cb) return ca < cb ? -1 : 1
  return a.id < b.id ? -1 : 1
})

const cycleStatus = { pending: 'preparing', preparing: 'ready', ready: 'pending' }

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
      .is('closed_at', null)
      .order('created_at', { ascending: true })
    setOrders(data || [])
    setLoading(false)
  }, [restaurant.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const chOrders = supabase
      .channel(`orders-${restaurant.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        () => { if (soundRef.current) { beep({ freq: 880, repeat: 2 }); vibrate() }; load() })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        () => load())
      .subscribe()

    const chItems = supabase
      .channel(`order-items-${restaurant.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items', filter: `restaurant_id=eq.${restaurant.id}` },
        (payload) => { if (soundRef.current && payload.new?.round > 1) { beep({ freq: 660, repeat: 3 }); vibrate() }; load() })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_items', filter: `restaurant_id=eq.${restaurant.id}` },
        () => load())
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'order_items', filter: `restaurant_id=eq.${restaurant.id}` },
        () => load())
      .subscribe()

    return () => { supabase.removeChannel(chOrders); supabase.removeChannel(chItems) }
  }, [restaurant.id, load])

  useEffect(() => {
    const t = setInterval(() => setOrders(o => [...o]), 30000)
    return () => clearInterval(t)
  }, [])

  function patchItem(orderId, itemId, status) {
    setOrders(prev => prev.map(o => o.id !== orderId ? o : {
      ...o, order_items: o.order_items.map(i => i.id === itemId ? { ...i, status } : i),
    }))
  }

  function patchItems(orderId, ids, status) {
    setOrders(prev => prev.map(o => o.id !== orderId ? o : {
      ...o, order_items: o.order_items.map(i => ids.includes(i.id) ? { ...i, status } : i),
    }))
  }

  async function cycleItem(orderId, item) {
    const cur = item.status === 'queued' ? 'pending' : item.status
    const ns = cycleStatus[cur]
    patchItem(orderId, item.id, ns)
    await supabase.from('order_items').update({ status: ns }).eq('id', item.id)
  }

  async function advanceGroup(orderId, groupItems) {
    const pending = groupItems.filter(isPending)
    if (pending.length > 0) {
      const ids = pending.map(i => i.id)
      patchItems(orderId, ids, 'preparing')
      await supabase.from('order_items').update({ status: 'preparing' }).in('id', ids)
      return
    }
    const preparing = groupItems.filter(isPreparing)
    if (preparing.length > 0) {
      const ids = preparing.map(i => i.id)
      patchItems(orderId, ids, 'ready')
      await supabase.from('order_items').update({ status: 'ready' }).in('id', ids)
    }
  }

  async function closeOrder(order) {
    const notReady = (order.order_items || []).some(i => !isReady(i))
    if (notReady && !confirm('Ci sono voci non ancora pronte. Chiudi comunque il conto?')) return
    setOrders(prev => prev.filter(o => o.id !== order.id))
    await supabase.from('orders').update({ closed_at: new Date().toISOString() }).eq('id', order.id)
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
            {orders.length === 0
              ? 'Nessun ordine attivo.'
              : `${orders.length} ${orders.length === 1 ? 'ordine attivo' : 'ordini attivi'} · aggiornamento in tempo reale`}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
          {orders.map(o => (
            <OrderCard
              key={o.id}
              order={o}
              onCycleItem={cycleItem}
              onAdvanceGroup={advanceGroup}
              onClose={closeOrder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, onCycleItem, onAdvanceGroup, onClose }) {
  const items = sortItems(order.order_items || [])
  const allReady = items.length > 0 && items.every(isReady)
  const rounds = [...new Set(items.map(i => i.round ?? 1))].sort((a, b) => a - b)

  return (
    <div style={{
      background: T.bg, border: `1px solid ${allReady ? T.green : T.border}`,
      borderRadius: T.rCard, padding: 18, animation: 'wo-slidein 0.25s ease',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 20, color: T.text }}>#{order.order_number ?? '—'}</span>
            <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 15, color: T.text }}>{order.customer_name}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            {order.table_number && <Badge color={T.textSecondary}>Tavolo {order.table_number}</Badge>}
            <span style={{ fontFamily: T.syne, fontSize: 12, color: T.textMuted }}>{relTime(order.created_at)}</span>
          </div>
        </div>
        <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 15, color: T.text, whiteSpace: 'nowrap' }}>
          {money(order.total)}
        </span>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rounds.map(round => {
          const roundItems = items.filter(i => (i.round ?? 1) === round)
          const catMap = {}
          const catOrder = []
          for (const item of roundItems) {
            const cat = item.category_name || 'Altro'
            if (!catMap[cat]) { catMap[cat] = []; catOrder.push(cat) }
            catMap[cat].push(item)
          }
          const sortedCats = [...catOrder.filter(c => c !== 'Altro'), ...(catOrder.includes('Altro') ? ['Altro'] : [])]
          return (
            <div key={round}>
              {round > 1 && (
                <div style={{ marginBottom: 8 }}>
                  <Badge color={T.primary} bg={T.primaryLight}>➕ {round}° GIRO</Badge>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedCats.map(cat => (
                  <CategoryGroup
                    key={`${round}-${cat}`}
                    catName={cat}
                    catItems={catMap[cat]}
                    orderId={order.id}
                    onCycleItem={onCycleItem}
                    onAdvanceGroup={onAdvanceGroup}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        <Button variant="danger" onClick={() => onClose(order)} style={{ width: '100%', textAlign: 'center' }}>
          Chiudi conto
        </Button>
      </div>
    </div>
  )
}

function CategoryGroup({ catName, catItems, orderId, onCycleItem, onAdvanceGroup }) {
  const hasPending = catItems.some(isPending)
  const hasPreparing = catItems.some(isPreparing)

  return (
    <div style={{ background: T.surface, borderRadius: T.rSection, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary }}>
          {catName}
        </span>
        {hasPending && (
          <Button variant="ghost" onClick={() => onAdvanceGroup(orderId, catItems)} style={{ padding: '4px 10px', fontSize: 11 }}>
            In preparazione
          </Button>
        )}
        {!hasPending && hasPreparing && (
          <Button variant="primary" onClick={() => onAdvanceGroup(orderId, catItems)} style={{ padding: '4px 10px', fontSize: 11 }}>
            Pronti
          </Button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {catItems.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            onCycle={() => onCycleItem(orderId, item)}
          />
        ))}
      </div>
    </div>
  )
}

function ItemRow({ item, onCycle }) {
  const statusKey = item.status === 'queued' ? 'pending' : (item.status || 'pending')
  const btnStyle = statusKey === 'ready'
    ? { background: T.green, border: `1px solid ${T.green}`, color: '#fff' }
    : statusKey === 'preparing'
      ? { background: T.yellow, border: `1px solid ${T.yellow}`, color: '#fff' }
      : { background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 2px' }}>
      <span style={{ flex: 1, minWidth: 0, fontFamily: T.syne, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: T.mono, fontWeight: 500, color: T.primary }}>{item.quantity}×</span>{' '}
        {item.item_name}
        {item.note && (
          <span style={{ fontFamily: T.syne, fontSize: 11, color: T.textSecondary, fontStyle: 'italic' }}> — "{item.note}"</span>
        )}
      </span>
      <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {money(item.unit_price * item.quantity)}
      </span>
      <button
        type="button"
        onClick={onCycle}
        style={{
          ...btnStyle,
          fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
          borderRadius: T.rBtn, padding: '6px 12px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        }}
      >
        {STATUS_LABEL[statusKey]}
      </button>
    </div>
  )
}
