import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Spinner } from './components/UI'

// Lato gestore (brand WisiOrder)
import Landing from './pages/Landing'
import Login from './pages/Login'
import ManagerLayout from './pages/manager/ManagerLayout'
import Dashboard from './pages/manager/Dashboard'
import MenuSetup from './pages/manager/MenuSetup'
import Settings from './pages/manager/Settings'

// Lato cliente (white-label)
import RestaurantMenu from './pages/client/RestaurantMenu'
import OrderStatus from './pages/client/OrderStatus'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Root: landing per gestori + accesso login */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Area gestore (WisiOrder) */}
      <Route element={<RequireAuth><ManagerLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/menu" element={<MenuSetup />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Area cliente (white-label, via QR) */}
      <Route path="/r/:slug" element={<RestaurantMenu />} />
      <Route path="/o/:orderId" element={<OrderStatus />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
