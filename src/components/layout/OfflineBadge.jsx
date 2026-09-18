import { useSync } from '../../context/SyncContext'

export default function OfflineBadge() {
  const { online, syncing, pending, syncNow } = useSync()

  // Caso 1: online, sin pendientes, sin sync → no muestra nada
  if (online && pending === 0 && !syncing) return null

  // Caso 2: sincronizando
  if (syncing) {
    return (
      <div className="mx-5 mt-3 flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-lg">
        <span className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin flex-shrink-0" />
        <span>
          <b>Sincronizando</b>
          {pending > 0 && ` · ${pending} pendiente${pending === 1 ? '' : 's'}`}
        </span>
      </div>
    )
  }

  // Caso 3: online pero con pendientes (fallo de sync previo)
  if (online && pending > 0) {
    return (
      <div className="mx-5 mt-3 flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <span className="flex-1">
          <b>{pending} pedido{pending === 1 ? '' : 's'} pendiente{pending === 1 ? '' : 's'}</b>
        </span>
        <button
          onClick={syncNow}
          className="bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md active:bg-amber-700"
        >
          Sincronizar
        </button>
      </div>
    )
  }

  // Caso 4: offline
  return (
    <div className="mx-5 mt-3 flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
      </svg>
      <span className="flex-1">
        <b>Sin conexión</b>
        {pending > 0 && ` · ${pending} pedido${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'}`}
      </span>
    </div>
  )
}