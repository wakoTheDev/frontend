import { jsPDF } from 'jspdf'

function getUnitsPreference() {
  try {
    const s = localStorage.getItem('cropcare-app-settings')
    const parsed = s ? JSON.parse(s) : {}
    return parsed.units === 'imperial' ? 'Imperial' : 'Metric'
  } catch {
    return 'Metric'
  }
}

export async function exportAnalysisPDF(analyses, includeImages = true) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  doc.setFontSize(18)
  doc.text('AI-Powered-CropCare — Analysis Export', 14, y)
  y += 8
  doc.setFontSize(10)
  doc.text(`Units: ${getUnitsPreference()}`, 14, y)
  y += 10

  doc.setFontSize(11)
  for (let i = 0; i < analyses.length; i++) {
    const a = analyses[i]
    if (y > 260) {
      doc.addPage()
      y = 20
    }
    doc.setFont(undefined, 'bold')
    doc.text(`Analysis ${i + 1}`, 14, y)
    y += 6
    doc.setFont(undefined, 'normal')
    doc.text(`Time: ${a.timeTaken != null ? a.timeTaken + 's' : '—'}  |  Accuracy: ${a.accuracyRate != null ? a.accuracyRate + '%' : '—'}  |  Recovery: ${a.recoveryRate != null ? a.recoveryRate + '%' : '—'}${a.cropType ? '  |  Crop/leaf: ' + a.cropType : ''}`, 14, y)
    y += 6
    if (a.recommendations) {
      const recLines = doc.splitTextToSize('Recommendations: ' + String(a.recommendations), pageWidth - 28)
      doc.text(recLines, 14, y)
      y += recLines.length * 5 + 4
    }
    if (a.insights) {
      const insLines = doc.splitTextToSize('Insights: ' + String(a.insights), pageWidth - 28)
      doc.text(insLines, 14, y)
      y += insLines.length * 5 + 4
    }
    if (includeImages && a.imageUrl) {
      try {
        // Handle remote image URLs (e.g. Supabase Storage) and data URLs
        if (typeof a.imageUrl === 'string') {
          if (a.imageUrl.startsWith('data:')) {
            // Data URL (base64)
            doc.addImage(a.imageUrl, 'JPEG', 14, y, 60, 40)
            y += 45
          } else if (a.imageUrl.startsWith('http://') || a.imageUrl.startsWith('https://')) {
            // Supabase Storage / public URL - fetch and convert to data URL
            try {
              const imgResponse = await fetch(a.imageUrl)
              const imgBlob = await imgResponse.blob()
              const reader = new FileReader()
              const dataUrl = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result)
                reader.onerror = reject
                reader.readAsDataURL(imgBlob)
              })
              doc.addImage(dataUrl, 'JPEG', 14, y, 60, 40)
              y += 45
            } catch (imgErr) {
              console.warn('Failed to load image for PDF:', imgErr)
              doc.text('(Image available at: ' + a.imageUrl.substring(0, 50) + '...)', 14, y)
              y += 8
            }
          } else {
            doc.text('(Image URL: ' + a.imageUrl.substring(0, 50) + '...)', 14, y)
            y += 8
          }
        }
      } catch (err) {
        console.warn('Error adding image to PDF:', err)
        y += 5
      }
    }
    y += 10
  }

  doc.save(`CropCare-Analysis-${new Date().toISOString().slice(0, 10)}.pdf`)
}
