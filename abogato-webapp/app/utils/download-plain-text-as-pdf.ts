import { jsPDF } from 'jspdf'

function sanitizePdfFileName(name: string) {
  const s = name
    .trim()
    .replace(/[^\p{L}\p{N}\s._-]+/gu, '_')
    .replace(/\s+/g, '_')
  return (s || 'documento').slice(0, 120)
}

/**
 * Genera un PDF A4 con texto plano (saltos de línea respetados) y lo descarga en el navegador.
 */
export function downloadPlainTextAsPdf(title: string, body: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const margin = 18
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - margin * 2
  const lineHeight = 5.5
  let y = margin

  const t = title.trim()
  if (t) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    const titleLines = doc.splitTextToSize(t, maxWidth)
    for (const line of titleLines) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += lineHeight + 0.8
    }
    y += 3
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
  }

  const normalized = body.replace(/\r\n/g, '\n')
  const paragraphs = normalized.split('\n')

  for (const para of paragraphs) {
    const chunk = para.length ? para : ' '
    const lines = doc.splitTextToSize(chunk, maxWidth)
    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += lineHeight
    }
    y += 2
  }

  const baseName = t || 'documento'
  doc.save(`${sanitizePdfFileName(baseName)}.pdf`)
}
