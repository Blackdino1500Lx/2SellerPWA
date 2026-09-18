import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { localDb } from '../lib/localDb'
import { useAuth } from '../hooks/useAuth'
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
import { generarPDFPedido } from '../lib/pdf'

export default function OrderEditorPage() {
  const { id: customerId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { online, refreshPending } = useSync()

  const [customer, setCustomer] = useState(null)
  const [products, setProducts] = useState([])
  const [seller, setSeller] = useState(null)
  const [company, setCompany] = useState(null)
  const [lastOrder, setLastOrder] = useState(null)
  const [initialItems, setInitialItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [notas, setNotas] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const [clientUuid] = useState(() => uuid())

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError('')

      let cachedCustomer = null
      let cachedProducts = []
      let cachedLast = null
      let cachedSeller = null
      let cachedCompany = null

      try {
        cachedCustomer = localDb.getCustomer(customerId)
        cachedProducts = localDb.getProducts() || []
        cachedLast = localDb.getLastOrderFor(customerId)
        cachedSeller = localDb.getSeller()
        cachedCompany = localDb.getCompany()
      } catch (e) {
        console.warn('localDb read falló:', e)
      }

      if (cachedCustomer) {
        setCustomer(cachedCustomer)
        if (cachedLast) {
          setLastOrder(cachedLast)
          setInitialItems(cachedLast.items || [])
          setNotas(cachedLast.notas ?? '')
        }
        if (cachedProducts.length > 0) setProducts(cachedProducts)
        if (cachedSeller) setSeller(cachedSeller)
        if (cachedCompany) setCompany(cachedCompany)
        setLoading(false)
      }

      if (!navigator.onLine) {
        if (!cachedCustomer) {
          setError('Sin conexión y sin datos locales de este cliente')
        }
        setLoading(false)
        return
      }

      try {
        const [custRes, prodRes, lastRes, sellerRes, companyRes] = await Promise.all([
          supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
          supabase
            .from('products')
            .select('id, sku, nombre, precio, impuesto_pct')
            .eq('activo', true)
            .order('nombre'),
          supabase
            .from('orders')
            .select(`
              id, folio, folio_local, fecha, notas,
              order_items (
                product_id, producto_nombre, producto_sku,
                precio_unitario, impuesto_pct,
                cantidad, descuento_pct
              )
            `)
            .eq('customer_id', customerId)
            .eq('anulado', false)
            .order('fecha', { ascending: false })
            .maybeSingle(),
          supabase
            .from('sellers')
            .select('id, codigo, zona, users (nombre, email)')
            .maybeSingle(),
          supabase.from('companies').select('*').maybeSingle()
        ])

        if (!mounted) return

        if (custRes.error || !custRes.data) {
          if (!cachedCustomer) {
            setError('Cliente no encontrado')
            setLoading(false)
            return
          }
        } else {
          setCustomer(custRes.data)
        }

        if (prodRes.data && prodRes.data.length > 0) setProducts(prodRes.data)
        if (sellerRes.data) setSeller(sellerRes.data)
        if (companyRes.data) setCompany(companyRes.data)

        if (lastRes.data) {
          const remoteLast = {
            order_id: lastRes.data.id,
            folio: lastRes.data.folio || lastRes.data.folio_local,
            fecha: lastRes.data.fecha,
            notas: lastRes.data.notas,
            items: lastRes.data.order_items || []
          }
          setLastOrder(remoteLast)
          setInitialItems(remoteLast.items)
          setNotas(remoteLast.notas ?? '')
        } else if (!cachedLast) {
          setLastOrder(null)
          setInitialItems([])
        }
      } catch (err) {
        console.warn('Refresh desde red falló, usando cache:', err)
        if (!cachedCustomer) setError('Error al cargar cliente')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [customerId])

  const editor = useOrderEditor(initialItems)

  const historicalItems = useMemo(
    () => editor.items.filter((i) => !i.isNew),
    [editor.items]
  )
  const newItems = useMemo(
    () => editor.items.filter((i) => i.isNew),
    [editor.items]
  )

  function construirSnapshotsPDF(folioFinal, fechaFinal) {
    const empresaPDF = company || localDb.getCompany() || {
      nombre: 'Distribuidora',
      identificacion: '',
      direccion: ''
    }
    const vendedorPDF = {
      nombre: seller?.users?.nombre || profile?.nombre || 'Vendedor',
      codigo: seller?.codigo || '',
      zona: seller?.zona || ''
    }
    const clientePDF = {
      nombre: customer.nombre,
      identificacion: customer.identificacion,
      direccion: customer.direccion
    }
    const pedidoPDF = {
      folio: folioFinal,
      fecha: fechaFinal,
      notas: notas || null,
      subtotal: editor.totals.subtotal,
      impuestos: editor.totals.impuestos,
      total: editor.totals.total,
      items: editor.items.map((i) => ({
        producto_sku: i.producto_sku,
        producto_nombre: i.producto_nombre,
        precio_unitario: i.precio_unitario,
        impuesto_pct: i.impuesto_pct,
        cantidad: i.cantidad,
        descuento_pct: i.descuento_pct
      }))
    }
    return { pedidoPDF, empresaPDF, clientePDF, vendedorPDF }
  }

  async function confirmarOffline() {
    const createdAt = new Date().toISOString()
    const folioLocal = `LOCAL-${Date.now().toString(36).toUpperCase()}`

    const draft = {
      client_uuid: clientUuid,
      customer_id: customerId,
      customer_nombre: customer.nombre,
      items: editor.items.map((i) => ({
        product_id: i.product_id,
        producto_nombre: i.producto_nombre,
        producto_sku: i.producto_sku,
        precio_unitario: i.precio_unitario,
        impuesto_pct: i.impuesto_pct,
        cantidad: i.cantidad,
        descuento_pct: i.descuento_pct
      })),
      notas: notas || null,
      folio_local: folioLocal,
      created_at: createdAt,
      subtotal: editor.totals.subtotal,
      impuestos: editor.totals.impuestos,
      total: editor.totals.total,
      synced: false
    }

    try {
      localDb.addDraft(draft)
    } catch (e) {
      console.error('No se pudo guardar draft:', e)
      setConfirmError('No se pudo guardar el pedido offline')
      return
    }

    // Actualizar lastOrder local para que el próximo pedido ya lo vea
    try {
      localDb.setLastOrderFor(customerId, {
        order_id: null,
        folio: folioLocal,
        fecha: createdAt,
        notas: notas || null,
        items: draft.items
      })
    } catch (e) {
      console.warn('No se pudo actualizar lastOrders:', e)
    }

    refreshPending()

    // Generar PDF con datos locales
    let pdfBytes = null
    try {
      const { pedidoPDF, empresaPDF, clientePDF, vendedorPDF } =
        construirSnapshotsPDF(folioLocal, createdAt)
      pdfBytes = await generarPDFPedido({
        pedido: pedidoPDF,
        empresa: empresaPDF,
        cliente: clientePDF,
        vendedor: vendedorPDF
      })
    } catch (pdfErr) {
      console.error('Error generando PDF offline:', pdfErr)
    }

    navigate('/pedido/confirmado', {
      replace: true,
      state: {
        result: {
          folio: folioLocal,
          subtotal: editor.totals.subtotal,
          impuestos: editor.totals.impuestos,
          total: editor.totals.total,
          duplicate: false,
          offline: true
        },
        pdfBytes,
        customerNombre: customer.nombre,
        fecha: createdAt
      }
    })
  }

  async function confirmarOnline() {
    const itemsPayload = editor.items.map((i) => ({
      product_id: i.product_id,
      cantidad: i.cantidad,
      descuento_pct: i.descuento_pct || 0
    }))

    const folioLocal = `LOCAL-${Date.now().toString(36).toUpperCase()}`

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
          cantidad, descuento_pct
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
        descuento_pct: Number(i.descuento_pct)
      }))
    }

    const clientePDF = {
      nombre: savedOrder.cliente_nombre || customer.nombre,
      identificacion: savedOrder.cliente_identificacion || customer.identificacion,
      direccion: savedOrder.cliente_direccion || customer.direccion
    }

    const vendedorPDF = {
      nombre: seller?.users?.nombre || profile?.nombre || 'Vendedor',
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

    try {
      localDb.setLastOrderFor(customerId, {
        order_id: savedOrder.id,
        folio: savedOrder.folio || savedOrder.folio_local,
        fecha: savedOrder.fecha,
        notas: savedOrder.notas,
        items: pedidoPDF.items
      })
    } catch (e) {
      console.warn('No se pudo actualizar cache lastOrders:', e)
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
          duplicate: rpcResult.duplicate || false,
          offline: false
        },
        pdfBytes,
        customerNombre: customer.nombre,
        fecha: savedOrder.fecha
      }
    })
  }

  async function handleConfirm() {
    if (editor.items.length === 0 || confirming) return
    setConfirmError('')
    setConfirming(true)

    try {
      if (!online) {
        await confirmarOffline()
      } else {
        await confirmarOnline()
      }
    } catch (err) {
      console.error('Error confirmando pedido:', err)
      setConfirmError(err.message || 'Error al confirmar el pedido')
    } finally {
      setConfirming(false)
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

  if (error || !customer) {
    return (
      <AppShell>
        <Header title="Pedido" showBack />
        <EmptyState
          title="No se pudo cargar"
          description={error || 'Cliente no disponible'}
          action={<Button onClick={() => navigate('/')}>Volver a clientes</Button>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title={customer.nombre} subtitle="Nuevo pedido" showBack />

      {!online && (
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.2" strokeLinecap="round">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
          </svg>
          <p className="text-xs text-amber-800">
            Trabajando offline · El pedido se guardará localmente
          </p>
        </div>
      )}

      {lastOrder ? (
        <div className="px-5 py-3 bg-brand-50 border-b border-brand-100 flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <p className="text-xs text-brand-800">
            Precargado desde <b>{lastOrder.folio}</b> del {fmtFecha(lastOrder.fecha)}
          </p>
        </div>
      ) : (
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p className="text-xs text-slate-600">
            Cliente sin pedidos previos. Añade productos para comenzar.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-4">
        {historicalItems.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
              Del último pedido
            </p>
            {historicalItems.map((item) => (
              <OrderItemRow
                key={item.product_id}
                item={item}
                onChangeQty={editor.changeQty}
                onRemove={editor.removeItem}
              />
            ))}
          </div>
        )}

        {newItems.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
              Añadidos
            </p>
            {newItems.map((item) => (
              <OrderItemRow
                key={item.product_id}
                item={item}
                onChangeQty={editor.changeQty}
                onRemove={editor.removeItem}
              />
            ))}
          </div>
        )}

        <div className="px-4 pt-4">
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 active:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Añadir producto del catálogo
          </button>
        </div>

        <div className="px-4 pt-4">
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
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
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