export function formatTimestamp(value, fallback = '—') {
  if (!value) return fallback
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return fallback
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return fallback
  }
}

