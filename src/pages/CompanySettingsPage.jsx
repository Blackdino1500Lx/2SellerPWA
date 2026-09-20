import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { useAuth } from '../hooks/useAuth'
import { useSync } from '../context/SyncContext'
import { useToast } from '../context/ToastContext'
import AppShell from '../components/layout/AppShell'
import Header from '../components/layout/Header'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

const CAMPOS_EDITABLES = [
  'nombre',
  'identificacion',
  'direccion',
  'telefono',
  'email',
  'logo_url',
  'moneda',
  'impuesto_default_pct',
  'aplica_impuestos'
]

export default function CompanySettingsPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { refreshStatus } = useSync()
  const { showToast } = useToast()

  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!profile?.company_id) return

    let mounted = true
    async function load() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .maybeSingle()

      if (!mounted) return

      if (error) {
        console.error('Error cargando empresa:', error)
        setError(error.message)
        setCompany(null)
      } else if (!data) {
        setError('No se encontró la empresa asociada a tu usuario')
        setCompany(null)
      } else {
        setCompany(data)
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [profile?.company_id])

  function setField(key, value) {
    setCompany((c) => ({ ...c, [key]: value }))
    setDirty(true)
  }

  async function handleSave() {
    if (!company || saving) return
    setSaving(true)
    setError('')

    try {
      const patch = {}
      for (const key of CAMPOS_EDITABLES) {
        if (key in company) patch[key] = company[key]
      }
      if ('impuesto_default_pct' in patch) {
        patch.impuesto_default_pct = Number(patch.impuesto_default_pct) || 0
      }

      const { error: upErr } = await supabase
        .from('companies')
        .update(patch)
        .eq('id', company.id)

      if (upErr) throw upErr

      await db.meta.put({ key: 'company', value: { ...company, ...patch } })
      await refreshStatus()

      setDirty(false)
      showToast({ type: 'success', message: 'Configuración guardada' })
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al guardar')
      showToast({ type: 'error', message: err.message || 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile) {
    return (
      <AppShell>
        <Header title="Mi empresa" subtitle="Admin" showBack />
        <div className="flex-1 flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </AppShell>
    )
  }

  if (!company) {
    return (
      <AppShell>
        <Header title="Mi empresa" subtitle="Admin" showBack />
        <EmptyState
          title="No se pudo cargar la empresa"
          description={error || 'Verifica que tu usuario tenga una empresa asignada.'}
          action={<Button onClick={() => navigate('/')}>Volver a clientes</Button>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="Mi empresa" subtitle="Admin" showBack />

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="px-5 pt-5 pb-3 space-y-4">
          <Input
            label="Nombre de la empresa"
            value={company.nombre || ''}
            onChange={(e) => setField('nombre', e.target.value)}
            placeholder="Distribuidora S.A."
          />

          <Input
            label="Identificación"
            value={company.identificacion || ''}
            onChange={(e) => setField('identificacion', e.target.value)}
            placeholder="3-101-123456"
          />

          <Input
            label="Dirección"
            value={company.direccion || ''}
            onChange={(e) => setField('direccion', e.target.value)}
            placeholder="San José, Costa Rica"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Teléfono"
              value={company.telefono || ''}
              onChange={(e) => setField('telefono', e.target.value)}
              placeholder="2222-0000"
            />
            <Input
              label="Moneda"
              value={company.moneda || ''}
              onChange={(e) => setField('moneda', e.target.value.toUpperCase())}
              placeholder="CRC"
              maxLength={3}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={company.email || ''}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="info@empresa.cr"
          />

          <Input
            label="URL del logo"
            value={company.logo_url || ''}
            onChange={(e) => setField('logo_url', e.target.value)}
            placeholder="https://…/logo.png"
          />

          {company.logo_url && (
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <img
                src={company.logo_url}
                alt="Logo"
                className="w-14 h-14 object-contain bg-white rounded-lg border border-slate-200"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <p className="text-xs text-slate-500">Vista previa del logo</p>
            </div>
          )}
        </div>

        <div className="px-5 pt-3 pb-4">
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold text-sm">Aplicar impuestos</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Si está desactivado, los pedidos se guardan sin IVA.
                </p>
              </div>
              <Toggle
                value={!!company.aplica_impuestos}
                onChange={(v) => setField('aplica_impuestos', v)}
              />
            </div>

            {company.aplica_impuestos && (
              <div className="pt-2 border-t border-slate-100">
                <Input
                  label="Impuesto por defecto (%)"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  max="100"
                  value={String(company.impuesto_default_pct ?? 13)}
                  onChange={(e) => setField('impuesto_default_pct', e.target.value)}
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Se usa como valor inicial al crear productos nuevos.
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-5 mb-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-5 py-4 safe-bottom">
        <Button
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios'}
        </Button>
      </div>
    </AppShell>
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