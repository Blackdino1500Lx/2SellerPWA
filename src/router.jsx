import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AdminRoute from './components/layout/AdminRoute'
import LoginPage from './pages/LoginPage'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import OrderEditorPage from './pages/OrderEditorPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import OrdersListPage from './pages/OrdersListPage'
import OrderDetailPage from './pages/OrderDetailPage'
import CompanySettingsPage from './pages/CompanySettingsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ProductsListPage from './pages/ProductsListPage'

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
    path: '/pedidos',
    element: (
      <ProtectedRoute>
        <OrdersListPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/pedidos/:id',
    element: (
      <ProtectedRoute>
        <OrderDetailPage />
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
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <AdminDashboardPage />
        </AdminRoute>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/productos',
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <ProductsListPage />
        </AdminRoute>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/empresa',
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <CompanySettingsPage />
        </AdminRoute>
      </ProtectedRoute>
    )
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
])