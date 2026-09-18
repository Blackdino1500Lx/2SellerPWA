import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import StatCard from '../components/dashboard/StatCard'
import DateRangePicker from '../components/dashboard/DateRangePicker'
import SalesChart from '../components/dashboard/SalesChart'
import TopProductsList from '../components/dashboard/TopProductsList'
import TopSellersList from '../components/dashboard/TopSellersList'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import {
  fmtCRC,
  toISODate,
  startOfMonth,
  endOfMonth
} from '../lib/format'

function getRange(rangeId) {
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  let from = new Date(today)
  let to = new Date(now)

  switch (rangeId) {
    case 'hoy':
      from = new Date(today)
      break
    case 'semana':
      from = new Date(today)
      from.setDate(from.getDate() - 6)
      break
    case 'mes':
      from = startOfMonth(now)
      to = endOfMonth(now)
      break
    case 'trim':
      from = new Date(now)
      from.setMonth(from.getMonth() - 2)
      from = startOfMonth(from)
      to = endOfMonth(now)
      break
    case 'ano':
      from = new Date(now.getFullYear(), 0, 1)
      to = endOfMonth(now)
      break
    default:
      from = startOfMonth(now)
      to = endOfMonth(now)
  }

  return { from: toISODate(from), to: toISODate(to) }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [rangeId, setRangeId] = useState('mes')
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const range = useMemo(() => getRange(rangeId), [rangeId])

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase.rpc('dashboard_metrics', {
        p_from: range.from,
        p_to: range.to
      })

      if (!mounted) return
      if (error) setError(error.message)
      else setMetrics(data)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [range.from, range.to])

  return (
    <AppShell>
      <Header title="Dashboard" subtitle="Métricas" showBack />

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Selector de rango */}
        <div className="px-5 pt-4">
          <DateRangePicker value={rangeId} onChange={setRangeId} />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState
            title="Error al cargar métricas"
            description={error}
            action={<Button onClick={() => window.location.reload()}>Reintentar</Button>}
          />
        ) : (
          <>
            {/* Stat cards */}
            <div className="px-5 pt-5 grid grid-cols-2 gap-3">
              <StatCard
                label="Ventas"
                value={fmtCRC(metrics?.resumen?.total_ventas ?? 0)}
              />
              <StatCard
                label="Pedidos"
                value={String(metrics?.resumen?.total_pedidos ?? 0)}
              />
              <StatCard
                label="Ticket promedio"
                value={fmtCRC(metrics?.resumen?.ticket_promedio ?? 0)}
              />
              <StatCard
                label="Impuestos"
                value={fmtCRC(metrics?.resumen?.total_impuestos ?? 0)}
              />
            </div>

            {/* Chart mensual */}
            <div className="px-5 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Ventas por mes
              </h3>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <SalesChart data={metrics?.por_mes ?? []} />
              </div>
            </div>

            {/* Top productos */}
            <div className="px-5 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Productos más vendidos
              </h3>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <TopProductsList products={metrics?.top_productos ?? []} />
              </div>
            </div>

            {/* Top vendedores */}
            <div className="px-5 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Ventas por vendedor
              </h3>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <TopSellersList sellers={metrics?.top_vendedores ?? []} />
              </div>
            </div>

            {/* Botón reporte */}
            <div className="px-5 pt-6">
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => navigate('/dashboard/reporte')}
              >
                Generar reporte PDF
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}