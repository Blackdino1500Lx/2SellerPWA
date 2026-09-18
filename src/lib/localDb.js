const PREFIX = '2seller.'

const KEYS = {
  customers:   PREFIX + 'customers',
  products:    PREFIX + 'products',
  lastOrders:  PREFIX + 'lastOrders',
  drafts:      PREFIX + 'drafts',
  company:     PREFIX + 'company',
  seller:      PREFIX + 'seller',
  profile:     PREFIX + 'profile',
  syncMeta:    PREFIX + 'syncMeta'
}

// ---------- Helpers base ----------

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch (err) {
    console.warn(`localDb: error leyendo ${key}`, err)
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.warn(`localDb: error escribiendo ${key}`, err)
    return false
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key)
  } catch (err) {
    console.warn(`localDb: error borrando ${key}`, err)
  }
}

// ---------- API ----------

export const localDb = {
  // Clientes
  getCustomers: () => read(KEYS.customers, []),
  setCustomers: (arr) => write(KEYS.customers, arr),
  getCustomer: (id) => (read(KEYS.customers, [])).find((c) => c.id === id) || null,

  // Productos
  getProducts: () => read(KEYS.products, []),
  setProducts: (arr) => write(KEYS.products, arr),

  // Últimos pedidos por cliente
  getLastOrders: () => read(KEYS.lastOrders, {}),
  getLastOrderFor: (customerId) => (read(KEYS.lastOrders, {}))[customerId] || null,
  setLastOrders: (obj) => write(KEYS.lastOrders, obj),
  setLastOrderFor: (customerId, order) => {
    const all = read(KEYS.lastOrders, {})
    all[customerId] = order
    write(KEYS.lastOrders, all)
  },

  // Drafts pendientes
  getDrafts: () => read(KEYS.drafts, []),
  setDrafts: (arr) => write(KEYS.drafts, arr),
  getDraft: (clientUuid) =>
    (read(KEYS.drafts, [])).find((d) => d.client_uuid === clientUuid) || null,
  addDraft: (draft) => {
    const arr = read(KEYS.drafts, [])
    arr.push(draft)
    write(KEYS.drafts, arr)
  },
  updateDraft: (clientUuid, patch) => {
    const arr = read(KEYS.drafts, [])
    const idx = arr.findIndex((d) => d.client_uuid === clientUuid)
    if (idx === -1) return false
    arr[idx] = { ...arr[idx], ...patch }
    write(KEYS.drafts, arr)
    return true
  },
  removeDraft: (clientUuid) => {
    const arr = read(KEYS.drafts, []).filter((d) => d.client_uuid !== clientUuid)
    write(KEYS.drafts, arr)
  },
  countDrafts: () => read(KEYS.drafts, []).length,

  // Empresa / seller / profile
  getCompany: () => read(KEYS.company, null),
  setCompany: (c) => write(KEYS.company, c),
  getSeller: () => read(KEYS.seller, null),
  setSeller: (s) => write(KEYS.seller, s),
  getProfile: () => read(KEYS.profile, null),
  setProfile: (p) => write(KEYS.profile, p),

  // Metadata de sincronización
  getSyncMeta: () =>
    read(KEYS.syncMeta, {
      lastSyncCustomers: null,
      lastSyncProducts: null,
      lastSyncOrders: null
    }),
  setSyncMeta: (patch) => {
    const curr = read(KEYS.syncMeta, {})
    write(KEYS.syncMeta, { ...curr, ...patch })
  },

  // Utilidades
  clearAll: () => {
    Object.values(KEYS).forEach(remove)
  }
}