import { fmtCRCShort } from '../../lib/format'

export default function OrderItemRow({
  item,
  onChangeQty,
  onChangeStock
}) {
  // Variante 1: producto nuevo (añadido del catálogo)
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

  // Variante 2: producto del historial (3 columnas)
  const pedidoAnterior = item.originalQty || 0
  const stockActual = item.stock_tienda ?? ''
  const pedidoNuevo = item.cantidad || ''

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
        {/* Pedido anterior */}
        <div>
          <label className="text-[10px] md:text-xs text-slate-500 block mb-1.5 text-center">
            Pedido anterior
          </label>
          <div className="w-full border border-slate-200 bg-slate-50 rounded-xl px-2 py-2.5 md:py-3 text-center text-sm md:text-base font-semibold text-slate-600 tabular-nums">
            {pedidoAnterior}
          </div>
        </div>

        {/* Stock actual */}
        <div>
          <label className="text-[10px] md:text-xs text-slate-500 block mb-1.5 text-center">
            Stock actual
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={stockActual}
            onChange={(e) => onChangeStock(item.product_id, e.target.value)}
            placeholder="0"
            className="w-full border border-slate-300 rounded-xl px-2 py-2.5 md:py-3 text-center text-sm md:text-base font-semibold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 tabular-nums"
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
    </div>
  )
}