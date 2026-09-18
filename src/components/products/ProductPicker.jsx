import { useEffect, useMemo, useState } from 'react'
import SearchInput from '../ui/SearchInput'

export default function ProductPicker({ open, onClose, products, onPick }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products.slice(0, 50)
    return products
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q)
      )
      .slice(0, 50)
  }, [products, query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative mt-auto bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-[slideUp_.2s_ease-out]">
        <div className="pt-3 pb-2 flex justify-center flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="px-5 pt-2 pb-3 flex-shrink-0">
          <h3 className="font-bold text-lg mb-3">Añadir producto</h3>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre o SKU…"
          />
        </div>

        <div className="px-5 overflow-y-auto pb-6">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-10">
              Sin resultados
            </p>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 py-3 border-b border-slate-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{p.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {p.sku} · ₡{Number(p.precio).toLocaleString('es-CR')}
                  </p>
                </div>
                <button
                  onClick={() => onPick(p)}
                  className="bg-brand-50 text-brand-700 font-semibold text-sm px-3 py-1.5 rounded-lg active:bg-brand-100"
                >
                  Añadir
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}