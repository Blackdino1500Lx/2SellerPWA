import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useOnline } from '../hooks/useOnline'
import { useSync } from '../context/SyncContext'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import SearchInput from '../components/ui/SearchInput'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import ProductFormSheet from '../components/products/ProductFormSheet'
import { fmtCRCShort } from '../lib/format'

export default function ProductsListPage() {
  const navigate = useNavigate()
  const online = useOnline()
  const { runSync } = useSync()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('activos') // 'activos' | 'todos'
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  async function load() {
    if (!online) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')

    let q = supabase
      .from('products')
      .select('id, sku, nombre, descripcion, precio, impuesto_pct, unidad, activo')
      .order('nombre', { ascending: true })
      .limit(1000)

    if (filter === 'activos') q = q.eq('activo', true)

    const { data, error } = await q
    if (error) setError(error.message)
    else setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line
  }, [online, filter])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
    )
  }, [products, query])

  function handleNew() {
    if (!online) return
    setEditing(null)
    setFormOpen(true)
  }

  async function handleSaved() {
    await load()
    await runSync() // refresca la caché offline
  }

  return (
    <AppShell>
      <Header title="Productos" subtitle="Admin" showBack />

      <div className="px-5 pt-3 pb-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre o SKU…"
        />
      </div>

      <div className="px-5 pb-3 flex gap-2">
        {[
          { key: 'activos', label: 'Activos' },
          { key: 'todos', label: 'Todos' }
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === f.key
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 active:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center tabular-nums">
          {filtered.length} de {products.length}
        </span>
      </div>

      <div className="px-5 pb-24 flex-1">
        {!online ? (
          <EmptyState
            title="Sin conexión"
            description="Conéctate para administrar el catálogo."
          />
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState
            title="Error al cargar productos"
            description={error}
            action={<Button onClick={load}>Reintentar</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? 'Sin resultados' : 'Sin productos'}
            description={
              query
                ? `No hay productos que coincidan con "${query}".`
                : 'Aún no has creado productos.'
            }
            action={!query ? <Button onClick={handleNew}>Crear el primero</Button> : null}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                onClick={() => {
                  setEditing(p)
                  setFormOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleNew}
        disabled={!online}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-xl shadow-brand-600/30 active:scale-95 active:bg-brand-700 transition disabled:opacity-50 z-20"
        aria-label="Nuevo producto"
        title={online ? 'Nuevo producto' : 'Sin conexión'}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <ProductFormSheet
        open={formOpen}
        product={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleSaved}
      />
    </AppShell>
  )
}

function ProductRow({ product, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-3.5 border transition active:scale-[.99] ${
        product.activo === false
          ? 'border-slate-200 bg-slate-50 opacity-60'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{product.nombre}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {product.sku}
            {product.unidad && product.unidad !== 'unidad' && ` · ${product.unidad}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-sm tabular-nums">
            {fmtCRCShort(product.precio)}
          </p>
          {product.impuesto_pct > 0 && (
            <p className="text-[10px] text-slate-400">
              +{product.impuesto_pct}%
            </p>
          )}
          {product.activo === false && (
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
              INACTIVO
            </p>
          )}
        </div>
      </div>
    </button>
  )
}