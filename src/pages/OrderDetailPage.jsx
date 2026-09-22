import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { useOnline } from '../hooks/useOnline'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { fmtCRC, fmtCRCShort, fmtFechaHora } from '../lib/format'
import { obtenerPDFPedido } from '../lib/orderPDF'
import { abrirPDF, descargarPDF } from '../lib/pdf'

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const online = useOnline()

  const isDraft = id.startsWith('draft-')
  const realId = isDraft ? id.slice(6) : id

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        if (isDraft) {
          const d = await db.drafts.get(realId)
          if (!d) throw new Error('Pedido local no encontrado')

          if (!mounted) return
          setOrder({
            kind: 'draft',
            client_uuid: d.client_uuid,
            folio: d.server_folio || d.order.folio_local,
            fecha: d.order.fecha,
            notas: d.order.notas,
            subtotal: d.order.subtotal,
            impuestos: d.order.impuestos,
            total: d.order.total,
            cliente_nombre: d.order.cliente_nombre,
            cliente_identificacion: d.order.cliente_identificacion,
            cliente_direccion: d.order.cliente_direccion,
            seller_nombre: d.order.seller_nombre,
            seller_codigo: d.order.seller_codigo,
            seller_zona: d.order.seller_zona,
            company_nombre: d.order.company_nombre,
            company_identificacion: d.order.company_identificacion,
            items: d.order.items,
            pending: d.synced === 0,
            hasError: !!d.sync_error,
            syncError: d.sync_error
          })
        } else {
          if (!online) throw new Error('Sin conexión. Conéctate para ver este pedido.')

          const { data, error: fetchErr } = await supabase
            .from('orders')
            .select(`
              id, folio, folio_local, fecha, notas,
              subtotal, impuestos, total,
              cliente_nombre, cliente_identificacion, cliente_direccion,
              order_items (
                producto_sku, producto_nombre,
                precio_unitario, impuesto_pct,
                cantidad, descuento_pct,
                stock_tienda, stock_resultante
              )
            `)
            .eq('id', realId)
            .single()

          if (fetchErr) throw fetchErr

          if (!mounted) return
          setOrder({
            kind: 'order',
            id: data.id,
            folio: data.folio || data.folio_local,
            fecha: data.fecha,
            notas: data.notas,
            subtotal: Number(data.subtotal),
            impuestos: Number(data.impuestos),
            total: Number(data.total),
            cliente_nombre: data.cliente_nombre,
            cliente_identificacion: data.cliente_identificacion,
            cliente_direccion: data.cliente_direccion,
            items: (data.order_items || []).map((i) => ({
              producto_sku: i.producto_sku,
              producto_nombre: i.producto_nombre,
              precio_unitario: Number(i.precio_unitario),
              impuesto_pct: Number(i.impuesto_pct),
              cantidad: Number(i.cantidad),
              descuento_pct: Number(i.descuento_pct),
              stock_tienda: i.stock_tienda == null ? null : Number(i.stock_tienda),
              stock_resultante: i.stock_resultante == null ? null : Number(i.stock_resultante)
            })),
            pending: false,
            hasError: false
          })
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Error al cargar el pedido')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [id, isDraft, realId, online])

  async function handleVerPDF() {
    if (!order) return
    setPdfBusy(true)
    try {
      const bytes = await obtenerPDFPedido({
        orderId: order.kind === 'order' ? order.id : null,
        draftClientUuid: order.kind === 'draft' ? order.client_uuid : null
      })
      if (bytes) abrirPDF(bytes)
      else alert('No se pudo obtener el PDF')
    } catch (err) {
      console.error(err)
      alert('Error al obtener el PDF: ' + (err.message || ''))
    } finally {
      setPdfBusy(false)
    }
  }

  async function handleDescargar() {
    if (!order) return
    setPdfBusy(true)
    try {
      const bytes = await obtenerPDFPedido({
        orderId: order.kind === 'order' ? order.id : null,
        draftClientUuid: order.kind === 'draft' ? order.client_uuid : null
      })
      if (bytes) await descargarPDF(bytes, `pedido-${order.folio}.pdf`)
      else alert('No se pudo obtener el PDF')
    } catch (err) {
      console.error(err)
      alert('Error al obtener el PDF: ' + (err.message || ''))
    } finally {
      setPdfBusy(false)
    }
  }

  async function handleCompartir() {
    if (!order) return
    setPdfBusy(true)
    try {
      const bytes = await obtenerPDFPedido({
        orderId: order.kind === 'order' ? order.id : null,
        draftClientUuid: order.kind === 'draft' ? order.client_uuid : null
      })
      if (!bytes) {
        alert('No se pudo obtener el PDF')
        return
      }
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const file = new File([blob], `pedido-${order.folio}.pdf`, { type: 'application/pdf' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Pedido ${order.folio}`,
          text: `Pedido para ${order.cliente_nombre}`
        })
      } else {
        await descargarPDF(bytes, `pedido-${order.folio}.pdf`)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err)
        alert('Error al compartir: ' + (err.message || ''))
      }
    } finally {
      setPdfBusy(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <Header title="Pedido" showBack subtitle="Cargando" />
        <div className="flex-1 flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </AppShell>
    )
  }

  if (error || !order) {
    return (
      <AppShell>
        <Header title="Pedido" showBack />
        <EmptyState
          title="No se pudo cargar"
          description={error || 'Pedido no disponible'}
          action={<Button onClick={() => navigate('/pedidos')}>Volver a mis pedidos</Button>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title={order.folio} subtitle="Pedido" showBack />

      {order.hasError && (
        <div className="mx-5 mt-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
          <b>Error al sincronizar:</b> {order.syncError}
        </div>
      )}

      {order.pending && !order.hasError && (
        <div className="mx-5 mt-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-3">
          Pedido guardado offline. Se sincronizará al recuperar conexión.
        </div>
      )}

      <div className="px-5 pt-5 pb-4">
        <p className="text-xs text-slate-500">{fmtFechaHora(order.fecha)}</p>
      </div>

      <div className="px-5 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Cliente
        </p>
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="font-semibold text-sm">{order.cliente_nombre}</p>
          {order.cliente_identificacion && (
            <p className="text-xs text-slate-500 mt-0.5">Cédula: {order.cliente_identificacion}</p>
          )}
          {order.cliente_direccion && (
            <p className="text-xs text-slate-500">{order.cliente_direccion}</p>
          )}
        </div>
      </div>

      {order.seller_nombre && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Vendedor
          </p>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="font-semibold text-sm">{order.seller_nombre}</p>
            {(order.seller_codigo || order.seller_zona) && (
              <p className="text-xs text-slate-500 mt-0.5">
                {[order.seller_codigo, order.seller_zona].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="px-5 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Productos ({order.items.length})
        </p>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {order.items.map((item, idx) => {
            const stockNum = item.stock_tienda == null ? null : Number(item.stock_tienda)
            const cantNum = Number(item.cantidad) || 0
            const stockResultante =
              item.stock_resultante != null
                ? Number(item.stock_resultante)
                : (stockNum != null ? stockNum + cantNum : null)

            return (
              <div
                key={`${item.producto_sku}-${idx}`}
                className={`px-4 py-3 ${
                  idx < order.items.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">
                      {item.producto_nombre}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.producto_sku} · {fmtCRCShort(item.precio_unitario)} c/u
                      {item.descuento_pct > 0 && (
                        <span className="ml-1 text-emerald-600 font-semibold">
                          −{item.descuento_pct}%
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm tabular-nums">×{item.cantidad}</p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {fmtCRCShort(item.precio_unitario * item.cantidad * (1 - (item.descuento_pct || 0) / 100))}
                    </p>
                  </div>
                </div>

                {(stockNum != null || stockResultante != null) && (
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                    {stockNum != null && (
                      <span>
                        Stock al visitar: <b className="text-slate-700">{stockNum}</b>
                      </span>
                    )}
                    {stockResultante != null && (
                      <span>
                        Quedó con: <b className="text-brand-700">{stockResultante}</b>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {order.notas && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Notas
          </p>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-700">{order.notas}</p>
          </div>
        </div>
      )}

      <div className="px-5 pb-5">
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold tabular-nums">{fmtCRC(order.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Impuestos</span>
            <span className="font-semibold tabular-nums">{fmtCRC(order.impuestos)}</span>
          </div>
          <div className="h-px bg-slate-200" />
          <div className="flex items-center justify-between">
            <span className="font-bold">Total</span>
            <span className="font-bold text-xl tabular-nums">{fmtCRC(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 space-y-2">
        <Button size="lg" className="w-full" onClick={handleCompartir} disabled={pdfBusy}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
          </svg>
          {pdfBusy ? 'Preparando…' : 'Compartir pedido'}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={handleVerPDF} disabled={pdfBusy}>
            Ver PDF
          </Button>
          <Button variant="outline" size="lg" onClick={handleDescargar} disabled={pdfBusy}>
            Descargar
          </Button>
        </div>
      </div>
    </AppShell>
  )
}