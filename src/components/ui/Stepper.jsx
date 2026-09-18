export default function Stepper({ value, onChange, min = 0, step = 1, onRemove }) {
  const canDecrease = value > min

  function dec() {
    if (value <= 1 && onRemove) {
      onRemove()
      return
    }
    onChange(Math.max(min, value - step))
  }

  function inc() {
    onChange(value + step)
  }

  function handleInput(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    if (raw === '') {
      onChange(min)
      return
    }
    const n = parseInt(raw, 10)
    if (!isNaN(n)) onChange(n)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={dec}
        disabled={!canDecrease && !onRemove}
        className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xl font-medium active:scale-95 active:bg-slate-200 transition disabled:opacity-40"
        aria-label="Disminuir"
      >
        −
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleInput}
        className="w-10 text-center font-bold text-base bg-transparent outline-none tabular-nums"
        aria-label="Cantidad"
      />

      <button
        type="button"
        onClick={inc}
        className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center text-xl font-medium active:scale-95 active:bg-brand-700 transition shadow-md shadow-brand-600/25"
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  )
}