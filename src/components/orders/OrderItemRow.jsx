import { fmtCRCShort } from '../../lib/format'

export default function OrderItemRow({
  item,
  onChangeQty,
  onChangeStock
}) {
  // Variante 1: producto nuevo
  if (item.isNew) {
    return (
      <div className="py-4 md:py-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-sm md:text-base leading-tight">
                {item.producto_nombre}
              </p>
              <span className="text-[9px] font-bold text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded">
                NUEVO
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              {fmtCRCShort(item.precio_unitario)} c/u
            </p>
          </div>
        </div>

        <div>
          <label className="text-[10px] md:text-xs text-slate-500 block mb-1.5">
            Cantidad a pedir
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={item.cantidad || ''}
            onChange={(e) => onChangeQty(item.product_id, e.target.value)}
            placeholder="0"
            className="w-full border border-slate-300 rounded-xl px-4 py-3 md:py-3.5 text-left text-base md:text-lg font-bold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 tabular-nums"
          />
        </div>
      </div>
    )
  }

  // Variante 2: producto del historial
  const stockAnterior = item.stockAnterior ?? 0
  const stockActual = item.stock_tienda ?? ''
  const pedidoNuevo = item.cantidad || ''

  const stockNum = item.stock_tienda == null ? null : Number(item.stock_tienda)
  const cantNum = Number(item.cantidad) || 0
  const mostrarResultante = stockNum != null && cantNum > 0
  const stockResultante = mostrarResultante ? stockNum + cantNum : null

  return (
    <div className="py-4 md:py-5 border-b border-slate-100">
      <div className="mb-3">
        <p className="font-semibold text-sm md:text-base leading-tight">
          {item.producto_nombre}
        </p>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          {fmtCRCShort(item.precio_unitario)} c/u
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {/* Stock anterior (con cuánto quedó la última visita) */}
        <div>
          <label className="text-[10px] md:text-xs text-slate-500 block mb-1.5 text-center">
            Stock anterior
          </label>
          <div className="w-full border border-slate-200 bg-slate-50 rounded-xl px-2 py-2.5 md:py-3 text-center text-sm md:text-base font-semibold text-slate-600 tabular-nums">
            {stockAnterior}
          </div>
        </div>

        {/* Stock actual */}
        <div>
          <label
            className={`text-[10px] md:text-xs block mb-1.5 text-center ${
              item.stockSuggested ? 'text-amber-700 font-semibold' : 'text-slate-500'
            }`}
          >
            Stock actual
            {item.stockSuggested && ' *'}
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={stockActual}
            onChange={(e) => onChangeStock(item.product_id, e.target.value)}
            placeholder="0"
            className={`w-full border rounded-xl px-2 py-2.5 md:py-3 text-center text-sm md:text-base font-semibold outline-none tabular-nums ${
              item.stockSuggested
                ? 'border-amber-300 bg-amber-50 text-amber-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                : 'border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'
            }`}
          />
        </div>

        {/* Pedido nuevo */}
        <div>
          <label className="text-[10px] md:text-xs text-brand-700 font-bold block mb-1.5 text-center">
            Pedido nuevo
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={pedidoNuevo}
            onChange={(e) => onChangeQty(item.product_id, e.target.value)}
            placeholder="0"
            className={`w-full border rounded-xl px-2 py-2.5 md:py-3 text-center text-sm md:text-base font-bold outline-none tabular-nums transition ${
              item.cantidad > 0
                ? 'border-brand-500 bg-brand-50 text-brand-800 focus:ring-2 focus:ring-brand-100'
                : 'border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'
            }`}
          />
        </div>
      </div>

      {item.stockSuggested && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-amber-700">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>Sugerido del pedido anterior. Verifícalo.</span>
        </div>
      )}

      {mostrarResultante && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-brand-700">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span>
            Quedará con <b className="tabular-nums">{stockResultante}</b> en tienda
          </span>
        </div>
      )}
    </div>
  )
}