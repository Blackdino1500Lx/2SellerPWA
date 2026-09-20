import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

export function usePendingCount() {
  return useLiveQuery(
    () => db.drafts.where('synced').equals(0).count(),
    [],
    0
  )
}

export function useDraftsForCustomer(customerId) {
  return useLiveQuery(
    () =>
      customerId
        ? db.drafts.where('customer_id').equals(customerId).toArray()
        : [],
    [customerId],
    []
  )
}

export function useDraftPDF(clientUuid) {
  return useLiveQuery(
    () => (clientUuid ? db.pdfs.get(clientUuid) : undefined),
    [clientUuid],
    undefined
  )
}