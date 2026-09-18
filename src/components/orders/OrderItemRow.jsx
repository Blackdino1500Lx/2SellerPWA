import Stepper from '../ui/Stepper'

export default function OrderItemRow({ item, onChangeQty, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm leading-tight truncate">
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
        <p className="text-xs text-slate-500">
          ₡{Number(item.precio_unitario).toLocaleString('es-CR')} c/u
          {item.descuento_pct > 0 && (
            <span className="ml-2 text-emerald-600 font-semibold">
              −{item.descuento_pct}%
            </span>
          )}
        </p>
      </div>

      <Stepper
        value={item.cantidad}
        onChange={(n) => onChangeQty(item.product_id, n)}
        onRemove={() => onRemove(item.product_id)}
      />
    </div>
  )
}