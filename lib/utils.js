// lib/utils.js — Shared utility functions

/** Format an ISO date string for display (en-ZM locale) */
export function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZM', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Format an ISO date with time */
export function fmtDateTime(iso) {
  return new Date(iso).toLocaleDateString('en-ZM', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Escape HTML characters to prevent XSS in email templates */
export function esc(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
