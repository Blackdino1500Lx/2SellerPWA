import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

export function useProducts() {
  return useLiveQuery(
    () => db.products.orderBy('nombre').toArray(),
    [],
    undefined
  )
}