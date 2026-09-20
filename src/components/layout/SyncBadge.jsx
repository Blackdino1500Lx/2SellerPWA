import { useSync } from '../../context/SyncContext'
import { useOnline } from '../../hooks/useOnline'
import { usePendingCount } from '../../hooks/useDrafts'

export default function SyncBadge() {
  const online = useOnline()
  const { syncing, error, hasData, lastSync } = useSync()
  const pending = usePendingCount()

  // 1. Error de sync
  if (error && online) {
    return (
      <Badge color="red" icon="error">
        Error al sincronizar: {error.slice(0, 60)}
      </Badge>
    )
  }

  // 2. Sincronizando
  if (syncing) {
    return (
      <Badge color="blue" icon="spinner">
        Sincronizando datos…
      </Badge>
    )
  }

  // 3. Offline con pendientes
  if (!online && pending > 0) {
    return (
      <Badge color="amber" icon="offline">
        <b>Sin conexión</b> · {pending} pedido{pending === 1 ? '' : 's'} pendiente{pending === 1 ? '' : 's'}
      </Badge>
    )
  }

  // 4. Offline sin pendientes
  if (!online) {
    return (
      <Badge color="amber" icon="offline">
        <b>Sin conexión</b>
        {!hasData && ' · Sin datos en caché'}
      </Badge>
    )
  }

  // 5. Online con pendientes (esperando próxima sincronización)
  if (pending > 0) {
    return (
      <Badge color="amber" icon="pending">
        {pending} pedido{pending === 1 ? '' : 's'} sin sincronizar
      </Badge>
    )
  }

  // 6. Online, todo al día (badge discreto)
  if (hasData && lastSync) {
    return (
      <Badge color="green" icon="check">
        Todo sincronizado
      </Badge>
    )
  }

  return null
}

function Badge({ color, icon, children }) {
  const colors = {
    blue:  'bg-brand-50 border-brand-100 text-brand-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red:   'bg-red-50 border-red-200 text-red-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700'
  }
  return (
    <div
      className={`mx-5 mt-3 flex items-center gap-2 text-xs border px-3 py-2 rounded-lg ${colors[color]}`}
    >
      {icon === 'spinner' && (
        <span className="w-3 h-3 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin flex-shrink-0" />
      )}
      {icon === 'offline' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="flex-shrink-0">
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
        </svg>
      )}
      {icon === 'check' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
      {icon === 'pending' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="flex-shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )}
      {icon === 'error' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="flex-shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      )}
      <span className="truncate">{children}</span>
    </div>
  )
}