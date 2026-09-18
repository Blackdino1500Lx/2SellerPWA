import { fmtCRC } from '../../lib/format'
import Button from '../ui/Button'

export default function OrderTotals({ totals, onConfirm, disabled = false }) {
  return (
    <div className="border-t border-slate-200 bg-white px-5 pt-3 pb-5 safe-bottom">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-slate-500">Subtotal</span>
        <span className="font-semibold tabular-nums">{fmtCRC(totals.subtotal)}</span>
      </div>
      <div className="flex items-center justify-between mb-3 text-sm">
        <span className="text-slate-500">Impuestos</span>
        <span className="font-semibold tabular-nums">{fmtCRC(totals.impuestos)}</span>
      </div>
      <div className="flex items-center justify-between mb-4 pt-3 border-t border-slate-100">
        <span className="font-bold">Total</span>
        <span className="font-bold text-lg tabular-nums">{fmtCRC(totals.total)}</span>
      </div>
      <Button
        size="lg"
        className="w-full"
        onClick={onConfirm}
        disabled={disabled || totals.itemCount === 0}
      >
        Confirmar pedido
      </Button>
    </div>
  )
}