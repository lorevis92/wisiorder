import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { T, STATUS_LABEL, STATUS_COLOR } from '../../lib/theme'
import { money, relTime } from '../../lib/format'
import { Button, Badge, Spinner } from '../../components/UI'
import { initAudio, beep, vibrate } from '../../lib/sound'

const hasActiveItems = (order) =>
  (order.order_items || []).some(i => i.status === 'pending' || i.status === 'preparing')

const allItemsReady = (order) => {
  const items = order.order_items || []
  return items.length > 0 && items.every(i => i.status === 'ready')
}

const tabStyle = (active) => ({
  fontFamily: T.syne, fontWeight: 700, fontSize: 13, textTransform: 'uppercase',
  letterSpacing: 0.5, padding: '8px 22px', borderRadius: T.rBtn, cursor: 'pointer',
  border: `1px solid ${active ? T.primary : T.border}`,
  background: active ? T.primary : T.surface,
  color: active ? '#fff' : T.text, transition: 'all 0.15s',
})

export default function Dashboard() {
  const { restaurant } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const [tab, setTab] = useState('cucina')
  const [addItemTarget, setAddItemTarget] = useState(null)
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

  async function deleteItem(orderId, itemId) {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    if ((order.order_items || []).length <= 1) {
      alert("Non è possibile rimuovere l'unica voce dell'ordine.")
      return
    }
    if (!confirm("Rimuovere questo piatto dall'ordine?")) return
    setOrders(prev => prev.map(o => o.id !== orderId ? o : {
      ...o, order_items: o.order_items.filter(i => i.id !== itemId),
    }))
    await supabase.from('order_items').delete().eq('id', itemId)
    load()
  }

  async function closeOrder(order) {
    const items = order.order_items || []
    const hasNonReady = items.some(i => i.status !== 'ready')
    const msg = hasNonReady
      ? `Ci sono voci non ancora pronte. Chiudere comunque il conto #${order.order_number ?? '—'} di ${order.customer_name}?`
      : `Chiudere il conto #${order.order_number ?? '—'} di ${order.customer_name}?`
    if (!confirm(msg)) return
    setOrders(prev => prev.filter(o => o.id !== order.id))
    await supabase.from('orders').update({ closed_at: new Date().toISOString() }).eq('id', order.id)
  }

  function enableSound() {
    initAudio(); beep({ freq: 660, repeat: 1 }); setSoundOn(true)
  }

  if (loading) return <Spinner label="Carico ordini…" />

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
            Ordini in corso
          </h1>
          <p style={{ fontFamily: T.syne, fontSize: 13, color: T.textSecondary, margin: '4px 0 0' }}>
            {orders.length === 0 ? 'Nessun ordine attivo.' : `${orders.length} ${orders.length === 1 ? 'ordine attivo' : 'ordini attivi'} · in tempo reale`}
          </p>
        </div>
        <Button variant={soundOn ? 'ghost' : 'primary'} onClick={() => soundOn ? setSoundOn(false) : enableSound()}>
          {soundOn ? '🔔 Suono attivo' : '🔕 Attiva suono'}
        </Button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle(tab === 'cucina')} onClick={() => setTab('cucina')}>Cucina</button>
        <button style={tabStyle(tab === 'sala')} onClick={() => setTab('sala')}>Sala</button>
      </div>

      {tab === 'cucina' && (
        <CucinaTab orders={orders} onSetItemStatus={setItemStatus} onAdvanceGroup={advanceGroup} />
      )}
      {tab === 'sala' && (
        <SalaTab
          orders={orders}
          onSetItemStatus={setItemStatus}
          onAdvanceGroup={advanceGroup}
          onDeleteItem={deleteItem}
          onClose={closeOrder}
          onAddItem={(orderId) => setAddItemTarget(orderId)}
        />
      )}

      {addItemTarget && (
        <AddItemModal
          orderId={addItemTarget}
          restaurantId={restaurant.id}
          onDone={() => { setAddItemTarget(null); load() }}
          onClose={() => setAddItemTarget(null)}
        />
      )}
    </div>
  )
}

// ─── TAB CUCINA ───────────────────────────────────────────────────────────────

