import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCustomers } from '../hooks/useCustomers'
import { useSync } from '../context/SyncContext'
import { useOnline } from '../hooks/useOnline'
import AppShell from '../components/layout/AppShell'
import SyncBadge from '../components/layout/SyncBadge'
import SearchInput from '../components/ui/SearchInput'
import CustomerList from '../components/customers/CustomerList'
import CustomerFormSheet from '../components/customers/CustomerFormSheet'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

export default function CustomersPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { syncing, runSync, initialSyncDone } = useSync()
  const online = useOnline()
  const customers = useCustomers()
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const isAdmin = profile?.rol === 'admin'

  const initials = useMemo(() => {
    if (!profile?.nombre) return '··'
    return profile.nombre
      .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  }, [profile])

  const waitingInitialSync = online && !initialSyncDone
  const loading = waitingInitialSync || customers === undefined
  const emptyCache = customers && customers.length === 0

  function handleNew() {
    if (!online) return
    setEditing(null)
    setFormOpen(true)
  }

  async function handleSaved() {
    await runSync()
  }

  return (
    <AppShell>
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Buenos días,</p>
            <h1 className="text-xl font-bold truncate">{profile?.nombre ?? 'Vendedor'}</h1>
          </div>
          <div className="flex items-center gap-2">
            {online && (
              <IconButton onClick={() => runSync(false)} disabled={syncing} label="Sincronizar">
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  className={syncing ? 'animate-spin' : ''}
                >
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
              </IconButton>
            )}
            <IconButton onClick={() => navigate('/pedidos')} label="Mis pedidos">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
            </IconButton>
            {isAdmin && (
              <IconButton onClick={() => navigate('/admin/productos')} label="Productos">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
                </svg>
              </IconButton>
            )}
            {isAdmin && (
              <IconButton onClick={() => navigate('/admin/dashboard')} label="Métricas">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18M7 14l4-4 4 4 5-5" />
                </svg>
              </IconButton>
            )}
            {isAdmin && (
              <IconButton onClick={() => navigate('/admin/empresa')} label="Mi empresa">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h.01M9 12h.01M9 15h.01M9 18h.01" />
                </svg>
              </IconButton>
            )}
            <button
              onClick={signOut}
              className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-semibold text-slate-600 text-sm flex-shrink-0"
              aria-label="Cerrar sesión"
            >
              {initials}
            </button>
          </div>
        </div>
      </div>

      <SyncBadge />

      <div className="px-5 pt-3 pb-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar cliente…" />
      </div>

      <div className="px-5 pb-24 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-500">
              {waitingInitialSync ? 'Cargando tus clientes…' : 'Leyendo caché…'}
            </p>
          </div>
        ) : emptyCache ? (
          online ? (
            <EmptyState
              title="Sin clientes asignados"
              description="No hay clientes activos en este momento."
              action={
                isAdmin
                  ? <Button onClick={handleNew}>Crear el primero</Button>
                  : <Button onClick={() => runSync(false)} disabled={syncing}>Reintentar sincronización</Button>
              }
            />
          ) : (
            <EmptyState
              title="Sin datos en caché"
              description="Conéctate a internet para sincronizar tus clientes la primera vez."
            />
          )
        ) : (
          <CustomerList customers={customers} query={query} />
        )}
      </div>

      {isAdmin && (
        <button
          onClick={handleNew}
          disabled={!online}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-xl shadow-brand-600/30 active:scale-95 active:bg-brand-700 transition disabled:opacity-50 z-20"
          aria-label="Nuevo cliente"
          title={online ? 'Nuevo cliente' : 'Sin conexión'}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      <CustomerFormSheet
        open={formOpen}
        customer={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleSaved}
      />
    </AppShell>
  )
}

function IconButton({ children, onClick, disabled, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200 disabled:opacity-50"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}