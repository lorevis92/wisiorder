import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { T } from '../../lib/theme'
import { money } from '../../lib/format'
import { Spinner } from '../../components/UI'
import { initAudio, beep, vibrate } from '../../lib/sound'

function groupByCategory(items) {
  const map = {}
  const order = []
  for (const item of items) {
    const cat = item.category_name || 'Altro'
    if (!map[cat]) { map[cat] = []; order.push(cat) }
    map[cat].push(item)
  }
  const result = {}
  for (const cat of order.filter(c => c !== 'Altro')) result[cat] = map[cat]
  if (map['Altro']) result['Altro'] = map['Altro']
  return result
}

export default function OrderStatus() {
  const { orderId } = useParams()
  const nav = useNavigate()
  const [order, setOrder] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const initialLoadDone = useRef(false)
  const prevItemStatus = useRef({})

  useEffect(() => {
    function unlock() { initAudio(); document.removeEventListener('click', unlock); document.removeEventListener('touchstart', unlock) }
    document.addEventListener('click', unlock)
    document.addEventListener('touchstart', unlock)
    return () => { document.removeEventListener('click', unlock); document.removeEventListener('touchstart', unlock) }
  }, [])

  async function fetchOrder() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), restaurants(name, logo_url, primary_color, slug)')
      .eq('id', orderId)
      .maybeSingle()
    if (!data) { setNotFound(true); setLoading(false); return }

    const items = data.order_items || []

    if (!initialLoadDone.current) {
      const map = {}
      items.forEach(i => { map[i.id] = i.status })
      prevItemStatus.current = map
      initialLoadDone.current = true
    } else {
      const justReady = items.some(i => i.status === 'ready' && prevItemStatus.current[i.id] !== 'ready')
      if (justReady) { beep({ freq: 660, repeat: 2 }); vibrate([200, 100, 200]) }
      const map = {}
      items.forEach(i => { map[i.id] = i.status })
      prevItemStatus.current = map
    }

    setRestaurant(data.restaurants)
    setOrder(data)
    setLoading(false)
  }

  useEffect(() => { fetchOrder() }, [orderId])

  useEffect(() => {
    const chOrder = supabase
      .channel(`order-status-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => fetchOrder())
      .subscribe()

    const chItems = supabase
      .channel(`order-items-status-${orderId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` },
        () => fetchOrder())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` },
        () => fetchOrder())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` },
        () => fetchOrder())
      .subscribe()

    return () => { supabase.removeChannel(chOrder); supabase.removeChannel(chItems) }
  }, [orderId])

  if (loading) return <Spinner />
  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: T.surface }}>
      <p style={{ fontFamily: T.syne, fontSize: 15, color: T.textSecondary }}>Ordine non trovato.</p>
    </div>
  )

  const accent = restaurant?.primary_color || T.primary
  const items = order.order_items || []
  const catGroups = groupByCategory(items)
  const allItemsReady = items.length > 0 && items.every(i => i.status === 'ready')
  const isClosed = !!order.closed_at
  const rounds = [...new Set(items.map(i => i.round ?? 1))].sort((a, b) => a - b)

  const anyReady = items.some(i => i.status === 'ready')
  const anyPreparing = items.some(i => i.status === 'preparing')
  const bigStatus = isClosed
    ? { text: 'Buon appetito!', sub: 'Il tuo ordine è stato completato.', green: true }
    : allItemsReady
      ? { text: 'Tutto pronto! 🎉', sub: 'Puoi ritirare il tuo ordine.', green: true }
      : anyReady
        ? { text: 'Alcuni piatti sono pronti!', sub: 'Controlla qui sotto quali portate sono pronte.', green: false }
        : anyPreparing
          ? { text: 'In preparazione…', sub: 'Tieni aperta questa pagina, ti avvisiamo quando è pronto.', green: false }
          : { text: 'Ordine ricevuto', sub: 'Lo abbiamo ricevuto, iniziamo a prepararlo a breve.', green: false }

  return (
    <div style={{ minHeight: '100vh', background: T.surface }}>
      <header style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        {restaurant?.logo_url
          ? <img src={restaurant.logo_url} alt="" style={{ height: 36, maxWidth: 110, objectFit: 'contain' }} />
          : <div style={{ width: 36, height: 36, borderRadius: T.rSection, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.syne, fontWeight: 800 }}>{restaurant?.name?.[0]}</div>}
        <span style={{ fontFamily: T.georgia, fontWeight: 700, fontSize: 18, color: T.text }}>{restaurant?.name}</span>
      </header>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: 20 }}>
        <div style={{ background: T.bg, border: `1px solid ${bigStatus.green ? T.green : T.border}`, borderRadius: T.rCard, padding: 28, textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontFamily: T.mono, fontSize: 14, color: T.textMuted }}>Ordine #{order.order_number ?? '—'}</span>
          <h1 style={{ fontFamily: T.georgia, fontWeight: 700, fontSize: 28, margin: '8px 0 6px', color: bigStatus.green ? T.green : T.text }}>
            {bigStatus.text}
          </h1>
          <p style={{ fontFamily: T.syne, fontSize: 14, color: T.textSecondary, margin: 0 }}>{bigStatus.sub}</p>
        </div>

        {Object.keys(catGroups).length > 0 && (
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 20, marginBottom: 16 }}>
            <h2 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, margin: '0 0 12px' }}>
              Stato portate
            </h2>
            {Object.entries(catGroups).map(([cat, catItems], catIdx, catArr) => {
              const sortedItems = [...catItems].sort((a, b) => {
                const ca = a.created_at || '', cb = b.created_at || ''
                if (ca !== cb) return ca < cb ? -1 : 1
                return a.id < b.id ? -1 : 1
              })
              const isLastCat = catIdx === catArr.length - 1
              return (
                <div key={cat} style={{ paddingBottom: isLastCat ? 0 : 12, marginBottom: isLastCat ? 0 : 12, borderBottom: isLastCat ? 'none' : `1px solid ${T.border}` }}>
                  <div style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, marginBottom: 6 }}>
                    {cat}
                  </div>
                  {sortedItems.map((item, itemIdx) => {
                    const sk = item.status === 'queued' ? 'pending' : (item.status || 'pending')
                    const dotColor = sk === 'ready' ? T.green : sk === 'preparing' ? T.yellow : T.textMuted
                    const label = sk === 'ready' ? 'Pronto' : sk === 'preparing' ? 'In preparazione' : 'In attesa'
                    const isLastItem = itemIdx === sortedItems.length - 1
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: isLastItem ? 'none' : `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                          <span style={{ fontFamily: T.syne, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.item_name}
                          </span>
                        </div>
                        <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: dotColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, margin: '0 0 14px' }}>
            {order.customer_name}{order.table_number ? ` · Tavolo ${order.table_number}` : ''}
          </h2>
          {rounds.map(round => (
            <div key={round}>
              {round > 1 && (
                <div style={{ margin: '10px 0 8px' }}>
                  <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: accent, border: `1px solid ${accent}`, borderRadius: T.rBtn, padding: '3px 8px', display: 'inline-block' }}>
                    ➕ {round}° GIRO
                  </span>
                </div>
              )}
              {items.filter(i => (i.round ?? 1) === round).map(it => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: T.syne, fontSize: 14, color: T.text }}>
                    <span style={{ fontFamily: T.mono, color: accent }}>{it.quantity}×</span> {it.item_name}
                  </span>
                  <span style={{ fontFamily: T.mono, fontSize: 13, color: T.textSecondary }}>{money(it.unit_price * it.quantity)}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${T.border}`, paddingTop: 12, marginTop: 8 }}>
            <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: T.textSecondary }}>Totale</span>
            <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 500, color: T.text }}>{money(order.total)}</span>
          </div>
        </div>

        {!isClosed && restaurant?.slug && (
          <button
            onClick={() => nav(`/r/${restaurant.slug}?addTo=${orderId}`)}
            style={{
              width: '100%', background: T.bg, border: `1px solid ${T.border}`,
              borderRadius: T.rCard, padding: '14px 20px', cursor: 'pointer',
              fontFamily: T.syne, fontWeight: 700, fontSize: 14, color: T.text,
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>+</span> Aggiungi al mio ordine
          </button>
        )}

        <p style={{ textAlign: 'center', fontFamily: T.syne, fontSize: 11, color: T.textMuted, marginTop: 4 }}>Powered by WisiOrder</p>
      </div>
    </div>
  )
}
