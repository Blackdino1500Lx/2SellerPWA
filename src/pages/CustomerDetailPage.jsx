import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import CustomerFormSheet from '../components/customers/CustomerFormSheet'
import { fmtCRC } from '../lib/format'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  const isAdmin = profile?.rol === 'admin'

  async function loadCustomer() {
    setLoading(true)
    setError('')

    const [custRes, ordersRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('orders')
        .select('id, folio, folio_local, fecha, total, anulado')
        .eq('customer_id', id)
        .eq('anulado', false)
        .order('fecha', { ascending: false })
        .limit(20)
    ])

    if (custRes.error) setError(custRes.error.message)
    else if (!custRes.data) setError('Cliente no encontrado')
    else setCustomer(custRes.data)

    if (ordersRes.data) setOrders(ordersRes.data)
    setLoading(false)
  }

  useEffect(() => {
    loadCustomer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <AppShell>
        <Header title="Cliente" showBack />
        <div className="flex-1 flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </AppShell>
    )
  }

  if (error || !customer) {
    return (
      <AppShell>
        <Header title="Cliente" showBack />
        <EmptyState
          title="No se pudo cargar"
          description={error || 'Cliente no disponible'}
          action={<Button onClick={() => navigate('/')}>Volver a clientes</Button>}
        />
      </AppShell>
    )
  }

  const initials = (customer.nombre || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

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
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:bg-slate-200"
              aria-label="Editar"
              title="Editar"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          ) : null
        }
      />

      {/* Info cliente */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg leading-tight">{customer.nombre}</h2>
            {customer.identificacion && (
              <p className="text-sm text-slate-500 mt-0.5">
                {customer.identificacion}
              </p>
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
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
      </div>

      {/* Botón principal */}
      <div className="px-5 pb-5">
        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate(`/clientes/${customer.id}/pedido`)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="mr-2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo pedido
        </Button>
      </div>

      {/* Historial */}
      <div className="px-5 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Historial reciente
        </h3>
      </div>

      <div className="px-5 pb-8 space-y-2">
        {orders.length === 0 ? (
          <EmptyState
            title="Sin pedidos aún"
            description="Este cliente no tiene pedidos registrados."
          />
        ) : (
          orders.map((o) => <OrderRow key={o.id} order={o} />)
        )}
      </div>

      {/* Sheet de edición */}
      <CustomerFormSheet
        open={editOpen}
        customer={customer}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          loadCustomer()
        }}
        onDeleted={() => {
          navigate('/', { replace: true })
        }}
      />
    </AppShell>
  )
}

function OrderRow({ order }) {
  const folio = order.folio || order.folio_local || '—'
  const fecha = new Date(order.fecha).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  const pendiente = !order.folio

  return (
    <div
      className={`rounded-xl p-3.5 flex items-center justify-between border ${
        pendiente
          ? 'border-amber-200 bg-amber-50/50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div>
        <p className="font-semibold text-sm">{folio}</p>
        <p className="text-xs text-slate-500">{fecha}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-sm">{fmtCRC(order.total)}</p>
        <p
          className={`text-[10px] font-semibold ${
            pendiente ? 'text-amber-700' : 'text-emerald-600'
          }`}
        >
          {pendiente ? 'PENDIENTE' : 'SINCRONIZADO'}
        </p>
      </div>
    </div>
  )
}