import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { T } from '../../lib/theme'
import { money, relTime } from '../../lib/format'
import { Button, Badge, Spinner } from '../../components/UI'
import { initAudio, beep, vibrate } from '../../lib/sound'
import { useI18n } from '../../lib/i18n'

const isReady = (i) => i.status === 'ready'
const norm = (s) => s === 'queued' ? 'pending' : (s || 'pending')
const isPending = (i) => norm(i.status) === 'pending'
const isItemPreparing = (i) => norm(i.status) === 'preparing'

const sortItems = (arr) => [...(arr || [])].sort((a, b) => {
  const ca = a.created_at || '', cb = b.created_at || ''
  if (ca !== cb) return ca < cb ? -1 : 1
  return a.id < b.id ? -1 : 1
})

const nextStatus = { pending: 'preparing', preparing: 'ready' }

const isToAccept = (o) => o.confirmation_status === 'pending_confirmation'
const isReadyOrder = (o) =>
  o.confirmation_status === 'confirmed' &&
  (o.order_items || []).length > 0 &&
  (o.order_items || []).every(i => i.status === 'ready')
const isPreparingOrder = (o) => o.confirmation_status === 'confirmed' && !isReadyOrder(o)

function sortCatKeys(keys, catOrder) {
  return [...keys].sort((a, b) => {
    if (a === 'Altro') return 1
    if (b === 'Altro') return -1
    const ai = (catOrder || {})[a] ?? Infinity
    const bi = (catOrder || {})[b] ?? Infinity
    if (ai !== bi) return ai - bi
    return a.localeCompare(b)
  })
}

