import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { supabase } from '../lib/supabase'
import { localDb } from '../lib/localDb'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ToastContext'

export const SyncContext = createContext(null)

const PING_TIMEOUT = 5000
const PING_RETRY_DELAY = 3000
const PING_MAX_ATTEMPTS = 5
const PERIODIC_PING_INTERVAL = 30000

export function SyncProvider({ children }) {
  const { profile } = useAuth()
  const { showToast } = useToast()

  const [online, setOnline] = useState(() => navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [pending, setPending] = useState(() => {
    try { return localDb.countDrafts() } catch { return 0 }
  })
  const [lastSyncAt, setLastSyncAt] = useState(null)

  const verifyingRef = useRef(false)
  const syncingRef = useRef(false)
  const initialDoneRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ---------- Ping real ----------
  const pingSupabase = useCallback(async () => {
    try {
      const result = await Promise.race([
        supabase.from('companies').select('id').limit(1),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('ping timeout')), PING_TIMEOUT)
        )
      ])
      if (result?.error) return false
      return true
    } catch {
      return false
    }
  }, [])

  // ---------- Sync de catálogo ----------
  const syncCatalog = useCallback(async () => {
    try {
      const [customersRes, productsRes, companyRes, sellerRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, nombre, identificacion, telefono, direccion, email, contacto, notas, activo, seller_id, updated_at')
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('products')
          .select('id, sku, nombre, precio, impuesto_pct, unidad, activo, updated_at')
          .eq('activo', true)
          .order('nombre'),
        supabase.from('companies').select('*').maybeSingle(),
        supabase.from('sellers').select('id, codigo, zona, users (nombre, email)').maybeSingle()
      ])

      if (customersRes.data) localDb.setCustomers(customersRes.data)
      if (productsRes.data) localDb.setProducts(productsRes.data)
      if (companyRes.data) localDb.setCompany(companyRes.data)
      if (sellerRes.data) localDb.setSeller(sellerRes.data)

      localDb.setSyncMeta({
        lastSyncCustomers: new Date().toISOString(),
        lastSyncProducts: new Date().toISOString()
      })
    } catch (err) {
      console.warn('syncCatalog error:', err)
    }
  }, [])

  // ---------- Sync de últimos pedidos ----------
  const syncLastOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_last_orders_for_seller')
      if (error) throw error

      if (Array.isArray(data)) {
        const map = {}
        for (const entry of data) {
          map[entry.customer_id] = {
            order_id: entry.order_id,
            folio: entry.folio,
            fecha: entry.fecha,
            notas: entry.notas,
            items: entry.items || []
          }
        }
        localDb.setLastOrders(map)
      }

      localDb.setSyncMeta({ lastSyncOrders: new Date().toISOString() })
    } catch (err) {
      console.warn('syncLastOrders error:', err)
    }
  }, [])

  // ---------- Sync de drafts ----------
  const syncDrafts = useCallback(async () => {
    const drafts = localDb.getDrafts()
    if (drafts.length === 0) return { ok: 0, failed: 0, total: 0 }

    const ordered = [...drafts].sort((a, b) =>
      (a.created_at || '').localeCompare(b.created_at || '')
    )

    let ok = 0
    let failed = 0

    for (const draft of ordered) {
      try {
        const itemsPayload = draft.items.map((i) => ({
          product_id: i.product_id,
          cantidad: i.cantidad,
          descuento_pct: i.descuento_pct || 0
        }))

        const { data: rpcResult, error: rpcErr } = await supabase.rpc('confirm_order', {
          p_customer_id: draft.customer_id,
          p_items: itemsPayload,
          p_client_uuid: draft.client_uuid,
          p_notas: draft.notas || null,
          p_folio_local: draft.folio_local
        })

        if (rpcErr) throw rpcErr

        localDb.setLastOrderFor(draft.customer_id, {
          order_id: rpcResult.order_id,
          folio: rpcResult.folio,
          fecha: draft.created_at,
          notas: draft.notas,
          items: draft.items
        })

        localDb.removeDraft(draft.client_uuid)
        ok++
      } catch (err) {
        console.warn('syncDraft error:', draft.client_uuid, err)
        failed++
      }
    }

    if (mountedRef.current) setPending(localDb.countDrafts())
    return { ok, failed, total: ordered.length }
  }, [])

  // ---------- Sync total ----------
  const syncAll = useCallback(
    async ({ silent = false } = {}) => {
      if (syncingRef.current) return
      if (!navigator.onLine) return
      if (!localStorage.getItem('pedidos.auth')) return

      syncingRef.current = true
      if (mountedRef.current) setSyncing(true)

      try {
        const alive = await pingSupabase()
        if (!alive) {
          if (mountedRef.current) setOnline(false)
          if (!silent) showToast({ type: 'warning', message: 'Sin conexión con el servidor' })
          return
        }

        if (mountedRef.current) setOnline(true)

        await syncCatalog()
        await syncLastOrders()
        const draftResult = await syncDrafts()

        if (mountedRef.current) setLastSyncAt(new Date().toISOString())

        if (draftResult.total === 0) {
          if (!silent) showToast({ type: 'success', message: 'Datos sincronizados' })
        } else if (draftResult.failed === 0) {
          showToast({
            type: 'success',
            message: `${draftResult.ok} pedido${draftResult.ok === 1 ? '' : 's'} sincronizado${draftResult.ok === 1 ? '' : 's'}`
          })
        } else {
          showToast({
            type: 'warning',
            message: `${draftResult.ok} de ${draftResult.total} sincronizados`,
            duration: 6000
          })
        }
      } catch (err) {
        console.error('syncAll error:', err)
      } finally {
        syncingRef.current = false
        if (mountedRef.current) setSyncing(false)
      }
    },
    [pingSupabase, syncCatalog, syncLastOrders, syncDrafts, showToast]
  )

  // ---------- Sync inicial: solo una vez por sesión logueada ----------
  useEffect(() => {
    if (!profile?.id) {
      initialDoneRef.current = false
      return
    }
    if (initialDoneRef.current) return
    if (!navigator.onLine) return

    initialDoneRef.current = true
    let cancelled = false

    async function initial() {
      const alive = await pingSupabase()
      if (cancelled || !mountedRef.current) return
      if (!alive) {
        setOnline(false)
        return
      }
      setOnline(true)
      await syncAll({ silent: true })
    }
    initial()
    return () => { cancelled = true }
  }, [profile?.id, pingSupabase, syncAll])

  // ---------- Eventos online/offline ----------
  useEffect(() => {
    function handleOnline() {
      if (verifyingRef.current) return
      verifyingRef.current = true
      let attempts = 0

      async function tryPing() {
        if (!mountedRef.current) {
          verifyingRef.current = false
          return
        }
        attempts++
        const alive = await pingSupabase()

        if (alive) {
          verifyingRef.current = false
          if (mountedRef.current) setOnline(true)
          showToast({
            type: 'info',
            message: 'Conexión restaurada · Sincronizando…',
            duration: 2500
          })
          setTimeout(() => syncAll({ silent: true }), 800)
        } else if (attempts < PING_MAX_ATTEMPTS) {
          setTimeout(tryPing, PING_RETRY_DELAY)
        } else {
          verifyingRef.current = false
          if (mountedRef.current) setOnline(false)
        }
      }
      tryPing()
    }

    function handleOffline() {
      setOnline(false)
      verifyingRef.current = false
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [pingSupabase, syncAll, showToast])

  // ---------- Ping periódico ----------
  useEffect(() => {
    const interval = setInterval(async () => {
      if (syncingRef.current || verifyingRef.current) return
      const alive = await pingSupabase()
      if (!mountedRef.current) return
      setOnline(alive)
      if (alive && localDb.countDrafts() > 0) {
        syncAll({ silent: true })
      }
    }, PERIODIC_PING_INTERVAL)

    return () => clearInterval(interval)
  }, [pingSupabase, syncAll])

  const value = {
    online,
    syncing,
    pending,
    lastSyncAt,
    syncNow: () => syncAll({ silent: false }),
    refreshPending: () => setPending(localDb.countDrafts())
  }

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync debe usarse dentro de <SyncProvider>')
  return ctx
}