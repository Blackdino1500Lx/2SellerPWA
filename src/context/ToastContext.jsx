import { createContext, useCallback, useContext, useState } from 'react'

export const ToastContext = createContext(null)

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ type = 'info', message, duration = 4000, action = null }) => {
      const id = nextId++
      const toast = { id, type, message, action }
      setToasts((prev) => [...prev, toast])
      if (duration > 0) {
        setTimeout(() => remove(id), duration)
      }
      return id
    },
    [remove]
  )

  const clearAll = useCallback(() => setToasts([]), [])

  return (
    <ToastContext.Provider value={{ showToast, clearAll }}>
      {children}
      <ToastStack toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

// ---------- UI ----------

const STYLES = {
  info:    { bg: 'bg-blue-600',    icon: 'ⓘ' },
  success: { bg: 'bg-emerald-600', icon: '✓' },
  warning: { bg: 'bg-amber-600',   icon: '⚠' },
  error:   { bg: 'bg-red-600',     icon: '✕' }
}

function ToastStack({ toasts, onRemove }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-3 left-3 right-3 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const s = STYLES[t.type] || STYLES.info
        return (
          <div
            key={t.id}
            className={`${s.bg} text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 pointer-events-auto animate-[toastIn_.2s_ease-out]`}
          >
            <span className="flex-shrink-0 font-bold text-lg leading-none">
              {s.icon}
            </span>
            <p className="flex-1 text-sm font-medium leading-tight">{t.message}</p>
            {t.action && (
              <button
                onClick={() => {
                  t.action.onClick?.()
                  onRemove(t.id)
                }}
                className="flex-shrink-0 text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-md active:bg-white/30"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => onRemove(t.id)}
              className="flex-shrink-0 text-white/70 hover:text-white text-sm"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}