export default function Dashboard() {
  const { restaurant } = useAuth()
  const { t } = useI18n()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const [filter, setFilter] = useState('preparing')
  const soundRef = useRef(true)
  soundRef.current = soundOn
  const catOrderRef = useRef(null)

  const load = useCallback(async () => {
    if (catOrderRef.current === null) {
      const { data: catRows } = await supabase
        .from('menu_categories').select('name, sort_order')
        .eq('restaurant_id', restaurant.id).order('sort_order')
      const catMap = {}
      ;(catRows || []).forEach((c, i) => { catMap[c.name] = i })
      catOrderRef.current = catMap
    }
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
    const timer = setInterval(() => setOrders(o => [...o]), 30000)
    return () => clearInterval(timer)
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

  async function advanceItem(orderId, item) {
    const cur = norm(item.status)
    const ns = nextStatus[cur]
    if (!ns) return
    patchItem(orderId, item.id, ns)
    await supabase.from('order_items').update({ status: ns }).eq('id', item.id)
  }

  async function setItemStatus(orderId, itemId, status) {
    patchItem(orderId, itemId, status)
    await supabase.from('order_items').update({ status }).eq('id', itemId)
  }

  async function advanceGroupAll(orderId, groupItems, groupState) {
    const next = groupState === 'pending' ? 'preparing' : groupState === 'preparing' ? 'ready' : null
    if (!next) return
    const ids = groupItems.map(i => i.id)
    patchItems(orderId, ids, next)
    await supabase.from('order_items').update({ status: next }).in('id', ids)
  }

  async function confirmOrder(order) {
    const remaining = orders.filter(o => o.id !== order.id && o.confirmation_status === 'pending_confirmation')
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, confirmation_status: 'confirmed' } : o))
    await supabase.from('orders').update({ confirmation_status: 'confirmed' }).eq('id', order.id)
    if (remaining.length === 0) setFilter('preparing')
  }

  async function rejectOrder(order) {
    if (!confirm(`${t('dashboard.rejectConfirm')} #${order.order_number ?? '—'} (${order.customer_name})?`)) return
    setOrders(prev => prev.filter(o => o.id !== order.id))
    await supabase.from('orders').update({ confirmation_status: 'rejected', closed_at: new Date().toISOString() }).eq('id', order.id)
  }

  async function closeOrder(order) {
    const notReady = (order.order_items || []).some(i => !isReady(i))
    if (notReady && !confirm(t('dashboard.closeUnreadyConfirm'))) return
    setOrders(prev => prev.filter(o => o.id !== order.id))
    await supabase.from('orders').update({ closed_at: new Date().toISOString() }).eq('id', order.id)
  }

  async function deleteItem(orderId, item) {
    const order = orders.find(o => o.id === orderId)
    const count = (order?.order_items || []).length
    if (count <= 1) { alert(t('dashboard.cantDeleteLast')); return }
    if (!confirm(t('dashboard.deleteItemConfirm', { name: item.item_name }))) return
    setOrders(prev => prev.map(o => o.id !== orderId ? o : { ...o, order_items: o.order_items.filter(i => i.id !== item.id) }))
    await supabase.from('order_items').delete().eq('id', item.id)
    load()
  }

  function enableSound() {
    initAudio(); beep({ freq: 660, repeat: 1 }); setSoundOn(true)
  }

  if (loading) return <Spinner />

  const toAcceptCount = orders.filter(isToAccept).length
  const preparingCount = orders.filter(isPreparingOrder).length
  const readyCount = orders.filter(isReadyOrder).length

  const visible = orders.filter(
    filter === 'toAccept' ? isToAccept : filter === 'ready' ? isReadyOrder : isPreparingOrder
  )

  const filterTabs = [
    { key: 'toAccept',  label: t('dashboard.toConfirm'),      count: toAcceptCount },
    { key: 'preparing', label: t('dashboard.preparingOrders'), count: preparingCount },
    { key: 'ready',     label: t('dashboard.readyOrders'),     count: readyCount },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
          {t('dashboard.ordersInProgress')}
        </h1>
        <Button variant={soundOn ? 'ghost' : 'primary'} onClick={() => soundOn ? setSoundOn(false) : enableSound()}>
          {soundOn ? `🔔 ${t('dashboard.soundOn')}` : `🔕 ${t('dashboard.soundOff')}`}
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {filterTabs.map(f => {
          const active = filter === f.key
          const alert = f.key === 'toAccept' && f.count > 0 && !active
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: active ? T.primary : T.surface,
                color: active ? '#fff' : T.textSecondary,
                border: `1px solid ${active ? T.primary : alert ? T.primary : T.border}`,
                borderRadius: 99, padding: '7px 14px', cursor: 'pointer',
                fontFamily: T.syne, fontWeight: 700, fontSize: 12,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}
            >
              {alert && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.primary, flexShrink: 0 }} />}
              {f.label} · {f.count}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 48, textAlign: 'center' }}>
          <p style={{ fontFamily: T.syne, fontSize: 15, color: T.textSecondary, margin: 0 }}>
            {filter === 'toAccept'
              ? t('dashboard.noToAccept')
              : filter === 'ready'
                ? t('dashboard.noReady')
                : t('dashboard.noPreparing')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
          {filter === 'toAccept'
            ? visible.map(o => (
                <ConfirmCard key={o.id} order={o} catOrder={catOrderRef.current} onConfirm={confirmOrder} onReject={rejectOrder} />
              ))
            : visible.map(o => (
                <OrderCard
                  key={o.id}
                  order={o}
                  catOrder={catOrderRef.current}
                  onAdvanceItem={advanceItem}
                  onSetItemStatus={setItemStatus}
                  onAdvanceGroup={advanceGroupAll}
                  onClose={closeOrder}
                  onDeleteItem={deleteItem}
                />
              ))
          }
        </div>
      )}
    </div>
  )
}

