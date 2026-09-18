import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Button from '../components/ui/Button'
import { fmtCRC } from '../lib/format'
import { abrirPDF, descargarPDF } from '../lib/pdf'

export default function OrderConfirmationPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (!state?.result) {
      navigate('/', { replace: true })
    }
  }, [state, navigate])

  if (!state?.result) return null

  const { result, pdfBytes, customerNombre, fecha } = state
  const isOffline = !!result.offline

  async function handleShare() {
    if (!pdfBytes) return
    setSharing(true)
    try {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const file = new File(
        [blob],
        `pedido-${result.folio}.pdf`,
        { type: 'application/pdf' }
      )

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Pedido ${result.folio}`,
          text: `Pedido para ${customerNombre}`
        })
      } else {
        await descargarPDF(pdfBytes, `pedido-${result.folio}.pdf`)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error al compartir:', err)
        await descargarPDF(pdfBytes, `pedido-${result.folio}.pdf`)
      }
    } finally {
      setSharing(false)
    }
  }

  const fechaStr = fecha
    ? new Date(fecha).toLocaleString('es-CR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : new Date().toLocaleString('es-CR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })

  return (
    <AppShell>
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Icono según estado */}
        {isOffline ? (
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-5">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        )}

        <h2 className="text-xl font-bold mb-1">
          {isOffline ? 'Pedido guardado' : 'Pedido confirmado'}
        </h2>
        <p className="text-sm text-slate-500 mb-1">{customerNombre}</p>
        <p className="text-xs text-slate-400">{fechaStr}</p>

        {/* Chip según estado */}
        {isOffline && (
          <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl text-center max-w-xs">
            <b>Pendiente de sincronizar</b>
            <p className="mt-0.5 text-[11px]">
              Se subirá automáticamente cuando recuperes conexión
            </p>
          </div>
        )}

        {!isOffline && result.duplicate && (
          <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl">
            Este pedido ya estaba registrado (envío duplicado detectado)
          </div>
        )}

        <div className="w-full bg-slate-50 rounded-2xl p-5 mt-7 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              {isOffline ? 'Folio local' : 'Folio'}
            </span>
            <span className="font-bold">{result.folio}</span>
          </div>
          {result.subtotal != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold tabular-nums">{fmtCRC(result.subtotal)}</span>
            </div>
          )}
          {result.impuestos != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Impuestos</span>
              <span className="font-semibold tabular-nums">{fmtCRC(result.impuestos)}</span>
            </div>
          )}
          <div className="h-px bg-slate-200" />
          <div className="flex items-center justify-between">
            <span className="font-bold">Total</span>
            <span className="font-bold text-xl tabular-nums">{fmtCRC(result.total)}</span>
          </div>
        </div>

        <div className="w-full mt-6 space-y-2">
          <Button
            size="lg"
            className="w-full"
            onClick={() => abrirPDF(pdfBytes)}
            disabled={!pdfBytes}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            Ver PDF
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleShare}
            disabled={!pdfBytes || sharing}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
            </svg>
            {sharing ? 'Compartiendo…' : 'Compartir'}
          </Button>
        </div>
      </div>

      <div className="px-5 pb-6">
        <button
          onClick={() => navigate('/', { replace: true })}
          className="w-full text-slate-500 text-sm font-medium py-2"
        >
          Volver a mis clientes
        </button>
      </div>
    </AppShell>
  )
}