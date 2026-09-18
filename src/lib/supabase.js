import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env')
}

// Validación de formato para detectar claves cortadas o mal copiadas
const puntos = (anonKey.match(/\./g) || []).length
if (puntos !== 2 || anonKey.length < 100) {
  console.error(
    '⚠️ La anon key parece incompleta o mal formada.',
    `Puntos: ${puntos} (esperados 2) · Largo: ${anonKey.length} (esperado > 200)`
  )
}

if (url.endsWith('/')) {
  console.warn('⚠️ VITE_SUPABASE_URL no debe terminar en "/". Quítalo para evitar rutas dobles.')
}

export const supabase = createClient(url.replace(/\/$/, ''), anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
    storageKey: 'pedidos.auth'
  }
})