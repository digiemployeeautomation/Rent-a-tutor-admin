// lib/rate-limit.js
// Simple in-memory sliding-window rate limiter for API routes.
// For production at scale, replace with Redis or Vercel Edge rate limiting.

const buckets = new Map()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of buckets) {
    const valid = timestamps.filter(t => now - t < 60_000)
    if (valid.length === 0) buckets.delete(key)
    else buckets.set(key, valid)
  }
}, 5 * 60_000)

/**
 * Check if a request should be rate limited.
 * @param {string} key - Unique key (e.g. IP address or user ID)
 * @param {number} limit - Max requests per window
 * @param {number} windowMs - Window size in milliseconds (default 60s)
 * @returns {{ limited: boolean, remaining: number }}
 */
export function rateLimit(key, limit, windowMs = 60_000) {
  const now = Date.now()
  const timestamps = (buckets.get(key) ?? []).filter(t => now - t < windowMs)

  if (timestamps.length >= limit) {
    buckets.set(key, timestamps)
    return { limited: true, remaining: 0 }
  }

  timestamps.push(now)
  buckets.set(key, timestamps)
  return { limited: false, remaining: limit - timestamps.length }
}
