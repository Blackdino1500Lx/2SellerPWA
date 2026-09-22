import { db } from './db'

export async function saveDraft({ clientUuid, customerId, order, pdfBlob }) {
  // Calcular stock_resultante por item (para que el draft local sea consistente)
  const itemsConResultante = (order.items || []).map((i) => ({
    ...i,
    stock_resultante:
      i.stock_tienda == null ? null : Number(i.stock_tienda) + Number(i.cantidad || 0)
  }))

  const orderCompleto = { ...order, items: itemsConResultante }

  await db.transaction('rw', db.drafts, db.pdfs, db.last_orders, async () => {
    await db.drafts.put({
      client_uuid: clientUuid,
      customer_id: customerId,
      order: orderCompleto,
      synced: 0,
      created_at: new Date().toISOString(),
      synced_at: null,
      server_order_id: null,
      server_folio: null
    })

    if (pdfBlob) {
      await db.pdfs.put({
        client_uuid: clientUuid,
        blob: pdfBlob,
        created_at: new Date().toISOString()
      })
    }

    await db.last_orders.put({
      customer_id: customerId,
      order_id: clientUuid,
      folio: order.folio_local,
      folio_local: order.folio_local,
      fecha: order.fecha,
      notas: order.notas ?? null,
      items: itemsConResultante,
      updated_at: new Date().toISOString(),
      is_local_draft: true
    })
  })
}

export async function getDraft(clientUuid) {
  return db.drafts.get(clientUuid)
}

export async function getPDF(clientUuid) {
  return db.pdfs.get(clientUuid)
}

export async function getDraftsForCustomer(customerId) {
  return db.drafts
    .where('customer_id').equals(customerId)
    .reverse()
    .sortBy('created_at')
}

export async function getPendingDrafts() {
  return db.drafts.where('synced').equals(0).toArray()
}

export async function deleteDraft(clientUuid) {
  await db.transaction('rw', db.drafts, db.pdfs, async () => {
    await db.drafts.delete(clientUuid)
    await db.pdfs.delete(clientUuid)
  })
}