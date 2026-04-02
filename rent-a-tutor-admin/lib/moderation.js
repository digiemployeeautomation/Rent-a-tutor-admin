// ============================================================
//  lib/moderation.js  —  STANDALONE
//  Content moderation for Rent a Tutor
//
//  HOW TO ADD THIS TO THE PROJECT
//  ─────────────────────────────────────────────────────────
//  1. Drop this file into /lib/moderation.js
//
//  2. In your lesson upload API or tutor onboarding, call:
//       import { moderateContent } from '@/lib/moderation'
//       const result = await moderateContent({ text: lessonTitle + ' ' + description })
//       if (result.flagged) { /* block or warn */ }
//
//  3. Optional: run it in the lesson upload route (app/dashboard/tutor/upload/page.js)
//     before the supabase insert, or in a server-side API route.
//
//  4. To enable AI moderation (costs ~$0.001 per check):
//     - Add ANTHROPIC_API_KEY to your .env.local
//     - Set USE_AI_MODERATION=true in .env.local
//     - The same function signature works — no other changes needed.
//
//  DATABASE
//  ─────────────────────────────────────────────────────────
//  Requires the moderation_flags table from migration_v3.sql
//  Run this if you haven't already:
//    CREATE TABLE moderation_flags (
//      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//      target_type TEXT, target_id UUID,
//      matched_keywords TEXT[], severity TEXT DEFAULT 'low',
//      status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW()
//    );
// ============================================================

// ── Keyword lists by severity ─────────────────────────────────
const HIGH_SEVERITY = [
  // Fraud / scams
  'whatsapp me', 'contact me outside', 'pay me directly', 'bypass the platform',
  'mpesa directly', 'mobile money directly', 'off platform', 'my personal number',
  'wa.me/', 'bit.ly', 't.me/',
  // Inappropriate for students
  'explicit', 'adult content', 'nsfw', '18+', 'only fans', 'onlyfans',
]

const MEDIUM_SEVERITY = [
  // Spam / misleading
  'guaranteed pass', '100% pass', 'pass guaranteed', 'exam answers', 'exam leaks',
  'leaked paper', 'cheat', 'cheating', 'get rich', 'earn money fast',
  'miracle results', 'secret technique',
  // Contact harvesting
  'call me on', 'text me on', 'reach me on', 'my number is',
  'dm me', 'inbox me', 'message me privately',
]

const LOW_SEVERITY = [
  // Quality signals worth reviewing but not blocking
  'free outside', 'cheaper outside', 'other platform', 'competitor',
  'udemy', 'youtube for free', 'elsewhere cheaper',
]

// ── URL pattern ───────────────────────────────────────────────
const URL_PATTERN = /https?:\/\/(?!iframe\.cloudflarestream\.com)[^\s]+/gi

// ── Main function ─────────────────────────────────────────────
/**
 * Check content for policy violations.
 *
 * @param {Object} options
 * @param {string} options.text        - Text to check (title + description combined)
 * @param {string} [options.targetType] - 'lesson' | 'tutor_bio' | 'review'
 * @param {string} [options.targetId]   - UUID of the record being moderated
 * @returns {Promise<ModerationResult>}
 */
export async function moderateContent({ text, targetType = 'lesson', targetId = null }) {
  const useAI = process.env.USE_AI_MODERATION === 'true' && process.env.ANTHROPIC_API_KEY

  if (useAI) {
    return moderateWithAI({ text, targetType, targetId })
  }

  return moderateWithKeywords({ text, targetType, targetId })
}

// ── Keyword-based moderation (free, zero API cost) ────────────
async function moderateWithKeywords({ text, targetType, targetId }) {
  const lower   = (text ?? '').toLowerCase()
  const matched = { high: [], medium: [], low: [] }

  HIGH_SEVERITY.forEach(kw   => { if (lower.includes(kw))   matched.high.push(kw)   })
  MEDIUM_SEVERITY.forEach(kw => { if (lower.includes(kw))   matched.medium.push(kw) })
  LOW_SEVERITY.forEach(kw    => { if (lower.includes(kw))   matched.low.push(kw)    })

  const urlMatches = text.match(URL_PATTERN) ?? []
  if (urlMatches.length) matched.medium.push(...urlMatches.map(u => `url:${u}`))

  const allMatched = [...matched.high, ...matched.medium, ...matched.low]
  const flagged    = allMatched.length > 0
  const severity   = matched.high.length   ? 'high'
    : matched.medium.length ? 'medium'
    : matched.low.length    ? 'low'
    : null

  return {
    flagged,
    severity,
    matchedKeywords: allMatched,
    method:  'keyword',
    message: flagged ? buildMessage(severity, matched) : null,
    // Pass to saveFlag() if you want to persist to DB
    _meta: { targetType, targetId, matched },
  }
}

