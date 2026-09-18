const RANGES = [
  { id: 'hoy',     label: 'Hoy' },
  { id: 'semana',  label: '7 días' },
  { id: 'mes',     label: 'Mes' },
  { id: 'trim',    label: '3 meses' },
  { id: 'ano',     label: 'Año' }
]

export default function DateRangePicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {RANGES.map((r) => {
        const active = value === r.id
        return (
          <button
            key={r.id}
            onClick={() => onChange(r.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition
              ${active
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 active:bg-slate-200'
              }`}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}