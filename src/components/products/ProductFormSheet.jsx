import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../lib/db'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Spinner from '../ui/Spinner'

export default function ProductFormSheet({
  open,
  product,
  onClose,
  onSaved,
  onDeleted
}) {
  const { profile } = useAuth()
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [loadingNextSku, setLoadingNextSku] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isEdit = !!product?.id

  useEffect(() => {
    if (!open) return
    setError('')
    setConfirmDelete(false)
    if (product) {
      setForm({
        sku: product.sku || '',
        nombre: product.nombre || '',
        descripcion: product.descripcion || '',
        precio: product.precio != null ? String(product.precio) : '',
        impuesto_pct: product.impuesto_pct != null ? String(product.impuesto_pct) : '13',
        unidad: product.unidad || 'unidad',
        activo: product.activo !== false
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, product])

  // Cuando es nuevo, sugerir el próximo SKU
  useEffect(() => {
    if (!open || isEdit) return
    let mounted = true
    async function fetchNextSku() {
      setLoadingNextSku(true)
      try {
        const { data, error } = await supabase
          .from('products')
          .select('sku')
          .like('sku', 'P-%')
          .order('sku', { ascending: false })
          .limit(1)

        if (!mounted) return
        let next = 'P-0001'
        if (!error && data?.[0]?.sku) {
          const num = parseInt(String(data[0].sku).replace('P-', ''), 10)
          if (!isNaN(num)) {
            next = 'P-' + String(num + 1).padStart(4, '0')
          }
        }
        setForm((f) => ({ ...f, sku: f.sku || next }))
      } catch (e) {
        console.warn('No se pudo sugerir SKU:', e)
      } finally {
        if (mounted) setLoadingNextSku(false)
      }
    }
    fetchNextSku()
    return () => { mounted = false }
  }, [open, isEdit])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave(e) {
    e?.preventDefault?.()
    setError('')

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!form.sku.trim()) {
      setError('El SKU es obligatorio')
      return
    }
    const precioNum = Number(form.precio)
    if (isNaN(precioNum) || precioNum < 0) {
      setError('El precio debe ser un número válido')
      return
    }
    const impNum = Number(form.impuesto_pct)
    if (isNaN(impNum) || impNum < 0 || impNum > 100) {
      setError('El impuesto debe estar entre 0 y 100')
      return
    }

    setSaving(true)

    try {
      const payload = {
        sku: form.sku.trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        precio: precioNum,
        impuesto_pct: impNum,
        unidad: form.unidad.trim() || 'unidad',
        activo: !!form.activo
      }

      if (isEdit) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id)
        if (error) throw error
      } else {
        if (!profile?.company_id) {
          throw new Error('No se pudo determinar la empresa del usuario')
        }
        const { error } = await supabase
          .from('products')
          .insert({ ...payload, company_id: profile.company_id })
        if (error) throw error
      }

      await onSaved?.()
      onClose?.()
    } catch (err) {
      console.error('Error guardando producto:', err)
      // Mensaje más claro para SKU duplicado
      if (err.message?.includes('products_company_id_sku_key')) {
        setError('Ya existe un producto con ese SKU')
      } else {
        setError(err.message || 'Error al guardar')
      }
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
        .from('products')
        .update({ activo: false })
        .eq('id', product.id)
      if (error) throw error

      await onDeleted?.()
      onClose?.()
    } catch (err) {
      console.error('Error desactivando producto:', err)
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
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h3>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Input
                  label="SKU *"
                  value={form.sku}
                  onChange={(e) => update('sku', e.target.value)}
                  placeholder={loadingNextSku ? '...' : 'P-0001'}
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Unidad"
                  value={form.unidad}
                  onChange={(e) => update('unidad', e.target.value)}
                  placeholder="unidad"
                />
              </div>
            </div>

            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={(e) => update('nombre', e.target.value)}
              placeholder="Coca-Cola 600ml"
              required
            />

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Descripción
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => update('descripcion', e.target.value)}
                rows={2}
                placeholder="Opcional"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Precio (sin IVA) *"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.precio}
                onChange={(e) => update('precio', e.target.value)}
                placeholder="0.00"
                required
              />
              <Input
                label="Impuesto %"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="100"
                value={form.impuesto_pct}
                onChange={(e) => update('impuesto_pct', e.target.value)}
              />
            </div>

            {isEdit && (
              <div className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-sm">Producto activo</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Si lo desactivas, no aparece en el catálogo pero se conserva en pedidos históricos.
                  </p>
                </div>
                <Toggle
                  value={!!form.activo}
                  onChange={(v) => update('activo', v)}
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {isEdit && product?.activo && (
              <div className="border-t border-slate-200 pt-4 mt-2">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-red-600 text-sm font-semibold w-full text-left"
                  >
                    Desactivar producto
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm text-red-800">
                      El producto quedará inactivo. No aparecerá en nuevos pedidos.
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
            disabled={saving || loadingNextSku}
          >
            {saving ? 'Guardando…' : (isEdit ? 'Guardar' : 'Crear producto')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
        value ? 'bg-brand-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function emptyForm() {
  return {
    sku: '',
    nombre: '',
    descripcion: '',
    precio: '',
    impuesto_pct: '13',
    unidad: 'unidad',
    activo: true
  }
}