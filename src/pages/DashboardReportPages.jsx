import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { generarPDFReporte } from '../lib/pdfReport'
import { abrirPDF, descargarPDF } from '../lib/pdf'

function ultimosMeses(n = 12) {
  const hoy = new Date()
  const meses = []
  for (let i = 0; i < n; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    meses.push(`${y}-${m}`)
  }
  return meses
}

function fmtMesLabel(yyyymm) {
  const [y, m] = yyyymm.split('-')
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${meses[parseInt(m,10) - 1]} ${y}`
}

function rangoDeMeses(mesesSeleccionados) {
  if (mesesSeleccionados.length === 0) return null
  const ordenados = [...mesesSeleccionados].sort()
  const primero = ordenados[0]
  const ultimo = ordenados[ordenados.length - 1]

  const [y1, m1] = primero.split('-').map(Number)
  const [y2, m2] = ultimo.split('-').map(Number)

  const from = new Date(y1, m1 - 1, 1)
  const to = new Date(y2, m2, 0) // último día del mes

  function iso(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

  return { from: iso(from), to: iso(to) }
}

export default function DashboardReportPage() {
  const navigate = useNavigate()
  const mesesDisponibles = useMemo(() => ultimosMeses(12), [])
  const [seleccionados, setSeleccionados] = useState(() => [ultimosMeses(1)[0]])
  const [company, setCompany] = useState(null)
  const [generando, setGenerando] = useState(false)
  const [pdfBytes, setPdfBytes] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('companies').select('*').maybeSingle()
      setCompany(data)
    }
    load()
  }, [])

  function toggleMes(mes) {
    setPdfBytes(null)
    setSeleccionados((prev) =>
      prev.includes(mes)
        ? prev.filter((m) => m !== mes)
        : [...prev, mes]
    )
  }

  async function handleGenerar() {
    setError('')
    setPdfBytes(null)

    if (seleccionados.length === 0) {
      setError('Selecciona al menos un mes')
      return
    }
    if (!company) {
      setError('No se cargó la empresa')
      return
    }

    const rango = rangoDeMeses(seleccionados)
    setGenerando(true)

    try {
      const { data: metrics, error: rpcErr } = await supabase.rpc('dashboard_metrics', {
        p_from: rango.from,
        p_to: rango.to
      })

      if (rpcErr) throw rpcErr

      const bytes = await generarPDFReporte({
        empresa: company,
        meses: seleccionados.sort(),
        fechaDesde: rango.from,
        fechaHasta: rango.to,
        resumen: metrics.resumen,
        porMes: metrics.por_mes,
        topProductos: metrics.top_productos,
        topVendedores: metrics.top_vendedores
      })

      setPdfBytes(bytes)
    } catch (err) {
      console.error('Error generando reporte:', err)
      setError(err.message || 'Error al generar el reporte')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <AppShell>
      <Header title="Reporte de ventas" subtitle="Dashboard" showBack />

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="px-5 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Meses a incluir
          </h3>
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
            {mesesDisponibles.map((mes) => {
              const checked = seleccionados.includes(mes)
              return (
                <label
                  key={mes}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMes(mes)}
                    className="w-5 h-5 accent-brand-600"
                  />
                  <span className="text-sm font-medium">{fmtMesLabel(mes)}</span>
                </label>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {pdfBytes && (
          <div className="px-5 mt-6 space-y-2">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl px-4 py-3">
              Reporte listo
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => abrirPDF(pdfBytes)}
            >
              Ver reporte
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() =>
                descargarPDF(pdfBytes, `reporte-ventas-${Date.now()}.pdf`)
              }
            >
              Descargar PDF
            </Button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-5 pt-3 pb-5 bg-white safe-bottom">
        <Button
          size="lg"
          className="w-full"
          onClick={handleGenerar}
          disabled={generando || seleccionados.length === 0}
        >
          {generando ? 'Generando…' : (pdfBytes ? 'Regenerar reporte' : 'Generar reporte PDF')}
        </Button>
      </div>

      {generando && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-slate-600">Generando reporte…</p>
        </div>
      )}
    </AppShell>
  )
}