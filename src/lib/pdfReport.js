import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const NEGRO      = rgb(0.06, 0.09, 0.16)
const GRIS       = rgb(0.39, 0.45, 0.55)
const GRIS_CLARO = rgb(0.88, 0.91, 0.94)
const AZUL       = rgb(0.15, 0.39, 0.92)
const BLANCO     = rgb(1, 1, 1)
const FONDO_SUAVE = rgb(0.97, 0.98, 0.99)

function sanitize(str) {
  if (str == null) return ''
  return String(str)
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E')
    .replace(/[ÍÌÏÎ]/g, 'I').replace(/[ÓÒÖÔ]/g, 'O')
    .replace(/[ÚÙÜÛ]/g, 'U')
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
    .replace(/₡/g, 'CRC ')
    .replace(/[^\x00-\x7F]/g, '')
}

function fmtNum(n) {
  return (Number(n) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function fmtFechaCorta(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${String(d.getDate()).padStart(2,'0')} ${meses[d.getMonth()]} ${d.getFullYear()}`
}

function fmtMes(iso) {
  if (!iso) return ''
  const [y, m] = iso.split('-')
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${meses[parseInt(m,10) - 1]} ${y}`
}

function truncate(text, maxChars) {
  const s = sanitize(text)
  if (s.length <= maxChars) return s
  return s.slice(0, maxChars - 3) + '...'
}

export async function generarPDFReporte({
  empresa,
  meses,          // array de 'YYYY-MM' seleccionados
  fechaDesde,     // 'YYYY-MM-DD'
  fechaHasta,     // 'YYYY-MM-DD'
  resumen,
  porMes,
  topProductos,
  topVendedores
}) {
  const pdf = await PDFDocument.create()
  let page = pdf.addPage([595, 842])
  const { width, height } = page.getSize()

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const M = 50
  const rightEdge = width - M
  const usableWidth = width - M * 2

  let y = height - M

  // ==========================================
  // ENCABEZADO
  // ==========================================
  page.drawText(truncate(empresa.nombre || '', 42), {
    x: M, y, size: 14, font: bold, color: NEGRO
  })

  page.drawText('REPORTE', {
    x: rightEdge - bold.widthOfTextAtSize('REPORTE', 22),
    y: height - M - 4,
    size: 22, font: bold, color: NEGRO
  })

  const subtitulo = 'DE VENTAS'
  page.drawText(subtitulo, {
    x: rightEdge - bold.widthOfTextAtSize(subtitulo, 10),
    y: height - M - 30,
    size: 10, font: bold, color: AZUL
  })

  const rangoTxt = `${fmtFechaCorta(fechaDesde)} - ${fmtFechaCorta(fechaHasta)}`
  page.drawText(rangoTxt, {
    x: rightEdge - font.widthOfTextAtSize(rangoTxt, 9),
    y: height - M - 48,
    size: 9, font, color: GRIS
  })

  // Datos empresa
  y -= 22
  const lineasEmpresa = []
  if (empresa.identificacion) lineasEmpresa.push(`Cedula: ${sanitize(empresa.identificacion)}`)
  if (empresa.direccion) lineasEmpresa.push(truncate(empresa.direccion, 55))
  const contacto = [empresa.telefono, empresa.email].filter(Boolean).join(' · ')
  if (contacto) lineasEmpresa.push(sanitize(contacto))

  for (const l of lineasEmpresa) {
    page.drawText(l, { x: M, y, size: 9, font, color: GRIS })
    y -= 13
  }

  // Línea separadora
  const sepY = Math.min(y - 8, height - M - 66)
  page.drawLine({
    start: { x: M, y: sepY }, end: { x: rightEdge, y: sepY },
    thickness: 2, color: NEGRO
  })
  y = sepY - 26

  // ==========================================
  // RESUMEN — 4 tarjetas en fila
  // ==========================================
  page.drawText('RESUMEN DEL PERIODO', {
    x: M, y, size: 8, font: bold, color: GRIS
  })
  y -= 20

  const cardW = (usableWidth - 12) / 4
  const cardH = 54

  const tarjetas = [
    { label: 'VENTAS', valor: fmtNum(resumen.total_ventas), color: AZUL },
    { label: 'PEDIDOS', valor: String(resumen.total_pedidos), color: NEGRO },
    { label: 'TICKET PROM.', valor: fmtNum(resumen.ticket_promedio), color: NEGRO },
    { label: 'IMPUESTOS', valor: fmtNum(resumen.total_impuestos), color: NEGRO }
  ]

  for (let i = 0; i < tarjetas.length; i++) {
    const t = tarjetas[i]
    const x = M + i * (cardW + 4)
    page.drawRectangle({
      x, y: y - cardH,
      width: cardW, height: cardH,
      color: FONDO_SUAVE,
      borderColor: GRIS_CLARO,
      borderWidth: 0.5
    })
    page.drawText(t.label, {
      x: x + 8, y: y - 16, size: 7, font: bold, color: GRIS
    })
    page.drawText(truncate(t.valor, 15), {
      x: x + 8, y: y - 36, size: 11, font: bold, color: t.color
    })
  }

  y -= cardH + 30

  // ==========================================
  // VENTAS POR MES
  // ==========================================
  page.drawText('VENTAS POR MES', {
    x: M, y, size: 8, font: bold, color: GRIS
  })
  y -= 18

  // Header tabla
  page.drawRectangle({
    x: M, y: y - 20,
    width: usableWidth, height: 22,
    color: NEGRO
  })
  const colMes = { x: M + 10, w: 200 }
  const colPedidos = { x: M + 220, w: 80 }
  const colVentas = { x: M + 300, w: 145 }

  const headerY = y - 14
  page.drawText('MES', { x: colMes.x, y: headerY, size: 8, font: bold, color: BLANCO })
  page.drawText('PEDIDOS', {
    x: colPedidos.x + colPedidos.w - bold.widthOfTextAtSize('PEDIDOS', 8),
    y: headerY, size: 8, font: bold, color: BLANCO
  })
  page.drawText('VENTAS (CRC)', {
    x: rightEdge - 10 - bold.widthOfTextAtSize('VENTAS (CRC)', 8),
    y: headerY, size: 8, font: bold, color: BLANCO
  })

  y -= 26

    // Filas
  const rowHeightMes = 20
  for (let i = 0; i < porMes.length; i++) {
    const m = porMes[i]
    if (y < 200) {
      page = pdf.addPage([595, 842])
      y = height - M
    }

    // Fondo alterno: cubre toda la fila
    if (i % 2 === 0) {
      page.drawRectangle({
        x: M,
        y: y - rowHeightMes,
        width: usableWidth,
        height: rowHeightMes,
        color: FONDO_SUAVE
      })
    }

    // Baseline centrado verticalmente dentro de la fila
    const baseline = y - 14

    page.drawText(fmtMes(m.mes), {
      x: colMes.x, y: baseline, size: 9.5, font, color: NEGRO
    })

    const pedidos = String(m.pedidos)
    page.drawText(pedidos, {
      x: colPedidos.x + colPedidos.w - font.widthOfTextAtSize(pedidos, 9.5),
      y: baseline, size: 9.5, font, color: NEGRO
    })

    const ventas = fmtNum(m.ventas)
    page.drawText(ventas, {
      x: rightEdge - 10 - bold.widthOfTextAtSize(ventas, 9.5),
      y: baseline, size: 9.5, font: bold, color: NEGRO
    })

    y -= rowHeightMes
  }

  // Total del rango
  page.drawLine({
    start: { x: M, y: y + 6 }, end: { x: rightEdge, y: y + 6 },
    thickness: 1, color: NEGRO
  })
  y -= 12

  const totalPedidos = porMes.reduce((s, m) => s + Number(m.pedidos), 0)
  const totalVentas = porMes.reduce((s, m) => s + Number(m.ventas), 0)

  page.drawText('TOTAL', {
    x: colMes.x, y, size: 10, font: bold, color: NEGRO
  })
  page.drawText(String(totalPedidos), {
    x: colPedidos.x + colPedidos.w - bold.widthOfTextAtSize(String(totalPedidos), 10),
    y, size: 10, font: bold, color: NEGRO
  })
  page.drawText(fmtNum(totalVentas), {
    x: rightEdge - 10 - bold.widthOfTextAtSize(fmtNum(totalVentas), 10),
    y, size: 10, font: bold, color: AZUL
  })

  y -= 40

  // ==========================================
  // TOP PRODUCTOS
  // ==========================================
  if (y < 220) {
    page = pdf.addPage([595, 842])
    y = height - M
  }

  page.drawText('TOP 10 PRODUCTOS', {
    x: M, y, size: 8, font: bold, color: GRIS
  })
  y -= 18

  page.drawRectangle({
    x: M, y: y - 20,
    width: usableWidth, height: 22,
    color: NEGRO
  })

  const colProd = { x: M + 10, w: 240 }
  const colCant = { x: M + 260, w: 60 }
  const colVentasP = { x: M + 330, w: 115 }

  page.drawText('PRODUCTO', { x: colProd.x, y: headerY, size: 8, font: bold, color: BLANCO })
  page.drawText('CANT.', {
    x: colCant.x + colCant.w - bold.widthOfTextAtSize('CANT.', 8),
    y: headerY, size: 8, font: bold, color: BLANCO
  })
  page.drawText('VENTAS', {
    x: rightEdge - 10 - bold.widthOfTextAtSize('VENTAS', 8),
    y: headerY, size: 8, font: bold, color: BLANCO
  })

  y -= 26

  if (topProductos.length === 0) {
    page.drawText('Sin ventas de productos en el periodo.', {
      x: M, y, size: 9, font, color: GRIS
    })
    y -= 20
  } else {
        const rowHeightProd = 20
    for (let i = 0; i < topProductos.length; i++) {
      const p = topProductos[i]
      if (y < 130) {
        page = pdf.addPage([595, 842])
        y = height - M
      }

      if (i % 2 === 0) {
        page.drawRectangle({
          x: M,
          y: y - rowHeightProd,
          width: usableWidth,
          height: rowHeightProd,
          color: FONDO_SUAVE
        })
      }

      const baseline = y - 14

      page.drawText(truncate(p.producto_nombre, 42), {
        x: colProd.x, y: baseline, size: 9, font, color: NEGRO
      })

      const cant = String(Number(p.cantidad_total).toFixed(0))
      page.drawText(cant, {
        x: colCant.x + colCant.w - font.widthOfTextAtSize(cant, 9),
        y: baseline, size: 9, font, color: NEGRO
      })

      const ventas = fmtNum(p.ventas_total)
      page.drawText(ventas, {
        x: rightEdge - 10 - bold.widthOfTextAtSize(ventas, 9),
        y: baseline, size: 9, font: bold, color: NEGRO
      })

      y -= rowHeightProd
    }
  }

  y -= 30

  // ==========================================
  // TOP VENDEDORES
  // ==========================================
  if (y < 220) {
    page = pdf.addPage([595, 842])
    y = height - M
  }

  page.drawText('VENTAS POR VENDEDOR', {
    x: M, y, size: 8, font: bold, color: GRIS
  })
  y -= 18

  page.drawRectangle({
    x: M, y: y - 20,
    width: usableWidth, height: 22,
    color: NEGRO
  })

  const colVend = { x: M + 10, w: 240 }
  const colPedV = { x: M + 260, w: 60 }
  const colVentasV = { x: M + 330, w: 115 }

  page.drawText('VENDEDOR', { x: colVend.x, y: headerY, size: 8, font: bold, color: BLANCO })
  page.drawText('PEDIDOS', {
    x: colPedV.x + colPedV.w - bold.widthOfTextAtSize('PEDIDOS', 8),
    y: headerY, size: 8, font: bold, color: BLANCO
  })
  page.drawText('VENTAS', {
    x: rightEdge - 10 - bold.widthOfTextAtSize('VENTAS', 8),
    y: headerY, size: 8, font: bold, color: BLANCO
  })

  y -= 26

  if (topVendedores.length === 0) {
    page.drawText('Sin ventas de vendedores en el periodo.', {
      x: M, y, size: 9, font, color: GRIS
    })
    y -= 20
  } else {
        const rowHeightVend = 20
    for (let i = 0; i < topVendedores.length; i++) {
      const v = topVendedores[i]
      if (y < 130) {
        page = pdf.addPage([595, 842])
        y = height - M
      }

      if (i % 2 === 0) {
        page.drawRectangle({
          x: M,
          y: y - rowHeightVend,
          width: usableWidth,
          height: rowHeightVend,
          color: FONDO_SUAVE
        })
      }

      const baseline = y - 14

      page.drawText(truncate(v.vendedor, 42), {
        x: colVend.x, y: baseline, size: 9, font, color: NEGRO
      })

      const pedidos = String(v.pedidos)
      page.drawText(pedidos, {
        x: colPedV.x + colPedV.w - font.widthOfTextAtSize(pedidos, 9),
        y: baseline, size: 9, font, color: NEGRO
      })

      const ventas = fmtNum(v.ventas)
      page.drawText(ventas, {
        x: rightEdge - 10 - bold.widthOfTextAtSize(ventas, 9),
        y: baseline, size: 9, font: bold, color: NEGRO
      })

      y -= rowHeightVend
    }
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
      truncate(`${empresa.nombre} · Reporte generado ${fmtFechaCorta(new Date().toISOString())}`, 65),
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