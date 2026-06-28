# WisiOrder

Ordini al tavolo via QR, white-label, multi-tenant. Parte del WiSiVERSE.

- **Cliente** scansiona il QR del locale → apre il menu personalizzato (brand del ristorante), ordina dal telefono, segue lo stato in tempo reale.
- **Gestore** (brand WisiOrder) riceve gli ordini live su tablet, avanza lo stato, e dal pannello costruisce il menu, personalizza il brand e genera il QR.

## Stack
React + Vite · React Router · Supabase (Postgres + RLS + Realtime + Storage) · qr-code-styling · Vercel.

## Struttura route
| Route | Chi | Cosa |
|---|---|---|
| `/` | Gestori | Landing marketing + accesso |
| `/login` | Gestori | Login / registrazione |
| `/dashboard` | Gestore | Board ordini live (operativo) |
| `/menu` | Gestore | Setup categorie, piatti, foto, esaurito |
| `/settings` | Gestore | White-label + generazione QR |
| `/r/:slug` | Cliente | Menu white-label + carrello (via QR) |
| `/o/:orderId` | Cliente | Stato ordine live |

## Setup locale
```bash
npm install
cp .env.example .env   # poi inserisci URL e ANON KEY Supabase
npm run dev
```

## Setup Supabase
1. SQL Editor → incolla ed esegui tutto `supabase/schema.sql`.
   Crea tabelle, RLS, la RPC `place_order`, il bucket Storage `menu-photos` e abilita Realtime su `orders`.
2. Authentication → Providers → Email: per il pilota conviene disattivare "Confirm email" così i gestori entrano subito dopo la registrazione.
3. Copia `Project URL` e `anon public key` in `.env`.

## Logo (checklist WiSiVERSE)
Metti in `/public`:
- `logo-wisiorder.png` — usato nell'area gestore e come favicon
- `logo-wisiverse.png` — usato nel footer

Se mancano, l'app funziona comunque (i loghi vengono nascosti).

## Note di architettura
- **Nessun login lato cliente.** L'ordine è identificato da un UUID non indovinabile; la pagina stato vi accede e si iscrive a Realtime su quella riga.
- **Prezzi congelati** in `order_items` (snapshot nome + prezzo): modifiche future al menu non alterano gli ordini passati.
- **Ordine atomico** via RPC `place_order` (SECURITY DEFINER): rilegge i prezzi dal DB lato server (no manomissione client), salta gli esauriti, crea ordine + righe in un'unica transazione.
- **Tradeoff noto (v1):** lettura pubblica su `orders`/`order_items`. Gli UUID non sono enumerabili e non ci sono dati di pagamento, ma in Fase 2 si può chiudere con una RPC `get_order(id)` token-based.
- **Notifica READY:** la pagina stato resta aperta con Realtime → al passaggio "pronto" cambia colore + suono/vibrazione. Web Push (PWA installata) è un enhancement di Fase 2 — su iOS richiede installazione in home, poco adatto a un uso usa-e-getta.

## Fase 2 (sul tavolo, non in v1)
Pagamento in-app (Stripe), Web Push, raggruppamento ordini per tavolo, menu multilingua, dominio custom per ristorante, progetto Supabase dedicato quando i locali crescono.
