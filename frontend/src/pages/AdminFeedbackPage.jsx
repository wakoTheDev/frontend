import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatTimestamp } from '../lib/formatDate'
import { replyToFeedback } from '../lib/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { jsPDF } from 'jspdf'

const FEEDBACK_TYPE_OPTIONS = [
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'bug', label: 'Problem' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'other', label: 'Other' },
]

const FEEDBACK_BUCKET = 'feedback-screenshots'

function csvEscape(value) {
  const v = value === null || value === undefined ? '' : String(value)
  return `"${v.replace(/"/g, '""')}"`
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

function typeLabel(type) {
  return FEEDBACK_TYPE_OPTIONS.find((o) => o.value === type)?.label || type || '—'
}

async function fetchImageAsDataUrl(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Image fetch failed')
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(blob)
  })
}

function getJSPDFImageFormat(dataUrl) {
  // jsPDF addImage expects 'JPEG' or 'PNG' (webp often fails); fall back gracefully.
  if (!dataUrl || typeof dataUrl !== 'string') return null
  if (dataUrl.startsWith('data:image/png')) return 'PNG'
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG'
  return null
}

async function signScreenshotPaths(paths) {
  const signedExpirySeconds = 60 * 60 * 24 * 7 // 7 days
  return Promise.all(
    (paths || []).map(async (path) => {
      const { data, error } = await supabase.storage.from(FEEDBACK_BUCKET).createSignedUrl(path, signedExpirySeconds)
      if (error) return null
      return data?.signedUrl || null
    }),
  ).then((urls) => urls.filter(Boolean))
}

