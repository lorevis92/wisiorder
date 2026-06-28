import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { T } from '../../lib/theme'
import { money, relTime } from '../../lib/format'
import { Button, Badge, Spinner } from '../../components/UI'
import { initAudio, beep, vibrate } from '../../lib/sound'

const hasActiveItems = (order) =>
  (order.order_items || []).some(i => i.status !== 'ready')

const isAllReady = (order) =>
  (order.order_items || []).length > 0 &&
  (order.order_items || []).every(i => i.status === 'ready')

export default function Dashboard() {
  const { restaurant } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [soundOn, setSoundOn] = useState(true)
  const soundRef = useRef(true)
  soundRef.current = soundOn

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurant.id)
        .is('closed_at', null)
        .order('created_at', { ascending: true })
      if (error) throw error
      setOrders(data || [])
      setLoadError(null)
    } catch (e) {
      setLoadError(e.message || 'Errore nel caricamento degli ordini.')
    } finally {
      setLoading(false)
    }
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
      ...o, order_items: (o.order_items || []).map(i => i.id === itemId ? { ...i, status } : i),
    }))
  }

  function patchItems(orderId, ids, toStatus) {
    setOrders(prev => prev.map(o => o.id !== orderId ? o : {
      ...o, order_items: (o.order_items || []).map(i => ids.includes(i.id) ? { ...i, status: toStatus } : i),
    }))
  }

  async function setItemStatus(orderId, itemId, status) {
    patchItem(orderId, itemId, status)
    await supabase.from('order_items').update({ status }).eq('id', itemId)
  }

  async function advanceGroup(orderId, ids, toStatus) {
    patchItems(orderId, ids, toStatus)
    await supabase.from('order_items').update({ status: toStatus }).in('id', ids)
  }

  async function closeOrder(order) {
    const hasNotReady = (order.order_items || []).some(i => i.status !== 'ready')
    if (hasNotReady && !confirm('Ci sono voci non ancora pronte. Chiudi comunque il conto?')) return
    setOrders(prev => prev.filter(o => o.id !== order.id))
    await supabase.from('orders').update({ closed_at: new Date().toISOString() }).eq('id', order.id)
  }

  function enableSound() {
    initAudio(); beep({ freq: 660, repeat: 1 }); setSoundOn(true)
  }

  if (loading) return <Spinner label="Carico ordini…" />

  if (loadError) return (
    <div style={{ maxWidth: 520, margin: '60px auto', padding: 24, textAlign: 'center' }}>
      <p style={{ fontFamily: T.syne, fontSize: 15, color: T.primary, marginBottom: 16 }}>{loadError}</p>
      <Button variant="primary" onClick={load}>Riprova</Button>
    </div>
  )

  const inCorso = orders.filter(hasActiveItems)
  const daPagare = orders.filter(isAllReady)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
            Ordini
          </h1>
          <p style={{ fontFamily: T.syne, fontSize: 13, color: T.textSecondary, margin: '4px 0 0' }}>
            {orders.length === 0
              ? 'Nessun ordine attivo.'
              : `${inCorso.length} in corso · ${daPagare.length} da pagare · tempo reale`}
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
        <>
          <h2 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: T.textSecondary, margin: '0 0 12px' }}>
            Ordini in corso
          </h2>
          {inCorso.length === 0 ? (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 20, marginBottom: 28, textAlign: 'center' }}>
              <p style={{ fontFamily: T.syne, fontSize: 13, color: T.textMuted, margin: 0 }}>Tutti gli ordini sono pronti.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'start', marginBottom: 32 }}>
              {inCorso.map(o => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onSetItemStatus={setItemStatus}
                  onAdvanceGroup={advanceGroup}
                  onClose={closeOrder}
                />
              ))}
            </div>
          )}

          {daPagare.length > 0 && (
            <>
              <h2 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: T.green, margin: '0 0 12px' }}>
                Da pagare
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, alignItems: 'start' }}>
                {daPagare.map(o => (
                  <OrderCardPronti key={o.id} order={o} onClose={closeOrder} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function OrderCard({ order, onSetItemStatus, onAdvanceGroup, onClose }) {
  const items = order.order_items || []
  const rounds = [...new Set(items.map(i => i.round ?? 1))].sort((a, b) => a - b)

  return (
    <div style={{
      background: T.bg, border: `1px solid ${T.border}`,
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
                    onSetItemStatus={onSetItemStatus}
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

function OrderCardPronti({ order, onClose }) {
  const items = order.order_items || []
  return (
    <div style={{
      background: T.bg, border: `2px solid ${T.green}`,
      borderRadius: T.rCard, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 18, color: T.text }}>#{order.order_number ?? '—'}</span>
            <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 14, color: T.text }}>{order.customer_name}</span>
          </div>
          {order.table_number && (
            <span style={{ fontFamily: T.syne, fontSize: 12, color: T.textSecondary }}>Tavolo {order.table_number}</span>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 20, color: T.green }}>{money(order.total)}</div>
          <div style={{ fontFamily: T.syne, fontSize: 11, color: T.green, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Tutto pronto
          </div>
        </div>
      </div>
      <div style={{ fontFamily: T.syne, fontSize: 12, color: T.textMuted }}>
        {items.length} {items.length === 1 ? 'voce' : 'voci'}
      </div>
      <Button variant="danger" onClick={() => onClose(order)} style={{ width: '100%', textAlign: 'center' }}>
        Chiudi conto
      </Button>
    </div>
  )
}

function CategoryGroup({ catName, catItems, orderId, onSetItemStatus, onAdvanceGroup }) {
  const [openItemId, setOpenItemId] = useState(null)

  const pendingIds = catItems.filter(i => i.status === 'pending').map(i => i.id)
  const preparingIds = catItems.filter(i => i.status === 'preparing').map(i => i.id)

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
        <div style={{ display: 'flex', gap: 6 }}>
          {pendingIds.length > 0 && (
            <button
              type="button"
              onClick={() => onAdvanceGroup(orderId, pendingIds, 'preparing')}
              style={{
                fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
                border: `1px solid ${T.yellow}`, borderRadius: T.rBtn, padding: '4px 10px', cursor: 'pointer',
                background: T.yellow, color: '#fff',
              }}
            >In lavorazione</button>
          )}
          {preparingIds.length > 0 && pendingIds.length === 0 && (
            <button
              type="button"
              onClick={() => onAdvanceGroup(orderId, preparingIds, 'ready')}
              style={{
                fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
                border: `1px solid ${T.green}`, borderRadius: T.rBtn, padding: '4px 10px', cursor: 'pointer',
                background: T.green, color: '#fff',
              }}
            >Pronti</button>
          )}
        </div>
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
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  marginTop: 6, background: T.bg, border: `1px solid ${T.border}`,
                  borderRadius: T.rSection, padding: '8px 10px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ fontFamily: T.syne, fontSize: 12, color: T.textSecondary, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.item_name}
                </span>
                {[
                  { s: 'pending', label: 'In attesa', color: T.textMuted },
                  { s: 'preparing', label: 'Lavorazione', color: T.yellow },
                  { s: 'ready', label: 'Pronto', color: T.green },
                ].map(({ s, label, color }) => {
                  const isActive = item.status === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { onSetItemStatus(orderId, item.id, s); setOpenItemId(null) }}
                      style={{
                        fontFamily: T.syne, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5,
                        border: `1px solid ${isActive ? color : T.border}`,
                        borderRadius: T.rBtn, padding: '4px 8px', cursor: 'pointer', flexShrink: 0,
                        background: isActive ? color : 'transparent',
                        color: isActive ? (s === 'pending' ? T.text : '#fff') : T.textMuted,
                      }}
                    >{label}</button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ItemRow({ item, isOpen, onRowClick }) {
  const dotColor = item.status === 'ready' ? T.green : item.status === 'preparing' ? T.yellow : T.textMuted
  return (
    <div
      onClick={onRowClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        borderRadius: T.rSection, padding: '3px 2px',
        background: isOpen ? T.surfaceAlt : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'block' }} />
      <span style={{ flex: 1, minWidth: 0, fontFamily: T.syne, fontSize: 13, color: T.text }}>
        <span style={{ fontFamily: T.mono, fontWeight: 500, color: T.primary }}>{item.quantity}×</span>{' '}
        {item.item_name}
        {item.note && (
          <span style={{ display: 'block', fontSize: 11, color: T.textSecondary, fontStyle: 'italic', marginTop: 1 }}>"{item.note}"</span>
        )}
      </span>
      <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {money(item.unit_price * item.quantity)}
      </span>
    </div>
  )
}
