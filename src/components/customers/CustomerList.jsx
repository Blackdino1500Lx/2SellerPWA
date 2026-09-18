import CustomerCard from './CustomerCard'
import EmptyState from '../ui/EmptyState'

export default function CustomerList({ customers, query = '' }) {
  const q = query.trim().toLowerCase()
  const filtered = q
    ? customers.filter((c) =>
        (c.nombre || '').toLowerCase().includes(q) ||
        (c.identificacion || '').toLowerCase().includes(q) ||
        (c.telefono || '').toLowerCase().includes(q)
      )
    : customers

  if (customers.length === 0) {
    return (
      <EmptyState
        title="Sin clientes asignados"
        description="Aún no tienes clientes asignados. Contacta a tu administrador."
      />
    )
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        title="Sin resultados"
        description={`No encontramos clientes que coincidan con "${query}".`}
      />
    )
  }

  return (
    <div className="space-y-2">
      {filtered.map((c) => (
        <CustomerCard key={c.id} customer={c} />
      ))}
    </div>
  )
}