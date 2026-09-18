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
  return {
    product_id: i.product_id,
    producto_nombre: i.producto_nombre,
    producto_sku: i.producto_sku,
    precio_unitario: Number(i.precio_unitario) || 0,
    impuesto_pct: Number(i.impuesto_pct) || 0,
    cantidad: Number(i.cantidad) || 1,
    descuento_pct: Number(i.descuento_pct) || 0,
    originalQty: Number(i.cantidad) || 1,
    isNew: false,
    isModified: false
  }
}

export function useOrderEditor(initialItems = []) {
  const [items, setItems] = useState(() => initialItems.map(normalizeItem))
  const initializedRef = useRef(initialItems.length > 0)

  // Si initialItems llega después (async load), hidratar una sola vez.
  // Después de eso, el usuario manda y no se sobreescribe.
  useEffect(() => {
    if (initializedRef.current) return
    if (initialItems.length === 0) return

    setItems(initialItems.map(normalizeItem))
    initializedRef.current = true
  }, [initialItems])

  const addItem = useCallback((product) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.product_id === product.id)
      if (exists) {
        return prev.map((i) =>
          i.product_id === product.id
            ? {
                ...i,
                cantidad: i.cantidad + 1,
                isModified: i.isNew ? i.isModified : true
              }
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
          originalQty: 0,
          isNew: true,
          isModified: false
        }
      ]
    })
  }, [])

  const changeQty = useCallback((productId, qty) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product_id === productId
          ? {
              ...i,
              cantidad: qty,
              isModified: i.isNew ? false : qty !== i.originalQty
            }
          : i
      )
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

  return {
    items,
    totals,
    addItem,
    changeQty,
    removeItem,
    setDiscount
  }
}