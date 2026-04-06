# Production Audit Fix Patch

## Files changed (8)
- app/reports/page.js
- app/reviews/page.js
- app/tutors/page.js
- app/payments/page.js
- app/analytics/page.js
- app/api/admin/notify/route.js
- app/api/topic-requests/route.js
- app/logs/page.js

---

## Fix 1 — XSS in admin email templates

**Files:** app/api/admin/notify/route.js · app/api/topic-requests/route.js

User-supplied values (tutor name, subjects, report reason, topic description) were
interpolated directly into HTML email strings. A value containing `<script>` tags
would execute in the admin's email client.

Added an `esc()` helper that escapes `& < > " '` and applied it to every
user-supplied value before interpolation:

```js
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Before: `<td>${name}</td>`
// After:  `<td>${esc(name)}</td>`
```

---

## Fix 2 — Missing admin_id in admin_log inserts (reports and reviews)

**Files:** app/reports/page.js · app/reviews/page.js

`admin_log.admin_id` is NOT NULL. The resolve/dismiss/delete actions were
inserting without it, causing the insert to throw and silently swallow the
action outcome.

Added `admin_id: user.id` and basic error handling to all inserts. Also
added an `error` state to `ReportModal` so failures surface in the UI.

---

## Fix 3 — Ambiguous profiles join in tutors/page.js and payments/page.js

**Files:** app/tutors/page.js · app/payments/page.js

`profiles(full_name)` on the tutors table is ambiguous (tutors has both `id`
and `user_id` pointing at profiles). Names showed as "—" throughout the Tutors
and Payments pages.

```js
// Before
.select('id, ..., profiles(full_name)')
// After
.select('id, ..., profiles!user_id(full_name)')
```

Same fix applied to the nested join inside the lessons query and the
payout_requests → tutors → profiles chain.

---

## Fix 4 — Missing admin_log entries for flag/unflag lesson and revoke tutor

**File:** app/tutors/page.js

`flagLesson()`, `unflagLesson()`, and `revokeTutor()` performed write
operations but wrote nothing to `admin_log`. The Audit Log page has
`flag_lesson` and `unflag_lesson` entries in `ACTION_CONFIG` that were never
populated. All three functions now write a log entry with `admin_id`.

---

## Fix 5 — Analytics delta used wrong array indices

**File:** app/analytics/page.js

`revenueByMonth[5]` and `revenueByMonth[4]` were hardcoded. For 12-month
and all-time ranges these still pointed to positions 5 and 4, not the last
two months, producing a wrong MoM delta.

```js
// Before (wrong for non-6m ranges)
const thisM = revenueByMonth[5]?.value ?? 0
const lastM = revenueByMonth[4]?.value ?? 0

// After (always the last two entries)
const last = revenueByMonth[revenueByMonth.length - 1]?.value ?? 0
const prev = revenueByMonth[revenueByMonth.length - 2]?.value ?? 0
```

---

## Fix 6 — Revenue split removed

**Files:** app/analytics/page.js · app/payments/page.js · app/tutors/page.js

Removed the platform earnings KPI card from analytics (was ~27.5%),
the three-card revenue split summary from payments (was 30%/70%),
and the PLATFORM_SHARE constant that was added to tutors/page.js
in a prior draft.

---

## Fix 7 — Explicit FK hint in logs/page.js

**File:** app/logs/page.js

`profiles(full_name)` on admin_log uses the `admin_id` FK. Made it
explicit with `profiles!admin_id(full_name)` for consistency and
to guard against future schema changes adding a second FK.
