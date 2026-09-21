import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

export function useLastOrder(customerId) {
  return useLiveQuery(
    async () => {
      if (!customerId) return null
      const row = await db.last_orders.get(customerId)
      return row ?? null
    },
    [customerId],
    undefined // undefined = cargando, null = no existe, row = encontrado
  )
}