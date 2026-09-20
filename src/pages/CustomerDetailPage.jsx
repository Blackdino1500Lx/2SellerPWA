import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCustomer } from '../hooks/useCustomers'
import { useDraftsForCustomer } from '../hooks/useDrafts'
import { useOnline } from '../hooks/useOnline'
import { useAuth } from '../hooks/useAuth'
import { useSync } from '../context/SyncContext'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import CustomerFormSheet from '../components/customers/CustomerFormSheet'
import { fmtCRC, fmtFechaHora } from '../lib/format'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const online = useOnline()
  const { profile } = useAuth()
  const { runSync } = useSync()
  const customer = useCustomer(id)
  const drafts = useDraftsForCustomer(id)

  const isAdmin = profile?.rol === 'admin'

  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [ordersError, setOrdersError] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    if (!online) {
      setLoadingOrders(false)
      return
    }
    async function load() {
      setLoadingOrders(true)
      setOrdersError('')
      const { data, error } = await supabase
        .from('orders')
        .select('id, folio, folio_local, fecha, total, anulado')
        .eq('customer_id', id)
        .eq('anulado', false)
        .order('fecha', { ascending: false })
        .limit(50)

      if (!mounted) return
      if (error) setOrdersError(error.message)
      else setOrders(data ?? [])
      setLoadingOrders(false)
    }
    load()
    return () => { mounted = false }
  }, [id, online])

  const merged = useMemo(() => {
    const serverIds = new Set((orders ?? []).map((o) => o.id))

    const draftRows = (drafts ?? [])
      .filter((d) => d.synced === 0 || !serverIds.has(d.server_order_id))
      .map((d) => ({
        kind: 'draft',
        id: d.client_uuid,
        folio: d.server_folio || d.order.folio_local,
        fecha: d.order.fecha,
        total: d.order.total,
        pending: d.synced === 0,
        hasError: !!d.sync_error
      }))

    const orderRows = (orders ?? []).map((o) => ({
      kind: 'order',
      id: o.id,
      folio: o.folio || o.folio_local || '—',
      fecha: o.fecha,
      total: o.total,
      pending: false,
      hasError: false
    }))

    return [...draftRows, ...orderRows].sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    )
  }, [drafts, orders])

  const loadingCustomer = customer === undefined

  if (loadingCustomer) {
    return (
      <AppShell>
        <Header title="Cliente" showBack />
        <div className="flex-1 flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </AppShell>
    )
  }

  if (!customer) {
    return (
      <AppShell>
        <Header title="Cliente" showBack />
        <EmptyState
          title="No se pudo cargar"
          description="Cliente no disponible en caché local."
          action={<Button onClick={() => navigate('/')}>Volver a clientes</Button>}
        />
      </AppShell>
    )
  }

  const initials = (customer.nombre || '')
    .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  return (
    <AppShell>
      <Header
        title={customer.nombre}
        subtitle="Cliente"
        showBack
        right={
          isAdmin ? (
            <button
              onClick={() => setEditOpen(true)}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200"
              aria-label="Editar cliente"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          ) : null
        }
      />

      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg leading-tight">{customer.nombre}</h2>
            {customer.identificacion && (
              <p className="text-sm text-slate-500 mt-0.5">{customer.identificacion}</p>
            )}
            {customer.direccion && (
              <p className="text-sm text-slate-500">{customer.direccion}</p>
            )}
          </div>
        </div>

        {(customer.telefono || customer.email) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {customer.telefono && (
              <a
                href={`tel:${customer.telefono}`}
                className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full active:bg-slate-200"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z" />
                </svg>
                {customer.telefono}
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full active:bg-slate-200"
              >
                {customer.email}
              </a>
            )}
          </div>
        )}

        {customer.notas && (
          <div className="mt-4 bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
              Notas
            </p>
            <p className="text-sm text-slate-700">{customer.notas}</p>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate(`/clientes/${customer.id}/pedido`)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="mr-2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo pedido
        </Button>
      </div>

      <div className="px-5 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Historial reciente
        </h3>
      </div>

      <div className="px-5 pb-8 space-y-2">
        {merged.length === 0 ? (
          loadingOrders && online ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : ordersError ? (
            <EmptyState title="Error al cargar historial" description={ordersError} />
          ) : (
            <EmptyState title="Sin pedidos aún" description="Este cliente no tiene pedidos registrados." />
          )
        ) : (
          merged.map((item) => (
            <OrderRow
              key={`${item.kind}-${item.id}`}
              item={item}
              onClick={() =>
                navigate(
                  item.kind === 'draft'
                    ? `/pedidos/draft-${item.id}`
                    : `/pedidos/${item.id}`
                )
              }
            />
          ))
        )}
      </div>

      <CustomerFormSheet
        open={editOpen}
        customer={customer}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          await runSync()
          setEditOpen(false)
        }}
        onDeleted={async () => {
          await runSync()
          navigate('/')
        }}
      />
    </AppShell>
  )
}

function OrderRow({ item, onClick }) {
  const state = item.hasError ? 'error' : item.pending ? 'pending' : 'synced'

  const styles = {
    error:   'border-red-200 bg-red-50/50',
    pending: 'border-amber-200 bg-amber-50/50',
    synced:  'border-slate-200 bg-white'
  }

  const labels = {
    error:   { text: 'ERROR', cls: 'text-red-700' },
    pending: { text: 'PENDIENTE', cls: 'text-amber-700' },
    synced:  { text: 'SINCRONIZADO', cls: 'text-emerald-600' }
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-3.5 border transition active:scale-[.99] ${styles[state]}`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-sm">{item.folio}</p>
        <p className="font-bold text-sm tabular-nums">{fmtCRC(item.total)}</p>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">{fmtFechaHora(item.fecha)}</p>
        <p className={`text-[10px] font-semibold ${labels[state].cls}`}>
          {labels[state].text}
        </p>
      </div>
    </button>
  )
}