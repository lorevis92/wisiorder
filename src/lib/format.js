const CURRENCY_SYMBOLS = {
  CHF:'CHF', EUR:'€', USD:'$', GBP:'£', THB:'฿', CNY:'¥', JPY:'¥',
  AUD:'A$', CAD:'C$', SEK:'kr', NOK:'kr', DKK:'kr', PLN:'zł',
  INR:'₹', BRL:'R$', MXN:'$', SGD:'S$', HKD:'HK$', AED:'AED', ZAR:'R',
}

export const CURRENCIES = Object.keys(CURRENCY_SYMBOLS)

export function money(n, currency = 'CHF') {
  const v = Number(n || 0)
  const sym = CURRENCY_SYMBOLS[currency] || currency
  return `${sym} ${v.toFixed(2)}`
}

export function minutesAgo(iso) {
  if (!iso) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
}

export function relTime(iso) {
  const m = minutesAgo(iso)
  if (m < 1) return 'adesso'
  if (m === 1) return '1 min fa'
  return `${m} min fa`
}
