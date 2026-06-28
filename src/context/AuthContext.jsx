import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthCtx = createContext({ user: null, restaurant: null, loading: true })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadRestaurant(uid) {
    if (!uid) { setRestaurant(null); return }
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_user_id', uid)
      .maybeSingle()
    setRestaurant(data || null)
  }

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      const u = data.session?.user || null
      setUser(u)
      await loadRestaurant(u?.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user || null
      setUser(u)
      await loadRestaurant(u?.id)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setRestaurant(null)
  }

  return (
    <AuthCtx.Provider value={{ user, restaurant, loading, signOut, reloadRestaurant: () => loadRestaurant(user?.id) }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
