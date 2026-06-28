import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { T, STATUS_LABEL, STATUS_COLOR } from '../../lib/theme'
import { money, relTime } from '../../lib/format'
import { Button, Badge, Spinner } from '../../components/UI'
import { initAudio, beep, vibrate } from '../../lib/sound'

const hasActiveItems = (order) =>
  (order.order_items || []).some(i => i.status === 'pending' || i.status === 'preparing')

const allReady = (order) =>
  (order.order_items || []).length > 0 &&
  (order.order_items || []).every(i => i.status === 'ready')

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

  async function setItemStatus(orderId, itemId, status) {
    patchItem(orderId, itemId, status)
    await supabase.from('order_items').update({ status }).eq('id', itemId)
  }

  async function advanceGroup(orderId, ids, targetStatus) {
    patchItems(orderId, ids, targetStatus)
    await supabase.from('order_items').update({ status: targetStatus }).in('id', ids)
  }

  async function closeOrder(order) {
    if (!confirm(`Chiudere il conto #${order.order_number ?? '—'} di ${order.customer_name}?`)) return
    setOrders(prev => prev.filter(o => o.id !== order.id))
    await supabase.from('orders').update({ closed_at: new Date().toISOString() }).eq('id', order.id)
  }

  function enableSound() {
    initAudio(); beep({ freq: 660, repeat: 1 }); setSoundOn(true)
  }

  if (loading) return <Spinner label="Carico ordini…" />

  const inCorso = orders.filter(hasActiveItems)
  const daPagare = orders.filter(allReady)
  const nessuno = orders.length === 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
            Ordini in corso
          </h1>
          <p style={{ fontFamily: T.syne, fontSize: 13, color: T.textSecondary, margin: '4px 0 0' }}>
            {nessuno ? 'Nessun ordine attivo.' : `${orders.length} ${orders.length === 1 ? 'ordine attivo' : 'ordini attivi'} · in tempo reale`}
          </p>
        </div>
        <Button variant={soundOn ? 'ghost' : 'primary'} onClick={() => soundOn ? setSoundOn(false) : enableSound()}>
          {soundOn ? '🔔 Suono attivo' : '🔕 Attiva suono'}
        </Button>
      </div>

      {nessuno && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 48, textAlign: 'center' }}>
          <p style={{ fontFamily: T.syne, fontSize: 15, color: T.textSecondary, margin: 0 }}>
            Quando un cliente invia un ordine comparirà qui, con un avviso sonoro.
          </p>
        </div>
      )}

      {/* Sezione: Ordini in corso */}
      {inCorso.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionLabel label="Ordini in corso" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
            {inCorso.map(o => (
              <OrderCardActive
                key={o.id}
                order={o}
                onSetItemStatus={setItemStatus}
                onAdvanceGroup={advanceGroup}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sezione: Da pagare */}
      {daPagare.length > 0 && (
        <div>
          <SectionLabel label="Da pagare" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, alignItems: 'start' }}>
            {daPagare.map(o => (
              <OrderCardPronti key={o.id} order={o} onClose={closeOrder} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────

function SectionLabel({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  )
}

// ─── CARD ORDINE ATTIVO ───────────────────────────────────────────────────────

function OrderCardActive({ order, onSetItemStatus, onAdvanceGroup }) {
  const items = order.order_items || []
  const rounds = [...new Set(items.map(i => i.round ?? 1))].sort((a, b) => a - b)

  return (
    <div style={{
      background: T.bg, border: `1px solid ${T.border}`,
      borderRadius: T.rCard, padding: 18, animation: 'wo-slidein 0.25s ease',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header card */}
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
        <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 14, color: T.textSecondary, whiteSpace: 'nowrap' }}>
          {money(order.total)}
        </span>
      </div>

      {/* Voci per round e categoria */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rounds.map(round => {
          const roundItems = items.filter(i => (i.round ?? 1) === round)
          const { catMap, sortedCats } = buildCatGroups(roundItems)
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
                    onSetItemStatus={onSetItemStatus}
                    onAdvanceGroup={onAdvanceGroup}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── CARD PRONTO DA PAGARE ────────────────────────────────────────────────────

function OrderCardPronti({ order, onClose }) {
  const items = order.order_items || []
  return (
    <div style={{
      background: T.bg, border: `1px solid ${T.green}`,
      borderRadius: T.rCard, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 20, color: T.text }}>#{order.order_number ?? '—'}</span>
            <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 15, color: T.text }}>{order.customer_name}</span>
          </div>
          {order.table_number && (
            <div style={{ marginTop: 4 }}>
              <Badge color={T.textSecondary}>Tavolo {order.table_number}</Badge>
            </div>
          )}
        </div>
        <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 20, color: T.text, whiteSpace: 'nowrap' }}>
          {money(order.total)}
        </span>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: T.syne, fontSize: 13, color: T.text }}>
              <span style={{ fontFamily: T.mono, fontWeight: 500, color: T.primary }}>{item.quantity}×</span> {item.item_name}
            </span>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, whiteSpace: 'nowrap' }}>
              {money(item.unit_price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <Button variant="danger" onClick={() => onClose(order)} style={{ width: '100%', textAlign: 'center', marginTop: 4 }}>
        Chiudi conto
      </Button>
    </div>
  )
}

// ─── CATEGORY GROUP + ITEM ROW ────────────────────────────────────────────────

function buildCatGroups(items) {
  const catMap = {}
  const catOrder = []
  for (const item of items) {
    const cat = item.category_name || 'Altro'
    if (!catMap[cat]) { catMap[cat] = []; catOrder.push(cat) }
    catMap[cat].push(item)
  }
  const sortedCats = [...catOrder.filter(c => c !== 'Altro'), ...(catOrder.includes('Altro') ? ['Altro'] : [])]
  return { catMap, sortedCats }
}

function CategoryGroup({ catName, catItems, orderId, onSetItemStatus, onAdvanceGroup }) {
  const [openItemId, setOpenItemId] = useState(null)
  const hasPending = catItems.some(i => i.status === 'pending')
  const hasPreparing = catItems.some(i => i.status === 'preparing')
  const groupAllReady = catItems.every(i => i.status === 'ready')

  useEffect(() => {
    if (!openItemId) return
    function handler() { setOpenItemId(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openItemId])

  return (
    <div style={{ background: T.surface, borderRadius: T.rSection, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary }}>
          {catName}
        </span>
        {!groupAllReady && hasPending && (
          <Button variant="ghost"
            onClick={() => onAdvanceGroup(orderId, catItems.filter(i => i.status === 'pending').map(i => i.id), 'preparing')}
            style={{ padding: '4px 10px', fontSize: 11 }}>
            In preparazione
          </Button>
        )}
        {!groupAllReady && !hasPending && hasPreparing && (
          <Button variant="primary"
            onClick={() => onAdvanceGroup(orderId, catItems.filter(i => i.status === 'preparing').map(i => i.id), 'ready')}
            style={{ padding: '4px 10px', fontSize: 11 }}>
            Pronti
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {catItems.map(item => (
          <div key={item.id}>
            <ItemRow
              item={item}
              isOpen={openItemId === item.id}
              onRowClick={(e) => { e.stopPropagation(); setOpenItemId(openItemId === item.id ? null : item.id) }}
            />
            {openItemId === item.id && (
              <div onClick={e => e.stopPropagation()} style={{
                marginTop: 6, background: T.bg, border: `1px solid ${T.border}`,
                borderRadius: T.rSection, padding: '8px 10px',
                display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
              }}>
                <span style={{ fontFamily: T.syne, fontSize: 11, color: T.textSecondary, flex: 1, minWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.item_name}
                </span>
                {(['pending', 'preparing', 'ready']).map(s => (
                  <button key={s}
                    onClick={() => { onSetItemStatus(orderId, item.id, s); setOpenItemId(null) }}
                    style={{
                      fontFamily: T.syne, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5,
                      border: `1px solid ${item.status === s ? STATUS_COLOR[s] : T.border}`,
                      borderRadius: T.rBtn, padding: '4px 8px', cursor: 'pointer', flexShrink: 0,
                      background: item.status === s ? STATUS_COLOR[s] : 'transparent',
                      color: item.status === s ? (s === 'pending' ? T.text : '#fff') : T.textMuted,
                    }}
                  >{STATUS_LABEL[s]}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ItemRow({ item, isOpen, onRowClick }) {
  const dot = item.status === 'pending' ? T.textMuted : item.status === 'preparing' ? T.yellow : T.green
  return (
    <div onClick={onRowClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      borderRadius: T.rSection, padding: '3px 2px',
      background: isOpen ? T.surfaceAlt : 'transparent', transition: 'background 0.12s',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, display: 'block' }} />
      <span style={{ flex: 1, minWidth: 0, fontFamily: T.syne, fontSize: 13, color: T.text }}>
        <span style={{ fontFamily: T.mono, fontWeight: 500, color: T.primary }}>{item.quantity}×</span>{' '}
        {item.item_name}
        {item.note && (
          <span style={{ display: 'block', fontSize: 11, color: T.textSecondary, fontStyle: 'italic', marginTop: 1 }}>
            "{item.note}"
          </span>
        )}
      </span>
      <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {money(item.unit_price * item.quantity)}
      </span>
    </div>
  )
}
