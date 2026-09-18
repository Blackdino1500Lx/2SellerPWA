import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import OrderEditorPage from './pages/OrderEditorPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import SettingsPage from './pages/SettingsPage'
import DashboardPage from './pages/DashboardPage'
import DashboardReportPages from './pages/DashboardReportPages'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

function AdminRoute({ children }) {
  const { isAuthenticated, loading, profile } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (profile?.rol !== 'admin') return <Navigate to="/" replace />
  return children
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    )
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <CustomersPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/clientes/:id',
    element: (
      <ProtectedRoute>
        <CustomerDetailPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/clientes/:id/pedido',
    element: (
      <ProtectedRoute>
        <OrderEditorPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/pedido/confirmado',
    element: (
      <ProtectedRoute>
        <OrderConfirmationPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/configuracion',
    element: (
      <AdminRoute>
        <SettingsPage />
      </AdminRoute>
    )
  },
  {
  path: '/dashboard',
  element: (
    <AdminRoute>
      <DashboardPage />
    </AdminRoute>
  )
},
{
  path: '/dashboard/reporte',
  element: (
    <AdminRoute>
      <DashboardReportPages />
    </AdminRoute>
  )
},
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
])