const KEY = 'pedidos.device_id'

function generateDeviceId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin I, O, 0, 1 para evitar confusión
  let id = ''
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

export function getDeviceId() {
  if (typeof localStorage === 'undefined') return 'DEV0'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = generateDeviceId()
    localStorage.setItem(KEY, id)
  }
  return id
}

export function makeLocalFolio() {
  const device = getDeviceId()
  const ts = Date.now().toString(36).toUpperCase().slice(-6)
  return `LOCAL-${device}-${ts}`
}