function CucinaTab({ orders, onSetItemStatus, onAdvanceGroup }) {
  const active = orders.filter(hasActiveItems)

  if (active.length === 0) {
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 48, textAlign: 'center' }}>
        <p style={{ fontFamily: T.syne, fontSize: 15, color: T.textSecondary, margin: 0 }}>
          Nessun piatto in preparazione. Quando arrivano ordini compariranno qui.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
      {active.map(o => (
        <OrderCardCucina key={o.id} order={o} onSetItemStatus={onSetItemStatus} onAdvanceGroup={onAdvanceGroup} />
      ))}
    </div>
  )
}

function OrderCardCucina({ order, onSetItemStatus, onAdvanceGroup }) {
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
        <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 14, color: T.textSecondary, whiteSpace: 'nowrap' }}>
          {money(order.total)}
        </span>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rounds.map(round => {
          const roundItems = items.filter(i => (i.round ?? 1) === round)
          const { catMap, sortedCats } = groupByCategory(roundItems)
          return (
            <div key={round}>
              {round > 1 && <div style={{ marginBottom: 8 }}><Badge color={T.primary} bg={T.primaryLight}>➕ {round}° GIRO</Badge></div>}
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

// ─── TAB SALA ─────────────────────────────────────────────────────────────────

function SalaTab({ orders, onSetItemStatus, onAdvanceGroup, onDeleteItem, onClose, onAddItem }) {
  const daPagare = orders.filter(allItemsReady)
  const inCorso = orders.filter(hasActiveItems)

  if (orders.length === 0) {
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 48, textAlign: 'center' }}>
        <p style={{ fontFamily: T.syne, fontSize: 15, color: T.textSecondary, margin: 0 }}>
          Nessun ordine aperto al momento.
        </p>
      </div>
    )
  }

  return (
    <div>
      {daPagare.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionDivider label="Da pagare" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, alignItems: 'start' }}>
            {daPagare.map(o => (
              <OrderCardSala
                key={o.id} order={o} isPronti
                onSetItemStatus={onSetItemStatus}
                onAdvanceGroup={onAdvanceGroup}
                onDeleteItem={onDeleteItem}
                onClose={onClose}
                onAddItem={onAddItem}
              />
            ))}
          </div>
        </div>
      )}

      {inCorso.length > 0 && (
        <div>
          <SectionDivider label="In corso" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, alignItems: 'start' }}>
            {inCorso.map(o => (
              <OrderCardSala
                key={o.id} order={o} isPronti={false}
                onSetItemStatus={onSetItemStatus}
                onAdvanceGroup={onAdvanceGroup}
                onDeleteItem={onDeleteItem}
                onClose={onClose}
                onAddItem={onAddItem}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function OrderCardSala({ order, isPronti, onSetItemStatus, onAdvanceGroup, onDeleteItem, onClose, onAddItem }) {
  const items = order.order_items || []
  const rounds = [...new Set(items.map(i => i.round ?? 1))].sort((a, b) => a - b)
  const borderColor = isPronti ? T.green : T.border

  return (
    <div style={{
      background: T.bg, border: `1px solid ${borderColor}`,
      borderRadius: T.rCard, padding: 18,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 20, color: T.text }}>#{order.order_number ?? '—'}</span>
            <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 15, color: T.text }}>{order.customer_name}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            {order.table_number && <Badge color={T.textSecondary}>Tavolo {order.table_number}</Badge>}
            <span style={{ fontFamily: T.syne, fontSize: 12, color: T.textMuted }}>{relTime(order.created_at)}</span>
          </div>
        </div>
        <span style={{
          fontFamily: T.mono, fontWeight: isPronti ? 700 : 500,
          fontSize: isPronti ? 22 : 15,
          color: isPronti ? T.green : T.textSecondary,
          whiteSpace: 'nowrap',
        }}>
          {money(order.total)}
        </span>
      </div>

      {/* Voci per round e categoria, con dot popover e cestino */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rounds.map(round => {
          const roundItems = items.filter(i => (i.round ?? 1) === round)
          const { catMap, sortedCats } = groupByCategory(roundItems)
          return (
            <div key={round}>
              {round > 1 && <div style={{ marginBottom: 8 }}><Badge color={T.primary} bg={T.primaryLight}>➕ {round}° GIRO</Badge></div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedCats.map(cat => (
                  <CategoryGroup
                    key={`${round}-${cat}`}
                    catName={cat}
                    catItems={catMap[cat]}
                    orderId={order.id}
                    onSetItemStatus={onSetItemStatus}
                    onAdvanceGroup={onAdvanceGroup}
                    onDeleteItem={onDeleteItem}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer azioni */}
      <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        <Button variant="ghost" onClick={() => onAddItem(order.id)} style={{ fontSize: 12, padding: '7px 12px', whiteSpace: 'nowrap' }}>
          + Aggiungi voce
        </Button>
        <Button variant="danger" onClick={() => onClose(order)} style={{ flex: 1, textAlign: 'center' }}>
          Chiudi conto
        </Button>
      </div>
    </div>
  )
}

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  )
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function groupByCategory(items) {
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

function CategoryGroup({ catName, catItems, orderId, onSetItemStatus, onAdvanceGroup, onDeleteItem }) {
  const [openItemId, setOpenItemId] = useState(null)
  const hasPending = catItems.some(i => i.status === 'pending')
  const hasPreparing = catItems.some(i => i.status === 'preparing')
  const allReady = catItems.every(i => i.status === 'ready')

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
        {!allReady && hasPending && (
          <Button variant="ghost"
            onClick={() => onAdvanceGroup(orderId, catItems.filter(i => i.status === 'pending').map(i => i.id), 'preparing')}
            style={{ padding: '4px 10px', fontSize: 11 }}>
            In preparazione
          </Button>
        )}
        {!allReady && !hasPending && hasPreparing && (
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
              onDelete={onDeleteItem ? (e) => { e.stopPropagation(); onDeleteItem(orderId, item.id) } : null}
            />
            {openItemId === item.id && (
              <div onClick={e => e.stopPropagation()} style={{
                marginTop: 6, background: T.bg, border: `1px solid ${T.border}`,
                borderRadius: T.rSection, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
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

function ItemRow({ item, isOpen, onRowClick, onDelete }) {
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
        {item.note && <span style={{ display: 'block', fontSize: 11, color: T.textSecondary, fontStyle: 'italic', marginTop: 1 }}>"{item.note}"</span>}
      </span>
      <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {money(item.unit_price * item.quantity)}
      </span>
      {onDelete && (
        <button onClick={onDelete} title="Rimuovi voce" style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
          fontSize: 14, color: T.textMuted, flexShrink: 0, lineHeight: 1,
          borderRadius: T.rBtn, transition: 'color 0.12s',
        }}>🗑</button>
      )}
    </div>
  )
}

// ─── MODAL AGGIUNGI VOCE ──────────────────────────────────────────────────────

function AddItemModal({ orderId, restaurantId, onDone, onClose }) {
  const [menuItems, setMenuItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('menu_items')
        .select('id, name, price, sort_order')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('sort_order')
      setMenuItems(data || [])
      setLoadingItems(false)
    })()
  }, [restaurantId])

  async function confirmAdd() {
    if (!selected) return
    setBusy(true)
    await supabase.rpc('add_to_order', { p_order_id: orderId, p_items: [{ menu_item_id: selected.id, quantity: qty }] })
    setBusy(false)
    onDone()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg, borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 680, maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 18, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Aggiungi voce</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.syne, fontSize: 18, color: T.textMuted, padding: 4, lineHeight: 1 }}>✕</button>
          </div>

          {loadingItems ? <Spinner label="Carico piatti…" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {menuItems.map(item => (
                <button key={item.id} onClick={() => { setSelected(item); setQty(1) }} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '10px 12px', textAlign: 'left', width: '100%',
                  background: selected?.id === item.id ? T.primaryLight : T.surface,
                  border: `1px solid ${selected?.id === item.id ? T.primaryBorder : T.border}`,
                  borderRadius: T.rSection, cursor: 'pointer',
                }}>
                  <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 14, color: T.text }}>{item.name}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 13, color: T.textSecondary, whiteSpace: 'nowrap' }}>{money(item.price)}</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 14, color: T.text }}>{selected.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${T.border}`, borderRadius: T.rBtn }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, border: 'none', background: T.surface, cursor: 'pointer', fontSize: 16, color: T.text, fontFamily: T.syne }}>−</button>
                  <span style={{ fontFamily: T.mono, fontSize: 14, minWidth: 28, textAlign: 'center' }}>{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} style={{ width: 32, height: 32, border: 'none', background: T.surface, cursor: 'pointer', fontSize: 16, color: T.text, fontFamily: T.syne }}>+</button>
                </div>
                <Button variant="primary" onClick={confirmAdd} style={{ opacity: busy ? 0.6 : 1, padding: '9px 16px' }}>
                  {busy ? '…' : 'Aggiungi'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
