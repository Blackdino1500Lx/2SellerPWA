import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { localDb } from '../lib/localDb'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../components/layout/AppShell'
import OfflineBadge from '../components/layout/OfflineBadge'
import SearchInput from '../components/ui/SearchInput'
import CustomerList from '../components/customers/CustomerList'
import CustomerFormSheet from '../components/customers/CustomerFormSheet'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

export default function CustomersPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const isAdmin = profile?.rol === 'admin'

  async function loadCustomers() {
    setLoading(true)
    setError('')

    try {
      // 1. Cache local primero
      let cached = []
      try {
        cached = localDb.getCustomers() || []
      } catch (e) {
        console.warn('localDb.getCustomers falló:', e)
      }

      if (cached.length > 0) {
        setCustomers(cached)
      }

      // 2. Si no hay red, terminamos con lo que haya en cache
      if (!navigator.onLine) {
        if (cached.length === 0) {
          setError('Sin conexión y sin datos locales')
        }
        return
      }

      // 3. Fetch de Supabase
      const { data, error } = await supabase
        .from('customers')
        .select('id, nombre, identificacion, telefono, direccion, activo, seller_id')
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (error) {
        console.warn('Error fetching customers:', error)
        if (cached.length === 0) setError(error.message)
      } else {
        const list = data ?? []
        setCustomers(list)
        try {
          localDb.setCustomers(list)
        } catch (e) {
          console.warn('localDb.setCustomers falló:', e)
        }
      }
    } catch (err) {
      console.error('loadCustomers falló inesperadamente:', err)
      setError(err.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initials = useMemo(() => {
    if (!profile?.nombre) return '··'
    return profile.nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
  }, [profile])

  return (
    <AppShell>
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">Buenos días,</p>
            <h1 className="text-xl font-bold truncate">
              {profile?.nombre ?? 'Vendedor'}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin && (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:bg-slate-200"
                  aria-label="Dashboard"
                  title="Dashboard"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <rect x="7" y="12" width="3" height="6" rx="1" />
                    <rect x="12" y="8" width="3" height="10" rx="1" />
                    <rect x="17" y="4" width="3" height="14" rx="1" />
                  </svg>
                </button>

                <button
                  onClick={() => navigate('/configuracion')}
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:bg-slate-200"
                  aria-label="Configuración"
                  title="Configuración"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                </button>
              </>
            )}

            <button
              onClick={signOut}
              className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-semibold text-slate-600 text-sm"
              aria-label="Cerrar sesión"
            >
              {initials}
            </button>
          </div>
        </div>
      </div>

      <OfflineBadge />

      <div className="px-5 pt-3 pb-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar cliente…" />
      </div>

      <div className="px-5 pb-6 flex-1">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState
            title="Error al cargar clientes"
            description={error}
            action={<Button onClick={loadCustomers}>Reintentar</Button>}
          />
        ) : (
          <CustomerList customers={customers} query={query} />
        )}
      </div>

      {isAdmin && (
        <button
          onClick={() => setFormOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-xl shadow-brand-600/30 active:scale-95 active:bg-brand-700 transition z-20"
          aria-label="Nuevo cliente"
          title="Nuevo cliente"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      <CustomerFormSheet
        open={formOpen}
        customer={null}
        onClose={() => setFormOpen(false)}
        onSaved={loadCustomers}
      />
    </AppShell>
  )
}