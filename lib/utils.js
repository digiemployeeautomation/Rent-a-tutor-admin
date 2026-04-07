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

/**
 * Build a video embed URL from a cloudflare_video_id value.
 * Handles YouTube URLs/IDs, Cloudflare UUIDs (with dashes), and raw hex IDs.
 * Returns { type: 'youtube'|'cloudflare'|null, src: string|null }
 */
export function resolveVideoSrc(raw) {
  if (!raw) return { type: null, src: null }
  const input = raw.trim()

  // YouTube: bare 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return { type: 'youtube', src: `https://www.youtube.com/embed/${input}?rel=0&modestbranding=1` }
  }

  // YouTube: full URL
  try {
    const url = new URL(input)
    let ytId = null
    if (url.hostname.includes('youtu.be')) ytId = url.pathname.slice(1).split('/')[0] || null
    if (url.hostname.includes('youtube.com')) {
      ytId = url.searchParams.get('v')
      if (!ytId) { const parts = url.pathname.split('/'); if (parts[1] === 'embed' && parts[2]) ytId = parts[2] }
    }
    if (ytId) return { type: 'youtube', src: `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1` }
  } catch {}

  // Cloudflare: strip dashes, validate hex
  const cfId = input.replace(/-/g, '')
  if (/^[a-fA-F0-9]{32,}$/.test(cfId)) {
    return { type: 'cloudflare', src: `https://iframe.cloudflarestream.com/${cfId}` }
  }

  return { type: null, src: null }
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