function buildMessage(severity, matched) {
  if (severity === 'high') {
    return `This content was flagged for review: it may contain off-platform contact details or inappropriate content (${matched.high.slice(0, 2).join(', ')}). Please remove and resubmit.`
  }
  if (severity === 'medium') {
    return `This content contains terms that need review before publishing. Please check: ${matched.medium.slice(0, 2).join(', ')}.`
  }
  return `This content has been flagged for a routine review.`
}

// ── AI-powered moderation (Anthropic — enable via env var) ────
//
// Cost estimate: ~$0.001–0.002 per check using claude-haiku-4-5
// For 200 lessons/month ≈ $0.30/month
//
async function moderateWithAI({ text, targetType, targetId }) {
  // ── UNCOMMENT THIS BLOCK WHEN READY TO ENABLE AI MODERATION ──
  /*
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You are a content moderator for a Zambian educational platform for O-Level and A-Level students.

Review this content and respond with ONLY valid JSON in this exact format:
{
  "flagged": true/false,
  "severity": "high" | "medium" | "low" | null,
  "reason": "brief reason if flagged, otherwise null",
  "categories": ["off_platform_contact", "inappropriate", "spam", "misleading", "safe"]
}

Flag content that:
- Asks students to contact the tutor outside the platform (high)
- Contains inappropriate content for minors (high)
- Claims guaranteed exam passes or leaks (medium)
- Harvests personal contact info (medium)
- Is clearly spam or misleading (low)

Content to review:
"""
${text.slice(0, 800)}
"""`,
      }],
    }),
  })

  const data    = await response.json()
  const rawText = data.content?.[0]?.text ?? '{}'
  const result  = JSON.parse(rawText.replace(/```json|```/g, '').trim())

  return {
    flagged:         result.flagged ?? false,
    severity:        result.severity ?? null,
    matchedKeywords: result.categories ?? [],
    method:          'ai',
    message:         result.reason ?? null,
    _meta:           { targetType, targetId, aiResult: result },
  }
  */

  // Fallback to keyword if AI block is commented out
  return moderateWithKeywords({ text, targetType, targetId })
}

// ── Persist flag to database ──────────────────────────────────
/**
 * Save a moderation flag to the DB for admin review.
 * Call this after moderateContent() if result.flagged === true.
 *
 * @param {Object} supabase   - Supabase client instance
 * @param {Object} result     - Return value from moderateContent()
 */
export async function saveFlag(supabase, result) {
  if (!result.flagged || !result._meta?.targetId) return

  const { targetType, targetId, matched } = result._meta
  await supabase.from('moderation_flags').upsert({
    target_type:       targetType,
    target_id:         targetId,
    matched_keywords:  result.matchedKeywords,
    severity:          result.severity,
    status:            'pending',
  }, { onConflict: 'target_type,target_id' })
}

// ── Quick-check helper for forms (client-side, no DB) ─────────
/**
 * Lightweight client-side check — runs only keywords, no network call.
 * Use this for real-time form feedback before submission.
 *
 * @param {string} text
 * @returns {{ flagged: boolean, message: string | null }}
 */
export function quickCheck(text) {
  const lower = (text ?? '').toLowerCase()
  const highHit = HIGH_SEVERITY.find(kw => lower.includes(kw))
  if (highHit) {
    return { flagged: true, message: `Please remove off-platform contact details or links before submitting.` }
  }
  const medHit = MEDIUM_SEVERITY.find(kw => lower.includes(kw))
  if (medHit) {
    return { flagged: true, message: `Your content contains a term that may require review: "${medHit}".` }
  }
  return { flagged: false, message: null }
}
