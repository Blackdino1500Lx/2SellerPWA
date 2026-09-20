import { supabase } from './supabase'
import { db } from './db'

const CUSTOMER_FIELDS = 'id, nombre, identificacion, direccion, telefono, email, seller_id, activo, updated_at'
const PRODUCT_FIELDS  = 'id, sku, nombre, descripcion, precio, impuesto_pct, unidad, activo, updated_at'

async function setMeta(key, value) {
  await db.meta.put({ key, value })
}

export async function getMeta(key) {
  const row = await db.meta.get(key)
  return row?.value ?? null
}

// ============================================================
// Subir drafts pendientes (clientes sin red → servidor)
// ============================================================
export async function syncPendingDrafts() {
  const pending = await db.drafts.where('synced').equals(0).toArray()

  if (pending.length === 0) {
    return { total: 0, ok: 0, failed: 0, errors: [] }
  }

  const results = { total: pending.length, ok: 0, failed: 0, errors: [] }

  // Secuencial para no saturar el lock del correlativo en la empresa
  for (const draft of pending) {
    try {
      const items = (draft.order.items || []).map((i) => ({
        product_id: i.product_id,
        cantidad: i.cantidad,
        descuento_pct: i.descuento_pct || 0
      }))

      const { data: rpcResult, error: rpcErr } = await supabase.rpc('confirm_order', {
        p_customer_id: draft.customer_id,
        p_items: items,
        p_client_uuid: draft.client_uuid,
        p_notas: draft.order.notas || null,
        p_folio_local: draft.order.folio_local
      })

      if (rpcErr) throw rpcErr

      await db.drafts.update(draft.client_uuid, {
        synced: 1,
        synced_at: new Date().toISOString(),
        server_order_id: rpcResult.order_id,
        server_folio: rpcResult.folio,
        sync_error: null
      })

      // El PDF local ya no es necesario: el servidor tiene la versión canónica
      await db.pdfs.delete(draft.client_uuid)

      results.ok++
    } catch (err) {
      console.error('Error syncing draft', draft.client_uuid, err)
      await db.drafts.update(draft.client_uuid, {
        sync_error: err.message || 'Error desconocido',
        sync_attempted_at: new Date().toISOString()
      })
      results.failed++
      results.errors.push({
        draftId: draft.client_uuid,
        folio: draft.order.folio_local,
        message: err.message
      })
    }
  }

  return results
}

// ============================================================
// Clientes
// ============================================================
export async function syncCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select(CUSTOMER_FIELDS)
    .eq('activo', true)
    .order('nombre', { ascending: true })

  if (error) throw error

  await db.customers.clear()
  if (data?.length) await db.customers.bulkPut(data)
  await setMeta('customers_synced_at', new Date().toISOString())
  return data?.length ?? 0
}

// ============================================================
// Productos
// ============================================================
export async function syncProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_FIELDS)
    .eq('activo', true)
    .order('nombre', { ascending: true })

  if (error) throw error

  await db.products.clear()
  if (data?.length) await db.products.bulkPut(data)
  await setMeta('products_synced_at', new Date().toISOString())
  return data?.length ?? 0
}

// ============================================================
// Seller
// ============================================================
export async function syncSeller() {
  const { data, error } = await supabase
    .from('sellers')
    .select('id, codigo, zona, users (nombre, email)')
    .maybeSingle()

  if (error) throw error

  if (data) {
    await db.meta.put({
      key: 'seller',
      value: {
        id: data.id,
        codigo: data.codigo,
        zona: data.zona,
        nombre: data.users?.nombre ?? '',
        email: data.users?.email ?? ''
      }
    })
  }
  await setMeta('seller_synced_at', new Date().toISOString())
  return data ? 1 : 0
}

// ============================================================
// Company
// ============================================================
export async function syncCompany() {
  const { data, error } = await supabase
    .from('companies')
    .select('id, nombre, identificacion, direccion, telefono, email, logo_url, moneda, impuesto_default_pct, aplica_impuestos')
    .maybeSingle()

  if (error) throw error

  if (data) {
    await db.meta.put({ key: 'company', value: data })
  }
  await setMeta('company_synced_at', new Date().toISOString())
  return data ? 1 : 0
}

// ============================================================
// Últimos pedidos por cliente
// ============================================================
export async function syncLastOrders() {
  const { data, error } = await supabase.rpc('get_last_orders_for_seller')
  if (error) throw error

  const orders = Array.isArray(data) ? data : []

  // Clientes con drafts sin sincronizar: no pisar su último pedido local
  const pendingDrafts = await db.drafts.where('synced').equals(0).toArray().catch(() => [])
  const pendingCustomerIds = new Set(pendingDrafts.map((d) => d.customer_id))

  const rows = orders
    .filter((o) => !pendingCustomerIds.has(o.customer_id))
    .map((o) => ({
      customer_id: o.customer_id,
      order_id:    o.order_id,
      folio:       o.folio,
      folio_local: null,
      fecha:       o.fecha,
      notas:       o.notas ?? null,
      items:       o.items ?? [],
      updated_at:  new Date().toISOString()
    }))

  const existingIds = await db.last_orders.toCollection().primaryKeys()
  const toDelete = existingIds.filter((id) => !pendingCustomerIds.has(id))
  await db.last_orders.bulkDelete(toDelete)
  if (rows.length) await db.last_orders.bulkPut(rows)

  await setMeta('last_orders_synced_at', new Date().toISOString())
  return rows.length
}

// ============================================================
// Sync completo (drafts primero, luego el resto)
// ============================================================
export async function syncAll() {
  // 1. Subir drafts pendientes antes que nada
  const draftsResult = await syncPendingDrafts()

  // 2. Sync de catálogos y últimos pedidos
  const names = ['customers', 'products', 'seller', 'company', 'last_orders']
  const results = await Promise.allSettled([
    syncCustomers(),
    syncProducts(),
    syncSeller(),
    syncCompany(),
    syncLastOrders()
  ])

  const failures = results
    .map((r, i) => ({ r, name: names[i] }))
    .filter((x) => x.r.status === 'rejected')

  await setMeta('last_sync_at', new Date().toISOString())

  if (failures.length) {
    const mensajes = failures
      .map((f) => `${f.name}: ${f.r.reason?.message || f.r.reason}`)
      .join(' · ')
    throw new Error(mensajes)
  }

  return {
    drafts:      draftsResult,
    customers:   results[0].value,
    products:    results[1].value,
    seller:      results[2].value,
    company:     results[3].value,
    last_orders: results[4].value
  }
}

// ============================================================
// Estado de la caché
// ============================================================
export async function getCacheStatus() {
  const [customerCount, productCount, lastOrderCount, pendingCount, draftErrors, lastSync] =
    await Promise.all([
      db.customers.count(),
      db.products.count(),
      db.last_orders.count(),
      db.drafts.where('synced').equals(0).count().catch(() => 0),
      db.drafts.filter((d) => !!d.sync_error).count().catch(() => 0),
      getMeta('last_sync_at')
    ])

  return {
    customerCount,
    productCount,
    lastOrderCount,
    pendingCount,
    draftErrors,
    lastSync,
    hasData: customerCount > 0 || productCount > 0
  }
}