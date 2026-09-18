import { Link } from 'react-router-dom'

const COLORS = [
  'bg-brand-50 text-brand-700',
  'bg-emerald-50 text-emerald-700',
  'bg-purple-50 text-purple-700',
  'bg-orange-50 text-orange-700',
  'bg-pink-50 text-pink-700'
]

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function colorFor(id) {
  if (!id) return COLORS[0]
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % COLORS.length
  return COLORS[hash]
}

export default function CustomerCard({ customer }) {
  const color = colorFor(customer.id)

  return (
    <Link
      to={`/clientes/${customer.id}`}
      className="block border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 active:bg-slate-50 bg-white transition"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${color}`}>
        {initials(customer.nombre)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{customer.nombre}</p>
        <p className="text-xs text-slate-500 truncate">
          {customer.identificacion || customer.telefono || 'Sin datos'}
        </p>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  )
}