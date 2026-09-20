import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOnline } from '../hooks/useOnline'
import { useToast } from './ToastContext'
import { syncAll, getCacheStatus } from '../lib/sync'
import { clearLocalData, cleanupOldPDFs, cleanupOldDrafts } from '../lib/db'

const SyncContext = createContext(null)

export function SyncProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const online = useOnline()
  const { showToast } = useToast()

  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [status, setStatus] = useState({
    hasData: false,
    customerCount: 0,
    productCount: 0,
    lastOrderCount: 0,
    pendingCount: 0,
    draftErrors: 0
  })
  const [error, setError] = useState('')
  const [initialSyncDone, setInitialSyncDone] = useState(false)

  const wasAuthenticated = useRef(false)
  const initialSyncStarted = useRef(false)

  const refreshStatus = useCallback(async () => {
    const s = await getCacheStatus()
    setStatus(s)
    setLastSync(s.lastSync)
    return s
  }, [])

  const runSync = useCallback(
    async (isInitial = false) => {
      if (!online) {
        if (isInitial) setInitialSyncDone(true)
        return
      }
      if (syncing) return

      setSyncing(true)
      setError('')

      try {
        const result = await syncAll()
        await refreshStatus()

        // Notificar resultado de drafts si hubo algo
        const d = result?.drafts
        if (d && d.total > 0) {
          if (d.failed === 0) {
            showToast({
              type: 'success',
              message: d.total === 1
                ? 'Pedido sincronizado'
                : `${d.total} pedidos sincronizados`
            })
          } else if (d.ok === 0) {
            showToast({
              type: 'error',
              message: d.total === 1
                ? 'No se pudo sincronizar 1 pedido'
                : `No se pudieron sincronizar ${d.total} pedidos`,
              duration: 6000
            })
          } else {
            showToast({
              type: 'warning',
              message: `${d.ok} sincronizados, ${d.failed} con error`,
              duration: 6000
            })
          }
        }

        // Limpieza silenciosa de cachés viejos
        cleanupOldPDFs(7).catch(() => {})
        cleanupOldDrafts(30).catch(() => {})
      } catch (err) {
        console.error('Sync error:', err)
        setError(err.message || 'Error sincronizando')
        await refreshStatus()
      } finally {
        setSyncing(false)
        if (isInitial) setInitialSyncDone(true)
      }
    },
    [online, syncing, refreshStatus, showToast]
  )

  // Sync inicial al autenticarse
  useEffect(() => {
    if (isAuthenticated && !initialSyncStarted.current) {
      initialSyncStarted.current = true
      refreshStatus()
      if (online) {
        runSync(true)
      } else {
        setInitialSyncDone(true)
      }
    }
  }, [isAuthenticated, online, runSync, refreshStatus])

  // Al recuperar conexión: re-sync
  useEffect(() => {
    if (isAuthenticated && online && initialSyncStarted.current && initialSyncDone) {
      runSync(false)
    }
  }, [online]) // eslint-disable-line

  // Al cerrar sesión: limpiar
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      clearLocalData().then(() => {
        setStatus({
          hasData: false,
          customerCount: 0,
          productCount: 0,
          lastOrderCount: 0,
          pendingCount: 0,
          draftErrors: 0
        })
        setLastSync(null)
        setInitialSyncDone(false)
        initialSyncStarted.current = false
      })
    }
    wasAuthenticated.current = isAuthenticated
  }, [isAuthenticated])

  return (
    <SyncContext.Provider
      value={{
        syncing,
        lastSync,
        status,
        error,
        runSync,
        refreshStatus,
        hasData: status.hasData,
        initialSyncDone
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync debe usarse dentro de <SyncProvider>')
  return ctx
}