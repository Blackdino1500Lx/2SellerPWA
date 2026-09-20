import { supabase } from './supabase'
import { db } from './db'
import { generarPDFPedido } from './pdf'

// ============================================================
// Punto de entrada: obtener el PDF de un pedido.
// - Si es un draft local pendiente → lee de IndexedDB.
// - Si es un pedido del servidor → intenta Storage, si no, regenera.
// ============================================================
export async function obtenerPDFPedido({ orderId, draftClientUuid = null }) {
  // Caso 1: draft local
  if (draftClientUuid) {
    const row = await db.pdfs.get(draftClientUuid)
    if (row?.blob) {
      const buf = await row.blob.arrayBuffer()
      return new Uint8Array(buf)
    }
    return null
  }

  // Caso 2: pedido del servidor
  // 2a. Intentar descargar de Storage
  try {
    const { data: doc } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('order_id', orderId)
      .eq('tipo', 'pedido')
      .maybeSingle()

    if (doc?.storage_path) {
      const { data: blob, error } = await supabase.storage
        .from('documents')
        .download(doc.storage_path)

      if (!error && blob) {
        const buf = await blob.arrayBuffer()
        return new Uint8Array(buf)
      }
    }
  } catch (e) {
    console.warn('No se pudo descargar de Storage, se regenerará:', e)
  }

  // 2b. Regenerar desde order_items
  return await regenerarPDFDesdeServidor(orderId)
}

// ============================================================
// Regenerar el PDF a partir de los snapshots del servidor.
// ============================================================
async function regenerarPDFDesdeServidor(orderId) {
  const [orderRes, companyRes, sellerRes] = await Promise.all([
    supabase
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
      .eq('id', orderId)
      .single(),
    supabase
      .from('companies')
      .select('id, nombre, identificacion, direccion, telefono, email, logo_url')
      .maybeSingle(),
    supabase
      .from('sellers')
      .select('id, codigo, zona, users (nombre, email)')
      .maybeSingle()
  ])

  if (orderRes.error) throw orderRes.error

  const order = orderRes.data

  const bytes = await generarPDFPedido({
    pedido: {
      folio: order.folio || order.folio_local,
      fecha: order.fecha,
      notas: order.notas,
      subtotal: Number(order.subtotal),
      impuestos: Number(order.impuestos),
      total: Number(order.total),
      items: (order.order_items || []).map((i) => ({
        producto_sku: i.producto_sku,
        producto_nombre: i.producto_nombre,
        precio_unitario: Number(i.precio_unitario),
        impuesto_pct: Number(i.impuesto_pct),
        cantidad: Number(i.cantidad),
        descuento_pct: Number(i.descuento_pct)
      }))
    },
    empresa: companyRes.data || { nombre: 'Distribuidora' },
    cliente: {
      nombre: order.cliente_nombre,
      identificacion: order.cliente_identificacion,
      direccion: order.cliente_direccion
    },
    vendedor: {
      nombre: sellerRes.data?.users?.nombre || '',
      codigo: sellerRes.data?.codigo || '',
      zona: sellerRes.data?.zona || ''
    }
  })

  return bytes
}