import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Spinner from '../ui/Spinner'

export default function CustomerFormSheet({
  open,
  customer,        // null = crear, objeto = editar
  onClose,
  onSaved,
  onDeleted
}) {
  const [form, setForm] = useState(emptyForm())
  const [sellers, setSellers] = useState([])
  const [loadingSellers, setLoadingSellers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isEdit = !!customer?.id

  useEffect(() => {
    if (!open) return
    setError('')
    setConfirmDelete(false)
    if (customer) {
      setForm({
        nombre: customer.nombre || '',
        identificacion: customer.identificacion || '',
        direccion: customer.direccion || '',
        telefono: customer.telefono || '',
        email: customer.email || '',
        contacto: customer.contacto || '',
        notas: customer.notas || '',
        seller_id: customer.seller_id || ''
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, customer])

  useEffect(() => {
    if (!open) return
    let mounted = true
    async function loadSellers() {
      setLoadingSellers(true)
      const { data, error } = await supabase
        .from('sellers')
        .select('id, codigo, zona, users (nombre)')
        .eq('activo', true)
        .order('created_at')

      if (!mounted) return
      if (!error) setSellers(data ?? [])
      setLoadingSellers(false)
    }
    loadSellers()
    return () => { mounted = false }
  }, [open])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!form.seller_id) {
      setError('Debes asignar un vendedor')
      return
    }

    setSaving(true)

    try {
      const payload = {
        nombre: form.nombre.trim(),
        identificacion: form.identificacion.trim() || null,
        direccion: form.direccion.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        contacto: form.contacto.trim() || null,
        notas: form.notas.trim() || null,
        seller_id: form.seller_id
      }

      if (isEdit) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', customer.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(payload)
        if (error) throw error
      }

      onSaved?.()
      onClose?.()
    } catch (err) {
      console.error('Error guardando cliente:', err)
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!isEdit) return
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase
        .from('customers')
        .update({ activo: false })
        .eq('id', customer.id)
      if (error) throw error

      onDeleted?.()
      onClose?.()
    } catch (err) {
      console.error('Error desactivando cliente:', err)
      setError(err.message || 'Error al desactivar')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative mt-auto bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col animate-slideUp">
        <div className="pt-3 pb-2 flex justify-center flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="px-5 pt-2 pb-3 flex-shrink-0 border-b border-slate-100">
          <h3 className="font-bold text-lg">
            {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </h3>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={(e) => update('nombre', e.target.value)}
              placeholder="Pulpería La Esquina"
              required
            />
            <Input
              label="Identificación / Cédula"
              value={form.identificacion}
              onChange={(e) => update('identificacion', e.target.value)}
              placeholder="1-2345-6789"
            />
            <Input
              label="Dirección"
              value={form.direccion}
              onChange={(e) => update('direccion', e.target.value)}
              placeholder="Barrio Escalante, San José"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Teléfono"
                value={form.telefono}
                onChange={(e) => update('telefono', e.target.value)}
                placeholder="2222-1111"
              />
              <Input
                label="Contacto"
                value={form.contacto}
                onChange={(e) => update('contacto', e.target.value)}
                placeholder="Nombre"
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="cliente@correo.com"
            />

            {/* Selector de vendedor */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Vendedor asignado *
              </label>
              {loadingSellers ? (
                <div className="border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-slate-400">
                  <Spinner size="sm" />
                  Cargando vendedores…
                </div>
              ) : (
                <select
                  value={form.seller_id}
                  onChange={(e) => update('seller_id', e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 bg-white"
                  required
                >
                  <option value="">Seleccionar vendedor…</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.users?.nombre || 'Sin nombre'}
                      {s.codigo ? ` · ${s.codigo}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {sellers.length === 0 && !loadingSellers && (
                <p className="text-xs text-amber-600 mt-1">
                  No hay vendedores activos. Créalos desde Supabase Studio.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Notas
              </label>
              <textarea
                value={form.notas}
                onChange={(e) => update('notas', e.target.value)}
                rows={2}
                placeholder="Horario de entrega, observaciones…"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Soft delete */}
            {isEdit && (
              <div className="border-t border-slate-200 pt-4 mt-2">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-red-600 text-sm font-semibold w-full text-left"
                  >
                    Desactivar cliente
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm text-red-800">
                      El cliente quedará inactivo. Su historial de pedidos se conserva.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancelar
                      </Button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={saving}
                        className="flex-1 bg-red-600 text-white font-semibold text-sm py-2 rounded-xl active:bg-red-700 disabled:opacity-50"
                      >
                        Sí, desactivar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        <div className="border-t border-slate-200 px-5 py-3 flex gap-2 flex-shrink-0 safe-bottom">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1"
            onClick={handleSave}
            disabled={saving || loadingSellers}
          >
            {saving ? 'Guardando…' : (isEdit ? 'Guardar' : 'Crear cliente')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function emptyForm() {
  return {
    nombre: '',
    identificacion: '',
    direccion: '',
    telefono: '',
    email: '',
    contacto: '',
    notas: '',
    seller_id: ''
  }
}