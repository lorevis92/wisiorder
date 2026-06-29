import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { T } from '../../lib/theme'
import { money } from '../../lib/format'
import { Button, Badge, Field, inputStyle, Spinner } from '../../components/UI'
import { useI18n } from '../../lib/i18n'

const BUCKET = 'menu-photos'

export default function MenuSetup() {
  const { restaurant } = useAuth()
  const { t } = useI18n()
  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newCat, setNewCat] = useState('')
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    const [{ data: c }, { data: i }] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order'),
      supabase.from('menu_items').select('*').eq('restaurant_id', restaurant.id).order('sort_order'),
    ])
    setCats(c || [])
    setItems(i || [])
    setLoading(false)
  }, [restaurant.id])

  useEffect(() => { load() }, [load])

  async function addCategory(e) {
    e.preventDefault()
    if (!newCat.trim()) return
    await supabase.from('menu_categories').insert({
      restaurant_id: restaurant.id, name: newCat.trim(), sort_order: cats.length,
    })
    setNewCat('')
    load()
  }

  async function deleteCategory(cat) {
    if (!confirm(`${t('menuSetup.deleteCategoryConfirm')}: "${cat.name}"?`)) return
    await supabase.from('menu_items').delete().eq('category_id', cat.id)
    await supabase.from('menu_categories').delete().eq('id', cat.id)
    load()
  }

  async function toggleAvail(item) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i))
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
  }

  async function deleteItem(item) {
    if (!confirm(`${t('menuSetup.deleteDishConfirm')}: "${item.name}"?`)) return
    await supabase.from('menu_items').delete().eq('id', item.id)
    load()
  }

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 4px' }}>
        {t('menuSetup.yourMenu')}
      </h1>
      <p style={{ fontFamily: T.syne, fontSize: 13, color: T.textSecondary, margin: '0 0 24px' }}>
        {t('menuSetup.menuIntro')}
      </p>

      <form onSubmit={addCategory} style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <input style={{ ...inputStyle, flex: 1 }} value={newCat} onChange={e => setNewCat(e.target.value)}
          placeholder={t('menuSetup.newCategory')} />
        <Button type="submit">{t('common.add')}</Button>
      </form>

      {cats.length === 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 40, textAlign: 'center' }}>
          <p style={{ fontFamily: T.syne, fontSize: 14, color: T.textSecondary, margin: 0 }}>
            {t('menuSetup.noCategories')}
          </p>
        </div>
      )}

      {cats.map(cat => {
        const its = items.filter(i => i.category_id === cat.id)
        return (
          <section key={cat.id} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${T.border}`, paddingTop: 12, marginBottom: 12 }}>
              <h2 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textSecondary, margin: 0 }}>
                {cat.name} <span style={{ color: T.textMuted }}>· {its.length}</span>
              </h2>
              <button onClick={() => deleteCategory(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.syne, fontSize: 11, color: T.textMuted, textTransform: 'uppercase' }}>
                {t('common.delete')}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {its.map(item => (
                <ItemRow key={item.id} item={item} onToggle={toggleAvail} onEdit={() => setEditing(item)} onDelete={deleteItem} />
              ))}
            </div>

            <button onClick={() => setEditing({ new: true, category_id: cat.id })} style={{
              marginTop: 10, width: '100%', background: T.primaryLight, border: `1px dashed ${T.primaryBorder}`,
              borderRadius: T.rSection, padding: '12px', cursor: 'pointer', fontFamily: T.syne, fontWeight: 700,
              fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: T.primary,
            }}>{t('menuSetup.addDish')}</button>
          </section>
        )
      })}

      {editing && (
        <ItemEditor restaurant={restaurant} item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
    </div>
  )
}

function ItemRow({ item, onToggle, onEdit, onDelete }) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.rCard, padding: 12, opacity: item.is_available ? 1 : 0.6 }}>
      <div style={{ width: 52, height: 52, borderRadius: T.rSection, background: T.surfaceAlt, flexShrink: 0, overflow: 'hidden' }}>
        {item.photo_url && <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 14, color: T.text }}>{item.name}</span>
          {!item.is_available && <Badge color={T.yellow}>{t('menuSetup.soldOut')}</Badge>}
        </div>
        {item.description && <p style={{ fontFamily: T.syne, fontSize: 12, color: T.textSecondary, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</p>}
      </div>
      <span style={{ fontFamily: T.mono, fontSize: 14, color: T.text, whiteSpace: 'nowrap' }}>{money(item.price)}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onToggle(item)}
          style={{ border: `1px solid ${T.border}`, borderRadius: T.rBtn, background: T.surface, cursor: 'pointer', padding: '6px 8px', fontSize: 13 }}>
          {item.is_available ? '✓' : '↺'}
        </button>
        <button onClick={() => onEdit(item)} style={{ border: `1px solid ${T.border}`, borderRadius: T.rBtn, background: T.surface, cursor: 'pointer', padding: '6px 8px', fontSize: 13 }}>✎</button>
        <button onClick={() => onDelete(item)} style={{ border: `1px solid ${T.primaryBorder}`, borderRadius: T.rBtn, background: 'transparent', color: T.primary, cursor: 'pointer', padding: '6px 8px', fontSize: 13 }}>🗑</button>
      </div>
    </div>
  )
}

function ItemEditor({ restaurant, item, onClose, onSaved }) {
  const { t } = useI18n()
  const isNew = item.new
  const [name, setName] = useState(item.name || '')
  const [description, setDescription] = useState(item.description || '')
  const [price, setPrice] = useState(item.price != null ? String(item.price) : '')
  const [photoUrl, setPhotoUrl] = useState(item.photo_url || '')
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function upload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    const ext = file.name.split('.').pop()
    const path = `${restaurant.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
    if (error) { setError('Upload foto fallito: ' + error.message); setUploading(false); return }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    setPhotoUrl(data.publicUrl)
    setUploading(false)
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    const p = parseFloat(price.replace(',', '.'))
    if (!name.trim()) { setError(t('menuSetup.enterName')); return }
    if (isNaN(p) || p < 0) { setError(t('menuSetup.enterPrice')); return }
    setBusy(true)
    const payload = { name: name.trim(), description: description.trim() || null, price: p, photo_url: photoUrl || null }
    let err
    if (isNew) {
      const { error } = await supabase.from('menu_items').insert({
        ...payload, restaurant_id: restaurant.id, category_id: item.category_id, is_available: true, sort_order: 0,
      })
      err = error
    } else {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', item.id)
      err = error
    }
    setBusy(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg, borderRadius: T.rCard, border: `1px solid ${T.border}`, padding: 24, width: '100%', maxWidth: 460, maxHeight: '90vh', overflow: 'auto' }}>
        <h2 style={{ fontFamily: T.syne, fontWeight: 800, fontSize: 18, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 18px' }}>
          {isNew ? t('menuSetup.newDish') : t('menuSetup.editDish')}
        </h2>
        <form onSubmit={save}>
          <Field label={t('menuSetup.dishName')}>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Pad Thai" />
          </Field>
          <Field label={t('common.description')}>
            <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Noodles di riso saltati, gamberi, arachidi, lime" />
          </Field>
          <Field label={t('common.price')}>
            <input style={inputStyle} value={price} onChange={e => setPrice(e.target.value)} placeholder="14.50" inputMode="decimal" />
          </Field>
          <Field label={t('common.photo')}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: T.rSection, background: T.surfaceAlt, overflow: 'hidden', flexShrink: 0 }}>
                {photoUrl && <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <label style={{ flex: 1 }}>
                <span style={{ display: 'inline-block', fontFamily: T.syne, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: T.text, border: `1px solid ${T.border}`, borderRadius: T.rBtn, padding: '9px 14px', cursor: 'pointer', background: T.surface }}>
                  {uploading ? t('common.loading') : (photoUrl ? t('menuSetup.changePhoto') : t('menuSetup.uploadPhoto'))}
                </span>
                <input type="file" accept="image/*" onChange={upload} style={{ display: 'none' }} />
              </label>
            </div>
          </Field>

          {error && <p style={{ fontFamily: T.syne, fontSize: 13, color: T.primary }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button type="submit" disabled={busy || uploading} style={{ flex: 1, opacity: (busy || uploading) ? 0.6 : 1 }}>
              {busy ? t('common.loading') : t('menuSetup.saveDish')}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
