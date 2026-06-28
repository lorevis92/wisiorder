import { Component } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Spinner } from './components/UI'

class DashboardErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, fontFamily: 'monospace', maxWidth: 700, margin: '40px auto' }}>
        <h2 style={{ color: '#E8352A', marginBottom: 12 }}>Errore dashboard</h2>
        <pre style={{ background: '#f8f8f8', border: '1px solid #eee', padding: 16, borderRadius: 4, overflow: 'auto', fontSize: 13, whiteSpace: 'pre-wrap' }}>
          {this.state.error.message}{'\n\n'}{this.state.error.stack}
        </pre>
        <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '8px 20px', cursor: 'pointer' }}>
          Riprova
        </button>
      </div>
    )
    return this.props.children
  }
}

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
        <Route path="/dashboard" element={<DashboardErrorBoundary><Dashboard /></DashboardErrorBoundary>} />
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
