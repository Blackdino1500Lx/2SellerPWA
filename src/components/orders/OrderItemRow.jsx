import Stepper from '../ui/Stepper'
import { fmtCRCShort } from '../../lib/format'

export default function OrderItemRow({
  item,
  onChangeQty,
  onChangeStock,
  onRemove
}) {
  return (
    <div className="py-4 md:py-5 border-b border-slate-100">
      {/* Fila 1: nombre */}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-sm md:text-base leading-tight">
              {item.producto_nombre}
            </p>
            {item.isNew && (
              <span className="text-[9px] font-bold text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded">
                NUEVO
              </span>
            )}
            {item.isModified && !item.isNew && (
              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                MODIFICADO
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {fmtCRCShort(item.precio_unitario)} c/u
            {item.descuento_pct > 0 && (
              <span className="ml-2 text-emerald-600 font-semibold">
                −{item.descuento_pct}%
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Fila 2: En tienda hoy + Pedir */}
      <div className="flex items-end gap-3 md:gap-6 mt-4">
        <div className="flex-1 max-w-[200px]">
          <label className="text-[11px] md:text-xs text-slate-500 block mb-1.5">
            En tienda hoy
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={item.stock_tienda ?? ''}
            onChange={(e) => onChangeStock(item.product_id, e.target.value)}
            placeholder="0"
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 md:py-3 text-center text-sm md:text-base font-semibold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex-1 max-w-[200px]">
          <span className="text-[11px] md:text-xs text-slate-500 block mb-1.5 text-center">
            Pedir
          </span>
          <Stepper
            value={item.cantidad}
            onChange={(n) => onChangeQty(item.product_id, n)}
            onRemove={() => onRemove(item.product_id)}
          />
        </div>
      </div>
    </div>
  )
}