function ConfirmCard({ order, catOrder, onConfirm, onReject }) {
  const { t } = useI18n()
  const items = sortItems(order.order_items || [])
  const catMap = {}
  const catList = []
  for (const item of items) {
    const cat = item.category_name || 'Altro'
    if (!catMap[cat]) { catMap[cat] = []; catList.push(cat) }
    catMap[cat].push(item)
  }
  const sortedCats = sortCatKeys(catList, catOrder)

  return (
    <div style={{
      background: T.bg, border: `1px solid ${T.primaryBorder}`,
      borderRadius: T.rCard, padding: 18,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 20, color: T.text }}>#{order.order_number ?? '—'}</span>
            <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 15, color: T.text }}>{order.customer_name}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            {order.table_number && <Badge color={T.textSecondary}>{t('dashboard.table')} {order.table_number}</Badge>}
            <span style={{ fontFamily: T.syne, fontSize: 12, color: T.textMuted }}>{relTime(order.created_at)}</span>
          </div>
          {!order.table_number && (
            <p style={{ fontFamily: T.syne, fontSize: 11, color: T.textSecondary, margin: '5px 0 0' }}>
              {t('dashboard.pickupAtCounter')}
            </p>
          )}
        </div>
        <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: 15, color: T.text, whiteSpace: 'nowrap' }}>
          {money(order.total)}
        </span>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sortedCats.map(cat => (
          <div key={cat} style={{ background: T.surface, borderRadius: T.rSection, padding: '8px 12px' }}>
            <div style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, marginBottom: 5 }}>
              {cat}
            </div>
            {catMap[cat].map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                <span style={{ flex: 1, fontFamily: T.syne, fontSize: 13, color: T.text }}>
                  <span style={{ fontFamily: T.mono, fontWeight: 500, color: T.primary }}>{item.quantity}×</span>{' '}
                  {item.item_name}
                  {item.note && <span style={{ fontSize: 11, color: T.textSecondary, fontStyle: 'italic' }}> — "{item.note}"</span>}
                </span>
                <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, whiteSpace: 'nowrap' }}>
                  {money(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        <Button variant="primary" onClick={() => onConfirm(order)} style={{ flex: 1 }}>
          {t('dashboard.accept')}
        </Button>
        <button
          type="button"
          onClick={() => onReject(order)}
          style={{
            flex: 1, background: 'transparent', border: `1px solid ${T.primaryBorder}`, color: T.primary,
            fontFamily: T.syne, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5,
            borderRadius: T.rBtn, cursor: 'pointer', padding: '9px 12px',
          }}
        >
          {t('dashboard.reject')}
        </button>
      </div>
    </div>
  )
}

