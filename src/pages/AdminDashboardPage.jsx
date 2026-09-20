import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import DateRangePicker from '../components/dashboard/DateRangePicker'
import StatCard from '../components/dashboard/StatCard'
import SalesChart from '../components/dashboard/SalesChart'
import TopProductsList from '../components/dashboard/TopProductsList'
import TopSellersList from '../components/dashboard/TopSellersList'
import { fmtCRC } from '../lib/format'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [rango, setRango] = useState('semana')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      const { data, error } = await supabase.rpc('dashboard_metrics', { p_rango: rango })
      if (!mounted) return
      if (error) {
        console.error('dashboard_metrics error:', error)
        setError(error.message)
        setData(null)
      } else {
        setData(data)
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [rango])

  const totales = data?.totales || { ventas: 0, pedidos: 0, promedio: 0 }

  return (
    <AppShell>
      <Header title="Métricas" subtitle="Admin" showBack />

      <div className="px-5 pt-4 pb-3">
        <DateRangePicker value={rango} onChange={setRango} />
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <EmptyState
          title="Error al cargar métricas"
          description={error}
          action={<Button onClick={() => setRango(rango)}>Reintentar</Button>}
        />
      ) : (
        <div className="flex-1 overflow-y-auto pb-8">
          {/* Totales */}
          <div className="px-5 pt-2 grid grid-cols-2 gap-3">
            <StatCard
              label="Ventas"
              value={fmtCRC(totales.ventas)}
              hint={`${totales.pedidos} pedido${totales.pedidos === 1 ? '' : 's'}`}
            />
            <StatCard
              label="Ticket promedio"
              value={fmtCRC(totales.promedio)}
            />
          </div>

          {/* Serie temporal */}
          <div className="px-5 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Ventas por período
            </h3>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <SalesChart data={data?.serie || []} />
            </div>
          </div>

          {/* Top productos */}
          <div className="px-5 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Top productos
            </h3>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <TopProductsList products={data?.top_productos || []} />
            </div>
          </div>

          {/* Top vendedores */}
          <div className="px-5 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Top vendedores
            </h3>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <TopSellersList sellers={data?.top_vendedores || []} />
            </div>
          </div>

          <div className="px-5 pt-6">
            <button
              onClick={() => navigate('/admin/empresa')}
              className="w-full text-sm font-medium text-brand-600 py-3"
            >
              Ir a configuración de empresa →
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}