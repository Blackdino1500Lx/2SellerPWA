import { fmtCRC } from '../../lib/format'

export default function TopSellersList({ sellers }) {
  if (!sellers || sellers.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        Sin ventas de vendedores en el período
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {sellers.map((s, idx) => (
        <div
          key={s.seller_id || idx}
          className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{s.vendedor}</p>
            <p className="text-xs text-slate-500">
              {s.pedidos} pedido{s.pedidos === 1 ? '' : 's'}
            </p>
          </div>
          <p className="text-sm font-bold tabular-nums">
            {fmtCRC(s.ventas)}
          </p>
        </div>
      ))}
    </div>
  )
}