export default function AdminFeedbackPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [typeFilter, setTypeFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [feedback, setFeedback] = useState([])

  // Reply modal
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyTarget, setReplyTarget] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [replySuccess, setReplySuccess] = useState('')

  const activeFilters = useMemo(() => {
    if (ratingFilter === 'all') return { typeFilter, ratingMode: 'all', dateFrom, dateTo }
    if (ratingFilter === '0') return { typeFilter, ratingMode: 'none', dateFrom, dateTo }
    return { typeFilter, ratingMode: 'value', ratingNum: Number(ratingFilter), dateFrom, dateTo }
  }, [typeFilter, ratingFilter, dateFrom, dateTo])

  async function fetchFeedbackData(filters) {
    setLoading(true)
    setError('')

    let query = supabase
      .from('feedback')
      .select('id,type,message,rating,survey,screenshot_paths,created_at,user_email')
      .order('created_at', { ascending: false })

    if (filters.typeFilter !== 'all') {
      query = query.eq('type', filters.typeFilter)
    }

    if (filters.ratingMode === 'value') {
      query = query.eq('rating', filters.ratingNum)
    } else if (filters.ratingMode === 'none') {
      query = query.is('rating', null)
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', `${filters.dateFrom}T00:00:00Z`)
    }

    if (filters.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59Z`)
    }

    const { data, error: qErr } = await query
    if (qErr) {
      setError(qErr.message || 'Failed to load feedback')
      setLoading(false)
      return
    }

    const rows = data || []

    // Generate signed URLs for previews/downloads.
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const screenshot_paths = row.screenshot_paths || []
        const screenshot_urls = await signScreenshotPaths(screenshot_paths)
        return { ...row, screenshot_urls }
      }),
    )

    setFeedback(enriched)
    setLoading(false)
  }

  useEffect(() => {
    fetchFeedbackData(activeFilters)
  }, [activeFilters])

  const onExportCSV = () => {
    const header = [
      'Submission date',
      'Feedback type',
      'Message',
      'Rating',
      'Survey comments',
      'Screenshot paths',
      'User email',
    ]

    const rows = feedback.map((f) => {
      return [
        f.created_at ? new Date(f.created_at).toISOString() : '',
        typeLabel(f.type),
        f.message || '',
        f.rating ?? '',
        f.survey || '',
        (f.screenshot_paths || []).join(';'),
        f.user_email || '',
      ]
    })

    const csv = [header.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n')
    downloadBlob(csv, `CropCare-Feedback-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')
  }

  const onExportExcel = () => {
    // Excel can open CSV; we set an Excel-ish mime.
    const header = [
      'Submission date',
      'Feedback type',
      'Message',
      'Rating',
      'Survey comments',
      'Screenshot paths',
      'User email',
    ]

    const rows = feedback.map((f) => {
      return [
        f.created_at ? new Date(f.created_at).toISOString() : '',
        typeLabel(f.type),
        f.message || '',
        f.rating ?? '',
        f.survey || '',
        (f.screenshot_paths || []).join(';'),
        f.user_email || '',
      ]
    })

    const csv = [header.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n')
    downloadBlob(csv, `CropCare-Feedback-${new Date().toISOString().slice(0, 10)}.csv`, 'application/vnd.ms-excel;charset=utf-8')
  }

  const onExportPDF = async () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const marginX = 14
    let y = 16

    doc.setFontSize(16)
    doc.text('CropCare — Feedback Report', marginX, y)
    y += 8

    doc.setFontSize(10)
    const dateRangeText = (() => {
      const parts = []
      if (dateFrom) parts.push(`From ${dateFrom}`)
      if (dateTo) parts.push(`To ${dateTo}`)
      if (!parts.length) return 'All dates'
      return parts.join(' · ')
    })()
    doc.text(`Filters: Type=${typeFilter} Rating=${ratingFilter} ${dateRangeText}`, marginX, y)
    y += 8

    doc.setFontSize(11)
    if (!feedback.length) {
      doc.text('No feedback found for current filters.', marginX, y)
      doc.save(`CropCare-Feedback-${new Date().toISOString().slice(0, 10)}.pdf`)
      return
    }

    for (const [idx, f] of feedback.slice(0, 40).entries()) {
      if (y > 270) {
        doc.addPage()
        y = 16
      }

      const emailText = f.user_email ? `User: ${f.user_email}` : 'User: —'
      const screenshotCount = (f.screenshot_paths || []).length

      const line1 = `${idx + 1}. ${formatTimestamp(f.created_at)} — ${typeLabel(f.type)} — Rating: ${f.rating ?? '—'}`
      const wrapped1 = doc.splitTextToSize(line1, pageWidth - marginX * 2)
      doc.text(wrapped1, marginX, y)
      y += wrapped1.length * 5 + 2

      doc.setFont(undefined, 'normal')
      const metaLine = doc.splitTextToSize(`${emailText} · Screenshots: ${screenshotCount}`, pageWidth - marginX * 2)
      doc.text(metaLine, marginX, y)
      y += metaLine.length * 5 + 2

      const msg = f.message || ''
      const msgLines = doc.splitTextToSize(`Message: ${msg}`, pageWidth - marginX * 2)
      doc.text(msgLines, marginX, y)
      y += msgLines.length * 5 + 2

      if (f.survey) {
        const surveyLines = doc.splitTextToSize(`Survey: ${f.survey}`, pageWidth - marginX * 2)
        doc.text(surveyLines, marginX, y)
        y += surveyLines.length * 5 + 2
      }

      // Embed ALL attached screenshot thumbnails (otherwise show their storage paths).
      const screenshotUrls = f.screenshot_urls || []
      const screenshotPaths = f.screenshot_paths || []
      const thumbW = 60
      const thumbH = 36

      if (screenshotUrls.length) {
        for (let si = 0; si < screenshotUrls.length; si++) {
          const url = screenshotUrls[si]
          const path = screenshotPaths[si]
          if (!url) continue

          try {
            const dataUrl = await fetchImageAsDataUrl(url)
            const format = getJSPDFImageFormat(dataUrl)

            if (format) {
              if (y + thumbH > 280) {
                doc.addPage()
                y = 16
              }

              // Place thumbnails at the right side to preserve readability.
              doc.addImage(
                dataUrl,
                format,
                pageWidth - marginX - thumbW,
                y,
                thumbW,
                thumbH,
                undefined,
                'FAST',
              )
              y += thumbH + 6
            } else {
              const fallbackLine = doc.splitTextToSize(`Screenshot: ${path || '—'}`, pageWidth - marginX * 2)
              doc.text(fallbackLine, marginX, y)
              y += fallbackLine.length * 5 + 2
            }
          } catch {
            const fallbackLine = doc.splitTextToSize(`Screenshot: ${path || '—'}`, pageWidth - marginX * 2)
            doc.text(fallbackLine, marginX, y)
            y += fallbackLine.length * 5 + 2
          }
        }
      }
    }

    doc.save(`CropCare-Feedback-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const openReply = (row) => {
    setReplyTarget(row)
    setReplyMessage('')
    setReplyError('')
    setReplySuccess('')
    setReplyOpen(true)
  }

  const submitReply = async () => {
    setReplyLoading(true)
    setReplyError('')
    setReplySuccess('')
    try {
      if (!replyTarget?.id) throw new Error('Missing feedback id')
      if (!replyTarget?.user_email) throw new Error('Missing user email')
      if (!replyMessage.trim()) throw new Error('Reply message is required')

      const res = await replyToFeedback({
        feedbackId: replyTarget.id,
        userEmail: replyTarget.user_email,
        type: replyTarget.type,
        message: replyTarget.message,
        rating: typeof replyTarget.rating === 'number' ? replyTarget.rating : null,
        survey: replyTarget.survey,
        replyMessage: replyMessage.trim(),
      })

      setReplySuccess(res?.message || 'Reply sent.')
      // keep modal open so admin can see success
    } catch (err) {
      setReplyError(err.message || 'Failed to send reply')
    } finally {
      setReplyLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="glass-card dark:glass-card-dark rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Admin Feedback</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Review, filter, export, and optionally reply to user feedback submissions.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/30 backdrop-blur-sm border border-red-400/50 text-red-800 dark:text-red-200 text-sm" role="alert">
          {error}
        </div>
      )}

      <section className="glass-card dark:glass-card-dark rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Feedback type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-2 w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
              aria-label="Filter by feedback type"
            >
              <option value="all">All</option>
              {FEEDBACK_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Rating</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="mt-2 w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
              aria-label="Filter by rating"
            >
              <option value="all">All</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="0">No rating</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-2 w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
              aria-label="Filter date from"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-2 w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
              aria-label="Filter date to"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            type="button"
            onClick={() => fetchFeedbackData(activeFilters)}
            className="px-5 py-2 rounded-lg glass-button text-white font-medium disabled:opacity-50 transition-all"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('all')
              setRatingFilter('all')
              setDateFrom('')
              setDateTo('')
            }}
            className="px-5 py-2 rounded-lg glass-input text-slate-900 dark:text-slate-100 font-medium hover:bg-white/40 backdrop-blur-sm transition-all"
          >
            Reset
          </button>
          <div className="ml-auto flex flex-wrap gap-3">
            <button type="button" onClick={onExportCSV} className="px-5 py-2 rounded-lg glass-input text-slate-900 dark:text-slate-100 font-medium hover:bg-white/40 backdrop-blur-sm transition-all">
              Export CSV
            </button>
            <button type="button" onClick={onExportExcel} className="px-5 py-2 rounded-lg glass-input text-slate-900 dark:text-slate-100 font-medium hover:bg-white/40 backdrop-blur-sm transition-all">
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => {
                onExportPDF().catch((e) => {
                  console.error('Export PDF failed:', e)
                })
              }}
              className="px-5 py-2 rounded-lg glass-input text-slate-900 dark:text-slate-100 font-medium hover:bg-white/40 backdrop-blur-sm transition-all"
            >
              Export PDF
            </button>
          </div>
        </div>
      </section>

      <section className="glass-card dark:glass-card-dark rounded-2xl p-6">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead>
              <tr className="text-slate-600 dark:text-slate-300">
                <th className="py-3 px-3">Feedback Type</th>
                <th className="py-3 px-3">Message</th>
                <th className="py-3 px-3">Rating</th>
                <th className="py-3 px-3">Survey comments</th>
                <th className="py-3 px-3">Attached screenshots</th>
                <th className="py-3 px-3">Submission date</th>
                <th className="py-3 px-3">User email</th>
                <th className="py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700">
              {feedback.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 px-3 text-slate-600 dark:text-slate-300">
                    No feedback found for the current filters.
                  </td>
                </tr>
              ) : (
                feedback.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="py-3 px-3 font-medium">{typeLabel(row.type)}</td>
                    <td className="py-3 px-3">
                      <details>
                        <summary className="cursor-pointer text-emerald-600 dark:text-emerald-400">
                          View message
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">
                          {row.message || '—'}
                        </p>
                      </details>
                    </td>
                    <td className="py-3 px-3">{typeof row.rating === 'number' && row.rating > 0 ? `${row.rating}/5` : '—'}</td>
                    <td className="py-3 px-3">
                      {row.survey ? (
                        <details>
                          <summary className="cursor-pointer text-emerald-600 dark:text-emerald-400">
                            View
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">
                            {row.survey}
                          </p>
                        </details>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {(row.screenshot_urls || []).length ? (
                        <div className="flex flex-wrap gap-3">
                          {(row.screenshot_urls || []).map((url, idx) => (
                            <div key={`${row.id}_${idx}`} className="w-24">
                              <img
                                src={url}
                                alt={`Screenshot ${idx + 1}`}
                                className="w-24 h-16 object-cover rounded border border-slate-200/50 dark:border-slate-700"
                              />
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 block text-xs text-emerald-600 dark:text-emerald-400 underline"
                              >
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3">{formatTimestamp(row.created_at)}</td>
                    <td className="py-3 px-3">{row.user_email || '—'}</td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => openReply(row)}
                        className="px-3 py-1.5 rounded-lg glass-button text-white font-medium bg-emerald-600 hover:bg-emerald-500 transition-all"
                      >
                        Reply
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {replyOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-slate-900/70"
            onClick={() => setReplyOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl glass-card dark:glass-card-dark rounded-2xl p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Reply to feedback</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Sending will email the user: <span className="font-medium">{replyTarget?.user_email || '—'}</span>
            </p>

            {replyError && (
              <div className="p-3 rounded-lg bg-red-500/30 border border-red-400/50 text-red-800 dark:text-red-200 text-sm mb-3" role="alert">
                {replyError}
              </div>
            )}
            {replySuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-900 dark:text-emerald-200 text-sm mb-3" role="status" aria-live="polite">
                {replySuccess}
              </div>
            )}

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Your reply</span>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={6}
                  className="mt-2 w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                  placeholder="Write a short reply to help the user..."
                  aria-label="Reply message"
                />
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={submitReply}
                  disabled={replyLoading || !replyMessage.trim()}
                  className="px-5 py-2 rounded-lg glass-button text-white font-medium disabled:opacity-50 transition-all"
                >
                  {replyLoading ? 'Sending...' : 'Send email reply'}
                </button>
                <button
                  type="button"
                  onClick={() => setReplyOpen(false)}
                  className="px-5 py-2 rounded-lg glass-input text-slate-900 dark:text-slate-100 font-medium hover:bg-white/40 backdrop-blur-sm transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

