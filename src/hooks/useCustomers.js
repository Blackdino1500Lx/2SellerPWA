import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

export function useCustomers() {
  return useLiveQuery(
    () => db.customers.orderBy('nombre').toArray(),
    [],
    undefined
  )
}

export function useCustomer(id) {
  return useLiveQuery(
    () => (id ? db.customers.get(id) : undefined),
    [id],
    undefined
  )
}