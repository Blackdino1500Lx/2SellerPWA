import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

export default function SettingsPage() {
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .maybeSingle()

      if (error) setError(error.message)
      else setCompany(data)
      setLoading(false)
    }
    load()
  }, [])

  function update(field, value) {
    setCompany((c) => ({ ...c, [field]: value }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!company) return
    setSaving(true)
    setError('')
    setSaved(false)

    const payload = {
      nombre: company.nombre,
      identificacion: company.identificacion,
      direccion: company.direccion,
      telefono: company.telefono,
      email: company.email,
      logo_url: company.logo_url,
      aplica_impuestos: company.aplica_impuestos,
      impuesto_default_pct: Number(company.impuesto_default_pct) || 0,
      moneda: company.moneda
    }

    const { error } = await supabase
      .from('companies')
      .update(payload)
      .eq('id', company.id)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <AppShell>
        <Header title="Configuración" showBack />
        <div className="flex-1 flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </AppShell>
    )
  }

  if (!company) {
    return (
      <AppShell>
        <Header title="Configuración" showBack />
        <div className="p-5 text-sm text-slate-500">Empresa no encontrada</div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="Configuración" subtitle="Empresa" showBack />

      <form onSubmit={handleSave} className="flex-1 overflow-y-auto pb-8">
        <div className="px-5 pt-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Datos de la empresa
          </h3>

          <Input
            label="Nombre"
            value={company.nombre || ''}
            onChange={(e) => update('nombre', e.target.value)}
            required
          />
          <Input
            label="Identificación / Cédula jurídica"
            value={company.identificacion || ''}
            onChange={(e) => update('identificacion', e.target.value)}
          />
          <Input
            label="Dirección"
            value={company.direccion || ''}
            onChange={(e) => update('direccion', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Teléfono"
              value={company.telefono || ''}
              onChange={(e) => update('telefono', e.target.value)}
            />
            <Input
              label="Moneda"
              value={company.moneda || ''}
              onChange={(e) => update('moneda', e.target.value)}
              placeholder="CRC"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={company.email || ''}
            onChange={(e) => update('email', e.target.value)}
          />
          <Input
            label="URL del logo"
            value={company.logo_url || ''}
            onChange={(e) => update('logo_url', e.target.value)}
            placeholder="https://..."
          />

          <div className="border-t border-slate-200 pt-5 mt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Impuestos
            </h3>

            <label className="flex items-start gap-3 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl p-4">
              <input
                type="checkbox"
                checked={!!company.aplica_impuestos}
                onChange={(e) => update('aplica_impuestos', e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-brand-600"
              />
              <div>
                <p className="font-semibold text-sm">Aplicar impuestos a las ventas</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Si lo desactivas, los pedidos nuevos se guardarán sin impuesto y el PDF
                  mostrará solo subtotal y total.
                </p>
              </div>
            </label>

            {company.aplica_impuestos && (
              <div className="mt-3">
                <Input
                  label="Porcentaje de impuesto por defecto (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={company.impuesto_default_pct ?? 0}
                  onChange={(e) => update('impuesto_default_pct', e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Cada producto puede tener su propio % en el catálogo. Este es solo el valor
                  sugerido para nuevos productos.
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {saved && (
          <div className="mx-5 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-4 py-3">
            Cambios guardados
          </div>
        )}

        <div className="px-5 pt-6">
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </AppShell>
  )
}