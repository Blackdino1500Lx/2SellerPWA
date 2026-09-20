export function fmtCRC(value) {
  const num = Number(value ?? 0)
  return '₡' + num.toLocaleString('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function fmtFechaHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}