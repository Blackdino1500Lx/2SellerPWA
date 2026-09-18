import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const NEGRO      = rgb(0.06, 0.09, 0.16)
const GRIS       = rgb(0.39, 0.45, 0.55)
const GRIS_CLARO = rgb(0.88, 0.91, 0.94)
const AZUL       = rgb(0.15, 0.39, 0.92)
const BLANCO     = rgb(1, 1, 1)

function sanitize(str) {
  if (str == null) return ''
  return String(str)
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ÁÀÄÂ]/g, 'A')
    .replace(/[ÉÈËÊ]/g, 'E')
    .replace(/[ÍÌÏÎ]/g, 'I')
    .replace(/[ÓÒÖÔ]/g, 'O')
    .replace(/[ÚÙÜÛ]/g, 'U')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/₡/g, 'CRC ')
    .replace(/[^\x00-\x7F]/g, '')
}

function fmtNum(n) {
  const num = Number(n) || 0
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function fmtFecha(iso) {
  const d = iso ? new Date(iso) : new Date()
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = meses[d.getMonth()]
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd} ${mm} ${yyyy}, ${hh}:${mi}`
}

function truncate(text, maxChars) {
  const s = sanitize(text)
  if (s.length <= maxChars) return s
  return s.slice(0, maxChars - 3) + '...'
}

// Envuelve un texto en varias líneas respetando un ancho máximo en puntos
function wrapText(text, font, size, maxWidth) {
  const words = sanitize(text).split(/\s+/)
  const lines = []
  let current = ''

  for (const w of words) {
    const test = current ? `${current} ${w}` : w
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function generarPDFPedido({ pedido, empresa, cliente, vendedor }) {
  const pdf = await PDFDocument.create()
  let page = pdf.addPage([595, 842])
  const { width, height } = page.getSize()

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const M = 50
  const rightEdge = width - M
  const usableWidth = width - M * 2

  const aplicaImpuestos = empresa.aplica_impuestos !== false

  let y = height - M

  // ==========================================
  // ENCABEZADO
  // ==========================================
  page.drawText(truncate(empresa.nombre || '', 42), {
    x: M, y, size: 14, font: bold, color: NEGRO
  })

  // Bloque derecho
  page.drawText('PEDIDO', {
    x: rightEdge - bold.widthOfTextAtSize('PEDIDO', 22),
    y: height - M - 4,
    size: 22, font: bold, color: NEGRO
  })

  const folio = pedido.folio || pedido.folio_local || '—'
  const folioTxt = `N. ${sanitize(folio)}`
  page.drawText(folioTxt, {
    x: rightEdge - bold.widthOfTextAtSize(folioTxt, 11),
    y: height - M - 32,
    size: 11, font: bold, color: AZUL
  })

  const fechaTxt = fmtFecha(pedido.fecha)
  page.drawText(fechaTxt, {
    x: rightEdge - font.widthOfTextAtSize(fechaTxt, 9),
    y: height - M - 50,
    size: 9, font, color: GRIS
  })

  // Datos empresa (debajo del nombre)
  y -= 22
  const empresaLineas = []
  if (empresa.identificacion) empresaLineas.push(`Cedula: ${sanitize(empresa.identificacion)}`)
  if (empresa.direccion) empresaLineas.push(truncate(empresa.direccion, 55))
  const contacto = [empresa.telefono, empresa.email].filter(Boolean).join(' · ')
  if (contacto) empresaLineas.push(sanitize(contacto))

  for (const linea of empresaLineas) {
    page.drawText(linea, { x: M, y, size: 9, font, color: GRIS })
    y -= 13
  }

  // Línea separadora — siempre en la posición más baja entre los dos bloques
  const sepY = Math.min(y - 8, height - M - 66)
  page.drawLine({
    start: { x: M, y: sepY }, end: { x: rightEdge, y: sepY },
    thickness: 2, color: NEGRO
  })
  y = sepY - 26

  // ==========================================
  // CLIENTE Y VENDEDOR
  // ==========================================
  const colMid = M + usableWidth / 2

  page.drawText('CLIENTE', { x: M, y, size: 8, font: bold, color: GRIS })
  page.drawText('VENDEDOR', { x: colMid, y, size: 8, font: bold, color: GRIS })
  y -= 16

  page.drawText(truncate(cliente.nombre, 30), {
    x: M, y, size: 11, font: bold, color: NEGRO
  })
  page.drawText(truncate(vendedor?.nombre || '—', 30), {
    x: colMid, y, size: 11, font: bold, color: NEGRO
  })
  y -= 16

  if (cliente.identificacion) {
    page.drawText(`Cedula: ${sanitize(cliente.identificacion)}`, {
      x: M, y, size: 9, font, color: GRIS
    })
  }
  if (vendedor?.codigo) {
    page.drawText(`Codigo: ${sanitize(vendedor.codigo)}`, {
      x: colMid, y, size: 9, font, color: GRIS
    })
  }
  y -= 14

  // Direcciones: pueden ser largas, se truncan para no solaparse
  const clienteDir = cliente.direccion ? truncate(cliente.direccion, 42) : ''
  const vendedorZona = vendedor?.zona ? truncate(vendedor.zona, 32) : ''
  if (clienteDir || vendedorZona) {
    if (clienteDir) page.drawText(clienteDir, { x: M, y, size: 9, font, color: GRIS })
    if (vendedorZona) page.drawText(vendedorZona, { x: colMid, y, size: 9, font, color: GRIS })
    y -= 14
  }

  // ==========================================
  // TABLA DE ITEMS
  // ==========================================
  y -= 20  // respiro antes de la tabla

  const colSku      = { x: M,               w: 65 }
  const colNombre   = { x: M + 65,          w: 230 }
  const colCant     = { x: M + 295,         w: 45 }
  const colPrecio   = { x: M + 340,         w: 75 }
  const colSubtotal = { x: M + 415,         w: 80 }
  const rowHeight = 26
  const headerHeight = 24

  // Cabecera
  page.drawRectangle({
    x: M, y: y - headerHeight + 8,
    width: usableWidth, height: headerHeight,
    color: NEGRO
  })

  const headers = [
    ['SKU',      colSku.x,      'left'],
    ['PRODUCTO', colNombre.x,   'left'],
    ['CANT.',    colCant.x + colCant.w,     'right'],
    ['P. UNIT.', colPrecio.x + colPrecio.w, 'right'],
    ['SUBTOTAL', colSubtotal.x + colSubtotal.w, 'right']
  ]

  const headerY = y - headerHeight + 14
  for (const [txt, x, align] of headers) {
    const tw = bold.widthOfTextAtSize(txt, 8)
    const tx = align === 'right' ? x - tw : x
    page.drawText(txt, { x: tx, y: headerY, size: 8, font: bold, color: BLANCO })
  }

  y -= headerHeight + 4

  const items = pedido.items || []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const base = Number(item.precio_unitario) * Number(item.cantidad)
    const desc = base * (Number(item.descuento_pct) / 100)
    const lineSub = base - desc

    // Si no cabe la fila, nueva página
    if (y < 180) {
      page = pdf.addPage([595, 842])
      y = height - M
    }

    const rowY = y

    // SKU
    page.drawText(truncate(item.producto_sku, 12), {
      x: colSku.x, y: rowY, size: 9, font, color: GRIS
    })

    // Nombre — puede ocupar 2 líneas si es largo, por eso usamos wrap
    const nombreLineas = wrapText(item.producto_nombre, font, 9.5, colNombre.w - 8)
    page.drawText(nombreLineas[0], {
      x: colNombre.x, y: rowY, size: 9.5, font, color: NEGRO
    })
    // Si hay 2da línea, la dibujamos debajo pero sin avanzar y extra (se solapará con la fila)
    // Mejor: truncamos a 1 línea si es muy largo
    // Alternativa: aumentamos rowHeight y dibujamos la 2da
    // Aquí ya truncamos con wrapText solo a 1 línea útil

    // Cantidad
    const cantTxt = String(item.cantidad)
    page.drawText(cantTxt, {
      x: colCant.x + colCant.w - font.widthOfTextAtSize(cantTxt, 9.5),
      y: rowY, size: 9.5, font, color: NEGRO
    })

    // Precio unitario
    const precioTxt = fmtNum(item.precio_unitario)
    page.drawText(precioTxt, {
      x: colPrecio.x + colPrecio.w - font.widthOfTextAtSize(precioTxt, 9.5),
      y: rowY, size: 9.5, font, color: NEGRO
    })

    // Subtotal
    const subTxt = fmtNum(lineSub)
    page.drawText(subTxt, {
      x: colSubtotal.x + colSubtotal.w - bold.widthOfTextAtSize(subTxt, 9.5),
      y: rowY, size: 9.5, font: bold, color: NEGRO
    })

    y -= rowHeight

    // Línea separadora debajo de cada fila
    page.drawLine({
      start: { x: M, y: y + 16 }, end: { x: rightEdge, y: y + 16 },
      thickness: 0.5, color: GRIS_CLARO
    })
  }

  // ==========================================
  // TOTALES
  // ==========================================
  y -= 24  // espacio antes de los totales

  const totW = 220
  const totX = rightEdge - totW

  function drawTotalRow(label, value, opts = {}) {
    const { isBold = false, size = 10, color = NEGRO, tabular = false } = opts
    const f = isBold ? bold : font

    page.drawText(label, { x: totX, y, size, font: f, color })

    const vt = fmtNum(value)
    page.drawText(vt, {
      x: rightEdge - f.widthOfTextAtSize(vt, size),
      y, size, font: f, color
    })
    y -= size + 8
  }

  if (aplicaImpuestos) {
    drawTotalRow('Subtotal', pedido.subtotal)
    drawTotalRow('Impuestos', pedido.impuestos)
  } else {
    drawTotalRow('Subtotal', pedido.subtotal)
  }

  // Línea superior del total
  page.drawLine({
    start: { x: totX, y: y + 6 }, end: { x: rightEdge, y: y + 6 },
    thickness: 1.5, color: NEGRO
  })
  y -= 6

  drawTotalRow('TOTAL', pedido.total, { isBold: true, size: 13, color: AZUL })

  // ==========================================
  // NOTAS
  // ==========================================
  if (pedido.notas && pedido.notas.trim()) {
    y -= 20

    const notasLineas = wrapText(pedido.notas, font, 9, usableWidth - 70)
    const boxHeight = 24 + notasLineas.length * 12

    if (y - boxHeight < 80) {
      page = pdf.addPage([595, 842])
      y = height - M
    }

    page.drawRectangle({
      x: M, y: y - boxHeight + 8,
      width: usableWidth, height: boxHeight,
      color: rgb(0.97, 0.98, 0.99)
    })
    page.drawLine({
      start: { x: M, y: y + 8 }, end: { x: M, y: y - boxHeight + 8 },
      thickness: 3, color: AZUL
    })

    page.drawText('Notas:', {
      x: M + 12, y: y - 4, size: 9, font: bold, color: NEGRO
    })

    let notasY = y - 4
    for (const linea of notasLineas) {
      page.drawText(linea, {
        x: M + 55, y: notasY, size: 9, font, color: GRIS
      })
      notasY -= 12
    }

    y -= boxHeight + 16
  }

  // ==========================================
  // FOOTER en cada página
  // ==========================================
  const pages = pdf.getPages()
  const totalPaginas = pages.length

  pages.forEach((p, idx) => {
    const footerY = 40
    p.drawLine({
      start: { x: M, y: footerY + 14 }, end: { x: rightEdge, y: footerY + 14 },
      thickness: 0.5, color: GRIS_CLARO
    })
    p.drawText(
      truncate(`${empresa.nombre} · ${empresa.identificacion || ''}`, 65),
      { x: M, y: footerY, size: 8, font, color: GRIS }
    )
    const pagTxt = `Pagina ${idx + 1} de ${totalPaginas}`
    p.drawText(pagTxt, {
      x: rightEdge - font.widthOfTextAtSize(pagTxt, 8),
      y: footerY, size: 8, font, color: GRIS
    })
  })

  return await pdf.save()
}

export function pdfBlob(bytes) {
  return new Blob([bytes], { type: 'application/pdf' })
}

export function abrirPDF(bytes) {
  const blob = pdfBlob(bytes)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function descargarPDF(bytes, nombre) {
  const blob = pdfBlob(bytes)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre.endsWith('.pdf') ? nombre : `${nombre}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}