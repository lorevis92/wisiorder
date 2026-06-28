import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  // Avviso esplicito in console se le env non sono configurate.
  console.error('[WisiOrder] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY mancanti. Controlla il file .env')
}

export const supabase = createClient(url, anon)
