import Dexie from 'dexie'

export const db = new Dexie('pedidos-pwa')

db.version(1).stores({
  customers:   'id, nombre, seller_id, updated_at',
  products:    'id, sku, nombre, activo, updated_at',
  last_orders: 'customer_id, order_id, fecha',
  drafts:      'client_uuid, customer_id, synced, created_at',
  meta:        'key'
})

db.version(2).stores({
  customers:   'id, nombre, seller_id, updated_at',
  products:    'id, sku, nombre, activo, updated_at',
  last_orders: 'customer_id, order_id, fecha',
  drafts:      'client_uuid, customer_id, synced, created_at',
  pdfs:        'client_uuid, created_at',
  meta:        'key'
})

export async function clearLocalData() {
  await Promise.all([
    db.customers.clear(),
    db.products.clear(),
    db.last_orders.clear(),
    db.drafts.clear(),
    db.pdfs.clear(),
    db.meta.clear()
  ])
}

// Limpieza de PDFs locales viejos
export async function cleanupOldPDFs(days = 7) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const old = await db.pdfs.where('created_at').below(cutoff).toArray()
  if (old.length) {
    await db.pdfs.bulkDelete(old.map((p) => p.client_uuid))
  }
  return old.length
}

// Limpieza de drafts ya sincronizados y viejos
export async function cleanupOldDrafts(days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const old = await db.drafts
    .filter((d) => d.synced === 1 && d.synced_at && d.synced_at < cutoff)
    .toArray()
  if (old.length) {
    await db.drafts.bulkDelete(old.map((d) => d.client_uuid))
  }
  return old.length
}