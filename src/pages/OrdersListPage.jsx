import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useOnline } from '../hooks/useOnline'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import SearchInput from '../components/ui/SearchInput'
import Button from '../components/ui/Button'
import { fmtCRC, fmtFechaHora } from '../lib/format'

const RANGOS = [
  { key: 'hoy',    label: 'Hoy' },
  { key: '7d',     label: '7 días' },
  { key: '30d',    label: '30 días' },
  { key: 'todo',   label: 'Todo' }
]

function rangoAFecha(rango) {
  const now = new Date()
  if (rango === 'hoy') {
    now.setHours(0, 0, 0, 0)
    return now.toISOString()
  }
  if (rango === '7d') {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
  if (rango === '30d') {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
  return null
}

export default function OrdersListPage() {
  const navigate = useNavigate()
  const online = useOnline()

  const [rango, setRango] = useState('7d')
  const [query, setQuery] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Drafts locales (siempre, aunque estén pendientes)
  const drafts = useLiveQuery(
    () => db.drafts.toArray(),
    [],
    []
  )

  useEffect(() => {
    let mounted = true
    if (!online) {
      setLoading(false)
      return
    }
    async function load() {
      setLoading(true)
      setError('')

      let q = supabase
        .from('orders')
        .select('id, folio, folio_local, fecha, total, anulado, cliente_nombre, customer_id')
        .eq('anulado', false)
        .order('fecha', { ascending: false })
        .limit(200)

      const desde = rangoAFecha(rango)
      if (desde) q = q.gte('fecha', desde)

      const { data, error } = await q
      if (!mounted) return
      if (error) setError(error.message)
      else setOrders(data ?? [])
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [online, rango])

  // Mezclar drafts + pedidos del servidor
  const merged = useMemo(() => {
    const serverIds = new Set((orders ?? []).map((o) => o.id))

    const draftRows = (drafts ?? [])
      .filter((d) => d.synced === 0 || !serverIds.has(d.server_order_id))
      .filter((d) => {
        const desde = rangoAFecha(rango)
        if (!desde) return true
        return new Date(d.order.fecha) >= new Date(desde)
      })
      .map((d) => ({
        kind: 'draft',
        id: d.client_uuid,
        folio: d.server_folio || d.order.folio_local,
        fecha: d.order.fecha,
        total: d.order.total,
        cliente_nombre: d.order.cliente_nombre,
        pending: d.synced === 0,
        hasError: !!d.sync_error
      }))

    const orderRows = (orders ?? []).map((o) => ({
      kind: 'order',
      id: o.id,
      folio: o.folio || o.folio_local || '—',
      fecha: o.fecha,
      total: o.total,
      cliente_nombre: o.cliente_nombre || '—',
      pending: false,
      hasError: false
    }))

    const all = [...draftRows, ...orderRows].sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    )

    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter(
      (r) =>
        (r.folio || '').toLowerCase().includes(q) ||
        (r.cliente_nombre || '').toLowerCase().includes(q)
    )
  }, [drafts, orders, rango, query])

  return (
    <AppShell>
      <Header title="Mis pedidos" showBack />

      <div className="px-5 pt-3 pb-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por folio o cliente…"
        />
      </div>

      <div className="px-5 pb-3 flex gap-2 overflow-x-auto">
        {RANGOS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRango(r.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              rango === r.key
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 active:bg-slate-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="px-5 pb-6 flex-1">
        {loading && online ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState
            title="Error al cargar"
            description={error}
            action={online ? <Button onClick={() => setRango(rango)}>Reintentar</Button> : null}
          />
        ) : merged.length === 0 ? (
          <EmptyState
            title="Sin pedidos en este rango"
            description={
              query
                ? `No hay pedidos que coincidan con "${query}".`
                : online
                ? 'Prueba con otro rango de fechas.'
                : 'Conéctate para ver tu historial completo.'
            }
          />
        ) : (
          <div className="space-y-2">
            {merged.map((item) => (
              <OrderListRow
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
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function OrderListRow({ item, onClick }) {
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
        <p className="font-semibold text-sm truncate">{item.folio}</p>
        <p className="font-bold text-sm tabular-nums flex-shrink-0 ml-2">
          {fmtCRC(item.total)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 truncate">{item.cliente_nombre}</p>
        <p className={`text-[10px] font-semibold flex-shrink-0 ${labels[state].cls}`}>
          {labels[state].text}
        </p>
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{fmtFechaHora(item.fecha)}</p>
    </button>
  )
}