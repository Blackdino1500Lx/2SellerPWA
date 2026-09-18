import { fmtCRC } from '../../lib/format'

export default function TopProductsList({ products }) {
  if (!products || products.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        Sin productos vendidos en el período
      </p>
    )
  }

  const max = Math.max(...products.map((p) => Number(p.cantidad_total)))

  return (
    <div className="space-y-3">
      {products.map((p, idx) => {
        const pct = max > 0 ? (Number(p.cantidad_total) / max) * 100 : 0
        return (
          <div key={p.product_id || idx}>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{p.producto_nombre}</p>
                <p className="text-xs text-slate-500">
                  {Number(p.cantidad_total).toLocaleString('es-CR')} unidades
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums flex-shrink-0">
                {fmtCRC(p.ventas_total)}
              </p>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}