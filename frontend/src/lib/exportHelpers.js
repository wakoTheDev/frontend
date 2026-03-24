import { jsPDF } from 'jspdf'
import { exportAnalysisPDF as exportPDF } from './pdfExport'

/**
 * Export analyses in the chosen format.
 * @param {Array} analyses - List of analysis records
 * @param {Object} options - { format: 'pdf'|'csv'|'json'|'excel', includeImages: boolean, dateFrom?, dateTo? }
 * @returns {Promise<void>}
 */
export function exportAnalyses(analyses, options = {}) {
  const { format = 'pdf', includeImages = true, dateFrom, dateTo } = options
  let filtered = analyses
  if (dateFrom || dateTo) {
    filtered = analyses.filter((a) => {
      const t = a.timestamp ? new Date(a.timestamp).getTime() : 0
      if (dateFrom && t < new Date(dateFrom).getTime()) return false
      if (dateTo && t > new Date(dateTo).getTime()) return false
      return true
    })
  }

  const filename = `CropCare-Analysis-${new Date().toISOString().slice(0, 10)}`

  if (format === 'pdf') {
    return exportPDF(filtered, includeImages)
  }

  if (format === 'csv') {
    const header = 'Date,Time Taken (s),Accuracy (%),Recovery (%),Recommendations,Insights,Image URL'
    const rows = filtered.map((a) => {
      const date = a.timestamp ? new Date(a.timestamp).toLocaleString() : ''
      const rec = (a.recommendations || '').replace(/"/g, '""')
      const ins = (a.insights || '').replace(/"/g, '""')
      return `"${date}",${a.timeTaken ?? ''},${a.accuracyRate ?? ''},${a.recoveryRate ?? ''},"${rec}","${ins}","${a.imageUrl || ''}"`
    })
    const csv = [header, ...rows].join('\n')
    downloadBlob(csv, `${filename}.csv`, 'text/csv;charset=utf-8')
    return Promise.resolve()
  }

  if (format === 'json') {
    const data = filtered.map((a) => ({
      date: a.timestamp,
      timeTaken: a.timeTaken,
      accuracyRate: a.accuracyRate,
      recoveryRate: a.recoveryRate,
      recommendations: a.recommendations,
      insights: a.insights,
      imageUrl: includeImages ? a.imageUrl : undefined,
    }))
    const json = JSON.stringify(data, null, 2)
    downloadBlob(json, `${filename}.json`, 'application/json')
    return Promise.resolve()
  }

  if (format === 'excel') {
    // Excel: emit CSV with .xlsx extension hint or use same CSV (opens in Excel)
    const header = 'Date,Time Taken (s),Accuracy (%),Recovery (%),Recommendations,Insights'
    const rows = filtered.map((a) => {
      const date = a.timestamp ? new Date(a.timestamp).toLocaleString() : ''
      const rec = (a.recommendations || '').replace(/"/g, '""')
      const ins = (a.insights || '').replace(/"/g, '""')
      return `"${date}",${a.timeTaken ?? ''},${a.accuracyRate ?? ''},${a.recoveryRate ?? ''},"${rec}","${ins}"`
    })
    const csv = [header, ...rows].join('\n')
    downloadBlob(csv, `${filename}.csv`, 'application/vnd.ms-excel;charset=utf-8')
    return Promise.resolve()
  }
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function getSummaryStats(analyses) {
  if (!analyses.length) return { total: 0, avgAccuracy: 0, avgRecovery: 0, commonIssues: [] }
  const total = analyses.length
  const avgAccuracy = analyses.reduce((s, a) => s + (a.accuracyRate || 0), 0) / total
  const avgRecovery = analyses.reduce((s, a) => s + (a.recoveryRate || 0), 0) / total
  const issues = analyses.flatMap((a) => (a.recommendations || '').split(/[.!?]/).filter(Boolean).map((s) => s.trim().slice(0, 50)))
  const count = {}
  issues.forEach((i) => { count[i] = (count[i] || 0) + 1 })
  const commonIssues = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name)
  return { total, avgAccuracy: Math.round(avgAccuracy), avgRecovery: Math.round(avgRecovery), commonIssues }
}

/**
 * Export a statistics-focused PDF that mirrors the on-screen visualizations:
 * - Summary metrics (total analyses, averages)
 * - Simple trend overview by date
 * - Top recurring issues from recommendations
 */
export async function exportStatisticsReport(analyses, options = {}) {
  if (!analyses?.length) return

  const { includeImages = false } = options
  const stats = getSummaryStats(analyses)
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  doc.setFontSize(18)
  doc.text('AI-Powered CropCare — Statistics Overview', 14, y)
  y += 10

  doc.setFontSize(11)
  const dateRangeText = (() => {
    const sorted = [...analyses].sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return ta - tb
    })
    const first = sorted[0]?.timestamp ? new Date(sorted[0].timestamp) : null
    const last = sorted[sorted.length - 1]?.timestamp ? new Date(sorted[sorted.length - 1].timestamp) : null
    if (!first || !last) return 'Date range: N/A'
    return `Date range: ${first.toLocaleDateString()} → ${last.toLocaleDateString()}`
  })()

  doc.text(dateRangeText, 14, y)
  y += 8

  // Summary metrics section
  doc.setFont(undefined, 'bold')
  doc.text('Summary metrics', 14, y)
  y += 6
  doc.setFont(undefined, 'normal')
  doc.text(`Total analyses: ${stats.total}`, 14, y)
  y += 5
  doc.text(`Average accuracy: ${stats.avgAccuracy}%`, 14, y)
  y += 5
  doc.text(`Average recovery rate: ${stats.avgRecovery}%`, 14, y)
  y += 8

  // Simple "trend" table by date (like a textual visualization)
  doc.setFont(undefined, 'bold')
  doc.text('Daily trends (for charts)', 14, y)
  y += 6
  doc.setFont(undefined, 'normal')

  const byDate = {}
  analyses.forEach((a) => {
    if (!a.timestamp) return
    const d = new Date(a.timestamp)
    if (Number.isNaN(d.getTime())) return
    const key = d.toISOString().slice(0, 10)
    if (!byDate[key]) byDate[key] = { count: 0, accSum: 0, recSum: 0 }
    byDate[key].count += 1
    byDate[key].accSum += a.accuracyRate || 0
    byDate[key].recSum += a.recoveryRate || 0
  })

  const rows = Object.entries(byDate).sort(([d1], [d2]) => (d1 < d2 ? -1 : 1))
  rows.forEach(([date, v]) => {
    if (y > 260) {
      doc.addPage()
      y = 20
    }
    const avgAcc = v.count ? Math.round(v.accSum / v.count) : 0
    const avgRec = v.count ? Math.round(v.recSum / v.count) : 0
    const line = `${date}: ${v.count} analyses · Avg accuracy ${avgAcc}% · Avg recovery ${avgRec}%`
    const wrapped = doc.splitTextToSize(line, pageWidth - 28)
    doc.text(wrapped, 14, y)
    y += wrapped.length * 5 + 2
  })

  // Common issues section
  if (y > 240) {
    doc.addPage()
    y = 20
  }
  doc.setFont(undefined, 'bold')
  doc.text('Most common issues/themes', 14, y)
  y += 6
  doc.setFont(undefined, 'normal')
  if (!stats.commonIssues.length) {
    doc.text('No recurring issues detected yet.', 14, y)
    y += 6
  } else {
    stats.commonIssues.forEach((issue, idx) => {
      const text = `${idx + 1}. ${issue}`
      const wrapped = doc.splitTextToSize(text, pageWidth - 28)
      doc.text(wrapped, 14, y)
      y += wrapped.length * 5 + 2
    })
  }

  // Optional: attach a compact table of recent analyses (helps interpret charts)
  if (includeImages) {
    if (y > 230) {
      doc.addPage()
      y = 20
    }
    doc.setFont(undefined, 'bold')
    doc.text('Recent analyses (summary)', 14, y)
    y += 6
    doc.setFont(undefined, 'normal')
    const recent = [...analyses]
      .sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
        return tb - ta
      })
      .slice(0, 10)
    recent.forEach((a) => {
      if (y > 260) {
        doc.addPage()
        y = 20
      }
      const date = a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'
      const line = `• ${date} — Acc ${a.accuracyRate ?? 'N/A'}%, Rec ${a.recoveryRate ?? 'N/A'}%${a.cropType ? `, Crop: ${a.cropType}` : ''}`
      const wrapped = doc.splitTextToSize(line, pageWidth - 28)
      doc.text(wrapped, 14, y)
      y += wrapped.length * 5 + 2
    })
  }

  doc.save(`CropCare-Statistics-${new Date().toISOString().slice(0, 10)}.pdf`)
}
