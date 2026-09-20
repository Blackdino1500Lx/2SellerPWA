import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function AdminRoute({ children }) {
  const { profile, loading } = useAuth()

  if (loading || profile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile || profile.rol !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}