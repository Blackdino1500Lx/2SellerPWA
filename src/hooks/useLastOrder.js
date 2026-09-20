import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

export function useLastOrder(customerId) {
  return useLiveQuery(
    () => (customerId ? db.last_orders.get(customerId) : undefined),
    [customerId],
    undefined
  )
}