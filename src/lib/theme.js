// Design tokens WiSiVERSE — valori esatti, non riferimenti.
export const T = {
  bg: '#FFFFFF',
  surface: '#F8F8F8',
  surfaceAlt: '#F0F0F0',
  border: '#E8E8E8',
  text: '#111111',
  textSecondary: '#666666',
  textMuted: '#AAAAAA',
  primary: '#E8352A',
  primaryLight: 'rgba(232,53,42,0.06)',
  primaryBorder: 'rgba(232,53,42,0.18)',
  green: '#00996A',
  yellow: '#B87000',
  // tipografia
  syne: "'Syne', sans-serif",
  mono: "'DM Mono', monospace",
  georgia: "Georgia, 'Times New Roman', serif",
  // raggi
  rCard: 6,
  rSection: 4,
  rBtn: 3,
}

// Stato ordine: ordine + etichette + colori
export const ORDER_FLOW = ['received', 'preparing', 'ready']
export const STATUS_LABEL = {
  received: 'Ricevuto',
  preparing: 'In preparazione',
  ready: 'Pronto',
  completed: 'Consegnato',
}
export const STATUS_COLOR = {
  received: T.yellow,
  preparing: T.primary,
  ready: T.green,
  completed: T.textMuted,
}
