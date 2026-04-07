// lib/rate-limit.js
// Distributed rate limiter using Upstash Redis (works on Vercel serverless).
// Falls back to in-memory when UPSTASH env vars are missing (local dev only).

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Upstash-backed limiters (production) ────────────────────────
let redis = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

// Cache Ratelimit instances by config so we don't recreate on every call
const limiters = new Map()

function getUpstashLimiter(limit, windowMs) {
  const key = `${limit}:${windowMs}`
  if (!limiters.has(key)) {
    const windowSec = Math.max(1, Math.round(windowMs / 1000))
    limiters.set(key, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: 'rat-admin-rl',
    }))
  }
  return limiters.get(key)
}

// ── In-memory fallback (local dev only) ─────────────────────────
const buckets = new Map()

function inMemoryRateLimit(key, limit, windowMs) {
  const now = Date.now()
  const timestamps = (buckets.get(key) || []).filter(t => now - t < windowMs)

  if (timestamps.length >= limit) {
    buckets.set(key, timestamps)
    return { limited: true, remaining: 0 }
  }

  timestamps.push(now)
  buckets.set(key, timestamps)
  return { limited: false, remaining: limit - timestamps.length }
}

// ── Public API (same signature as before) ───────────────────────

/**
 * Check if a request should be rate limited.
 * @param {string} key - Unique key (e.g. IP address or user ID)
 * @param {number} limit - Max requests per window
 * @param {number} windowMs - Window size in milliseconds (default 60s)
 * @returns {Promise<{ limited: boolean, remaining: number }>}
 */
export async function rateLimit(key, limit, windowMs = 60_000) {
  if (!redis) {
    return inMemoryRateLimit(key, limit, windowMs)
  }

  const limiter = getUpstashLimiter(limit, windowMs)
  const { success, remaining } = await limiter.limit(key)
  return { limited: !success, remaining }
}
