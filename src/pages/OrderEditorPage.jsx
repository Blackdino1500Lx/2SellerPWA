import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useOnline } from '../hooks/useOnline'
import { useCustomer } from '../hooks/useCustomers'
import { useProducts } from '../hooks/useProducts'
import { useLastOrder } from '../hooks/useLastOrder'
import { useSync } from '../context/SyncContext'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import OrderItemRow from '../components/orders/OrderItemRow'
import OrderTotals from '../components/orders/OrderTotals'
import ProductPicker from '../components/products/ProductPicker'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { useOrderEditor } from '../hooks/useOrderEditor'
import { fmtFecha } from '../lib/format'
import { uuid } from '../lib/uuid'
import { generarPDFPedido, pdfBlob } from '../lib/pdf'
import { makeLocalFolio } from '../lib/device'
import { saveDraft } from '../lib/drafts'
import { getMeta } from '../lib/sync'

export default function OrderEditorPage() {
  const { id: customerId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const online = useOnline()
  const { refreshStatus } = useSync()

  const customer = useCustomer(customerId)
  const products = useProducts()
  const lastOrder = useLastOrder(customerId)

  const [seller, setSeller] = useState(null)
  const [company, setCompany] = useState(null)
  const [metaLoaded, setMetaLoaded] = useState(false)
  const [notas, setNotas] = useState('')
  const [notasInitialized, setNotasInitialized] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const [clientUuid] = useState(() => uuid())

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const [cachedSeller, cachedCompany] = await Promise.all([
        getMeta('seller'),
        getMeta('company')
      ])
      if (!mounted) return
      setSeller(cachedSeller)
      setCompany(cachedCompany)
      setMetaLoaded(true)
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (lastOrder && !notasInitialized) {
      setNotas(lastOrder.notas ?? '')
      setNotasInitialized(true)
    }
  }, [lastOrder, notasInitialized])

  const initialItems = useMemo(
    () => (lastOrder === undefined ? undefined : (lastOrder?.items ?? [])),
    [lastOrder]
  )

  const editor = useOrderEditor(initialItems)

  const historicalItems = useMemo(
    () => editor.items.filter((i) => !i.isNew),
    [editor.items]
  )
  const newItems = useMemo(
    () => editor.items.filter((i) => i.isNew),
    [editor.items]
  )

  function buildLocalOrder(folioLocal) {
    return {
      folio_local: folioLocal,
      fecha: new Date().toISOString(),
      notas: notas || null,
      subtotal: editor.totals.subtotal,
      impuestos: editor.totals.impuestos,
      total: editor.totals.total,
      cliente_nombre: customer?.nombre ?? '',
      cliente_identificacion: customer?.identificacion ?? '',
      cliente_direccion: customer?.direccion ?? '',
      seller_nombre: seller?.nombre ?? profile?.nombre ?? 'Vendedor',
      seller_codigo: seller?.codigo ?? '',
      seller_zona: seller?.zona ?? '',
      company_id: company?.id ?? null,
      company_nombre: company?.nombre ?? 'Distribuidora',
      company_identificacion: company?.identificacion ?? '',
      company_direccion: company?.direccion ?? '',
      items: (savedOrder.order_items || []).map((i) => ({
  producto_sku: i.producto_sku,
  producto_nombre: i.producto_nombre,
  precio_unitario: Number(i.precio_unitario),
  impuesto_pct: Number(i.impuesto_pct),
  cantidad: Number(i.cantidad),
  descuento_pct: Number(i.descuento_pct),
  stock_tienda: i.stock_tienda == null ? null : Number(i.stock_tienda),
  stock_resultante: i.stock_resultante == null ? null : Number(i.stock_resultante)
}))
    }
  }

  function buildPDFInputs(order) {
    return {
      pedido: {
        folio: order.folio_local,
        fecha: order.fecha,
        notas: order.notas,
        subtotal: order.subtotal,
        impuestos: order.impuestos,
        total: order.total,
        items: order.items
      },
      empresa: {
        nombre: order.company_nombre,
        identificacion: order.company_identificacion,
        direccion: order.company_direccion
      },
      cliente: {
        nombre: order.cliente_nombre,
        identificacion: order.cliente_identificacion,
        direccion: order.cliente_direccion
      },
      vendedor: {
        nombre: order.seller_nombre,
        codigo: order.seller_codigo,
        zona: order.seller_zona
      }
    }
  }

  async function handleConfirmOnline() {
    const itemsPayload = editor.itemsToOrder.map((i) => ({
      product_id: i.product_id,
      cantidad: i.cantidad,
      descuento_pct: i.descuento_pct || 0,
      stock_tienda: i.stock_tienda
    }))

    const folioLocal = makeLocalFolio()

    const { data: rpcResult, error: rpcErr } = await supabase.rpc('confirm_order', {
      p_customer_id: customerId,
      p_items: itemsPayload,
      p_client_uuid: clientUuid,
      p_notas: notas || null,
      p_folio_local: folioLocal
    })

    if (rpcErr) throw rpcErr

    const { data: savedOrder, error: fetchErr } = await supabase
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
      .eq('id', rpcResult.order_id)
      .single()

    if (fetchErr) throw fetchErr

    const pedidoPDF = {
      folio: savedOrder.folio || savedOrder.folio_local,
      fecha: savedOrder.fecha,
      notas: savedOrder.notas,
      subtotal: Number(savedOrder.subtotal),
      impuestos: Number(savedOrder.impuestos),
      total: Number(savedOrder.total),
      items: (savedOrder.order_items || []).map((i) => ({
        producto_sku: i.producto_sku,
        producto_nombre: i.producto_nombre,
        precio_unitario: Number(i.precio_unitario),
        impuesto_pct: Number(i.impuesto_pct),
        cantidad: Number(i.cantidad),
        descuento_pct: Number(i.descuento_pct),
        stock_tienda: i.stock_tienda == null ? null : Number(i.stock_tienda)
      }))
    }

    const clientePDF = {
      nombre: savedOrder.cliente_nombre || customer?.nombre,
      identificacion: savedOrder.cliente_identificacion || customer?.identificacion,
      direccion: savedOrder.cliente_direccion || customer?.direccion
    }

    const vendedorPDF = {
      nombre: seller?.nombre || profile?.nombre || 'Vendedor',
      codigo: seller?.codigo || '',
      zona: seller?.zona || ''
    }

    const empresaPDF = company || {
      nombre: 'Distribuidora',
      identificacion: '',
      direccion: ''
    }

    let pdfBytes = null
    try {
      pdfBytes = await generarPDFPedido({
        pedido: pedidoPDF,
        empresa: empresaPDF,
        cliente: clientePDF,
        vendedor: vendedorPDF
      })

      try {
        const path = `${company?.id || 'default'}/${savedOrder.id}.pdf`
        const { error: upErr } = await supabase.storage
          .from('documents')
          .upload(path, new Blob([pdfBytes], { type: 'application/pdf' }), {
            contentType: 'application/pdf',
            upsert: true
          })
        if (upErr) console.warn('No se pudo subir el PDF a Storage:', upErr)

        if (!upErr) {
          await supabase.from('documents').insert({
            order_id: savedOrder.id,
            company_id: company?.id,
            tipo: 'pedido',
            storage_path: path,
            generado_offline: false
          })
        }
      } catch (storageErr) {
        console.warn('Storage falló, se continúa sin subir:', storageErr)
      }
    } catch (pdfErr) {
      console.error('Error generando PDF:', pdfErr)
    }

    navigate('/pedido/confirmado', {
      replace: true,
      state: {
        result: {
          order_id: rpcResult.order_id,
          folio: rpcResult.folio,
          subtotal: Number(savedOrder.subtotal),
          impuestos: Number(savedOrder.impuestos),
          total: Number(savedOrder.total),
          duplicate: rpcResult.duplicate || false
        },
        pdfBytes,
        customerNombre: customer?.nombre,
        fecha: savedOrder.fecha,
        offline: false
      }
    })
  }

  async function handleConfirmOffline() {
    const folioLocal = makeLocalFolio()
    const order = buildLocalOrder(folioLocal)
    const pdfInputs = buildPDFInputs(order)

    let pdfBytes = null
    try {
      pdfBytes = await generarPDFPedido(pdfInputs)
    } catch (pdfErr) {
      console.error('Error generando PDF offline:', pdfErr)
      throw new Error('No se pudo generar el PDF del pedido')
    }

    const blob = pdfBlob(pdfBytes)

    await saveDraft({
      clientUuid,
      customerId,
      order,
      pdfBlob: blob
    })

    await refreshStatus()

    navigate('/pedido/confirmado', {
      replace: true,
      state: {
        result: {
          order_id: clientUuid,
          folio: folioLocal,
          subtotal: order.subtotal,
          impuestos: order.impuestos,
          total: order.total,
          duplicate: false,
          pending: true
        },
        pdfBytes,
        customerNombre: customer?.nombre,
        fecha: order.fecha,
        offline: true
      }
    })
  }

  async function handleConfirm() {
    if (editor.itemsToOrder.length === 0) {
      setConfirmError('Debes indicar al menos un producto en "Pedido nuevo"')
      return
    }
    if (confirming) return
    setConfirmError('')
    setConfirming(true)

    try {
      if (online) {
        await handleConfirmOnline()
      } else {
        await handleConfirmOffline()
      }
    } catch (err) {
      console.error('Error confirmando pedido:', err)
      setConfirmError(err.message || 'Error al confirmar el pedido')
    } finally {
      setConfirming(false)
    }
  }

  const loading =
    customer === undefined ||
    products === undefined ||
    lastOrder === undefined ||
    !metaLoaded

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

  if (!customer) {
    return (
      <AppShell>
        <Header title="Pedido" showBack />
        <EmptyState
          title="Cliente no disponible"
          description="No se encontró en la caché local."
          action={<Button onClick={() => navigate('/')}>Volver a clientes</Button>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title={customer.nombre} subtitle="Nuevo pedido" showBack />

      {lastOrder ? (
        <div className="px-5 md:px-8 py-3 bg-brand-50 border-b border-brand-100 flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <p className="text-xs text-brand-800">
            Precargado desde <b>{lastOrder.folio}</b> del {fmtFecha(lastOrder.fecha)}
          </p>
        </div>
      ) : (
        <div className="px-5 md:px-8 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p className="text-xs text-slate-600">
            Cliente sin pedidos previos. Añade productos para comenzar.
          </p>
        </div>
      )}

      {!online && (
        <div className="px-5 md:px-8 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
          </svg>
          <p className="text-xs text-amber-800">
            Trabajando sin conexión. El pedido se guardará localmente.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-4">
        {historicalItems.length > 0 && (
          <div className="px-4 md:px-8 pt-4 md:pt-6 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 px-1">
              Del último pedido
            </p>
            {historicalItems.map((item) => (
              <OrderItemRow
                key={item.product_id}
                item={item}
                onChangeQty={editor.changeQty}
                onChangeStock={editor.changeStock}
              />
            ))}
          </div>
        )}

        {newItems.length > 0 && (
          <div className="px-4 md:px-8 pt-4 md:pt-6 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 px-1">
              Añadidos
            </p>
            {newItems.map((item) => (
              <OrderItemRow
                key={item.product_id}
                item={item}
                onChangeQty={editor.changeQty}
                onChangeStock={editor.changeStock}
              />
            ))}
          </div>
        )}

        <div className="px-4 md:px-8 pt-4 md:pt-6">
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 md:py-4 flex items-center justify-center gap-2 text-sm md:text-base font-semibold text-slate-600 active:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Añadir producto del catálogo
          </button>
        </div>

        <div className="px-4 md:px-8 pt-4 md:pt-6">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 px-1">
            Notas (opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            placeholder="Instrucciones de entrega, observaciones…"
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-none"
          />
        </div>

        {confirmError && (
          <div className="mx-4 md:mx-8 mt-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
            {confirmError}
          </div>
        )}

        <div className="h-4" />
      </div>

      <OrderTotals
        totals={editor.totals}
        onConfirm={handleConfirm}
        disabled={confirming}
      />

      {confirming && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-slate-600">
            {online ? 'Confirmando pedido…' : 'Guardando offline…'}
          </p>
        </div>
      )}

      <ProductPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        products={products}
        onPick={(p) => {
          editor.addItem(p)
          setPickerOpen(false)
        }}
      />
    </AppShell>
  )
}