function OrderCard({ order, catOrder, onAdvanceItem, onSetItemStatus, onAdvanceGroup, onClose, onDeleteItem }) {
  const { t } = useI18n()
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
            {order.table_number && <Badge color={T.textSecondary}>{t('dashboard.table')} {order.table_number}</Badge>}
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
          const catList = []
          for (const item of roundItems) {
            const cat = item.category_name || 'Altro'
            if (!catMap[cat]) { catMap[cat] = []; catList.push(cat) }
            catMap[cat].push(item)
          }
          const sortedCats = sortCatKeys(catList, catOrder)
          return (
            <div key={round}>
              {round > 1 && (
                <div style={{ marginBottom: 8 }}>
                  <Badge color={T.primary} bg={T.primaryLight}>➕ {round}° {t('dashboard.round')}</Badge>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedCats.map(cat => (
                  <CategoryGroup
                    key={`${round}-${cat}`}
                    catName={cat}
                    catItems={catMap[cat]}
                    orderId={order.id}
                    onAdvanceItem={onAdvanceItem}
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

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        <Button variant="danger" onClick={() => onClose(order)} style={{ width: '100%', textAlign: 'center' }}>
          {t('dashboard.closeBill')}
        </Button>
      </div>
    </div>
  )
}

function CategoryGroup({ catName, catItems, orderId, onAdvanceItem, onSetItemStatus, onAdvanceGroup, onDeleteItem }) {
  const { t } = useI18n()
  const [openMenuId, setOpenMenuId] = useState(null)

  const groupState = catItems.every(i => norm(i.status) === 'ready') ? 'ready'
    : catItems.some(i => norm(i.status) === 'preparing') ? 'preparing'
    : catItems.every(i => norm(i.status) === 'pending') ? 'pending'
    : 'preparing'

  const groupBtnStyle = groupState === 'ready'
    ? { background: T.green, border: `1px solid ${T.green}`, color: '#fff' }
    : groupState === 'preparing'
      ? { background: T.yellow, border: `1px solid ${T.yellow}`, color: '#fff' }
      : { background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary }

  useEffect(() => {
    if (!openMenuId) return
    function handleClick(e) {
      if (!e.target.closest(`[data-item-menu="${openMenuId}"]`)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenuId])

  return (
    <div style={{ background: T.surface, borderRadius: T.rSection, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary }}>
          {catName}
        </span>
        <button
          type="button"
          disabled={groupState === 'ready'}
          onClick={() => onAdvanceGroup(orderId, catItems, groupState)}
          style={{
            ...groupBtnStyle,
            fontFamily: T.syne, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5,
            padding: '5px 10px', borderRadius: T.rBtn,
            cursor: groupState === 'ready' ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t('status.' + groupState)}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {catItems.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            onAdvance={() => onAdvanceItem(orderId, item)}
            onSetStatus={(status) => onSetItemStatus(orderId, item.id, status)}
            onDelete={() => onDeleteItem(orderId, item)}
            isMenuOpen={openMenuId === item.id}
            onOpenMenu={() => setOpenMenuId(item.id)}
            onCloseMenu={() => setOpenMenuId(null)}
          />
        ))}
      </div>
    </div>
  )
}

function ItemRow({ item, onAdvance, onSetStatus, onDelete, isMenuOpen, onOpenMenu, onCloseMenu }) {
  const { t } = useI18n()
  const statusKey = norm(item.status)
  const isAtEnd = statusKey === 'ready'

  const btnStyle = statusKey === 'ready'
    ? { background: T.green, border: `1px solid ${T.green}`, color: '#fff' }
    : statusKey === 'preparing'
      ? { background: T.yellow, border: `1px solid ${T.yellow}`, color: '#fff' }
      : { background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary }

  const menuOptions = [
    { key: 'pending', label: t('status.pending') },
    { key: 'preparing', label: t('status.preparing') },
    { key: 'ready', label: t('status.ready') },
  ]

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
        onClick={isAtEnd ? undefined : onAdvance}
        style={{
          ...btnStyle,
          fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
          borderRadius: T.rBtn, padding: '6px 12px', flexShrink: 0, whiteSpace: 'nowrap',
          cursor: isAtEnd ? 'default' : 'pointer',
        }}
      >
        {t('status.' + statusKey)}
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Delete"
        style={{
          background: 'transparent', border: `1px solid ${T.primaryBorder}`, color: T.primary,
          borderRadius: T.rBtn, padding: '5px 7px', cursor: 'pointer', fontSize: 12,
          flexShrink: 0, lineHeight: 1, display: 'flex', alignItems: 'center',
        }}
      >
        🗑
      </button>
      <div style={{ position: 'relative', flexShrink: 0 }} data-item-menu={item.id}>
        <span
          onClick={isMenuOpen ? onCloseMenu : onOpenMenu}
          style={{ fontSize: 18, padding: 4, cursor: 'pointer', color: T.textSecondary, userSelect: 'none', display: 'block', lineHeight: 1 }}
        >
          ⋮
        </span>
        {isMenuOpen && (
          <div style={{
            position: 'absolute', right: 0, top: '100%', zIndex: 100,
            background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard,
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 160, overflow: 'hidden',
          }}>
            {menuOptions.map(opt => (
              <div
                key={opt.key}
                onClick={() => { onSetStatus(opt.key); onCloseMenu() }}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  fontFamily: T.syne, fontSize: 13,
                  background: statusKey === opt.key ? T.surfaceAlt : 'transparent',
                  color: statusKey === opt.key ? T.text : T.textSecondary,
                  fontWeight: statusKey === opt.key ? 700 : 400,
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
