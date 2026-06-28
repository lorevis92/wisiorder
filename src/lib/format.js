// Formatta prezzi. Default CHF (mercato primario Svizzera), facilmente cambiabile.
export function money(n, currency = 'CHF') {
  const v = Number(n || 0)
  return `${currency} ${v.toFixed(2)}`
}

// Minuti trascorsi da un timestamp ISO.
export function minutesAgo(iso) {
  if (!iso) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
}

// "5 min fa" / "ora"
export function relTime(iso) {
  const m = minutesAgo(iso)
  if (m < 1) return 'adesso'
  if (m === 1) return '1 min fa'
  return `${m} min fa`
}
