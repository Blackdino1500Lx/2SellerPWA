import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function calcLine(item) {
  const precio = Number(item.precio_unitario) || 0
  const cant = Number(item.cantidad) || 0
  const desc = Number(item.descuento_pct) || 0
  const imp = Number(item.impuesto_pct) || 0

  const base = precio * cant * (1 - desc / 100)
  const iva = base * (imp / 100)
  return {
    subtotal: round2(base),
    impuesto: round2(iva)
  }
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function normalizeItem(i) {
  // El "stock anterior" es con lo que quedó la tienda la última visita:
  // stock_tienda + cantidad del pedido previo (ya viene calculado como stock_resultante).
  // Fallback: si no hay stock_resultante, se usa la cantidad pedida (para pedidos viejos).
  const stockAnterior =
    i.stock_resultante != null
      ? Number(i.stock_resultante)
      : Number(i.cantidad) || 0

  // Si la DB ya guardó el stock_resultante del pedido anterior, úsalo como
  // stock actual sugerido. Si no, empieza vacío.
  const stockSugerido = i.stock_resultante != null ? Number(i.stock_resultante) : null

  return {
    product_id: i.product_id,
    producto_nombre: i.producto_nombre,
    producto_sku: i.producto_sku,
    precio_unitario: Number(i.precio_unitario) || 0,
    impuesto_pct: Number(i.impuesto_pct) || 0,
    cantidad: 0,
    descuento_pct: 0,
    stock_tienda: stockSugerido,
    stockSuggested: stockSugerido != null,
    // Referencia: con cuánto quedó en tienda la última visita
    stockAnterior,
    isNew: false
  }
}

export function useOrderEditor(initialItems) {
  const [items, setItems] = useState([])
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    if (initialItems === undefined) return
    setItems((initialItems || []).map(normalizeItem))
    hasInitialized.current = true
  }, [initialItems])

  const addItem = useCallback((product) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.product_id === product.id)
      if (exists) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, cantidad: (i.cantidad || 0) + 1 }
            : i
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          producto_nombre: product.nombre,
          producto_sku: product.sku,
          precio_unitario: Number(product.precio) || 0,
          impuesto_pct: Number(product.impuesto_pct) || 0,
          cantidad: 1,
          descuento_pct: 0,
          stock_tienda: null,
          stockSuggested: false,
          stockAnterior: 0,
          isNew: true
        }
      ]
    })
  }, [])

  const changeQty = useCallback((productId, raw) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId) return i
        const cleaned = String(raw ?? '').replace(/[^0-9]/g, '')
        const val = cleaned === '' ? 0 : parseInt(cleaned, 10)
        return { ...i, cantidad: isNaN(val) ? 0 : val }
      })
    )
  }, [])

  const changeStock = useCallback((productId, raw) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId) return i
        const cleaned = String(raw ?? '').replace(/[^0-9]/g, '')
        const val = cleaned === '' ? null : parseInt(cleaned, 10)
        return {
          ...i,
          stock_tienda: isNaN(val) ? null : val,
          stockSuggested: false
        }
      })
    )
  }, [])

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId))
  }, [])

  const setDiscount = useCallback((productId, pct) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product_id === productId
          ? { ...i, descuento_pct: Math.max(0, Math.min(100, pct)) }
          : i
      )
    )
  }, [])

  const totals = useMemo(() => {
    let subtotal = 0
    let impuestos = 0
    let itemCount = 0

    for (const item of items) {
      if (!item.cantidad || item.cantidad <= 0) continue
      const { subtotal: s, impuesto: iv } = calcLine(item)
      subtotal += s
      impuestos += iv
      itemCount += 1
    }

    return {
      subtotal: round2(subtotal),
      impuestos: round2(impuestos),
      total: round2(subtotal + impuestos),
      itemCount
    }
  }, [items])

  const itemsToOrder = useMemo(
    () => items.filter((i) => i.cantidad > 0),
    [items]
  )

  return {
    items,
    itemsToOrder,
    totals,
    addItem,
    changeQty,
    changeStock,
    removeItem,
    setDiscount
  }
}