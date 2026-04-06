# Bug Fix Patch — Tutor Application Review

## Files changed
- app/registrations/page.js
- app/dashboard/page.js
- components/layout/AdminShell.js  (minor: added /bundles to PAGE_TITLES)

---

## Fix 1 — Ambiguous `profiles` join (tutor names always null)

**Files:** registrations/page.js, dashboard/page.js

Supabase couldn't resolve which FK to use when joining `profiles` because
the `tutors` table has both `id` and `user_id`. The join silently returned
null, so every tutor appeared as "Tutor" with no name.

Changed every `profiles(...)` on a tutors query to `profiles!user_id(...)`:

```js
// BEFORE
.select('id, user_id, ..., profiles(full_name, avatar_url)')

// AFTER
.select('id, user_id, ..., profiles!user_id(full_name, avatar_url)')
```

Same fix applied to the nested join inside the lessons and reviews queries
on the dashboard:
```js
tutors(profiles!user_id(full_name))
```

---

## Fix 2 — Missing `admin_id` in `admin_log` inserts (approve/reject silently fails)

**Files:** registrations/page.js, dashboard/page.js

`admin_log.admin_id` is NOT NULL. Both `approveTutor` and `rejectTutor` were
inserting without it, causing the insert to throw. Because the functions
awaited the insert before calling `load()` / updating state, the entire
action appeared to hang — the tutor stayed in the list and no feedback
appeared.

Added `admin_id: user.id` to every `admin_log` insert:

```js
// BEFORE
await supabase.from('admin_log').insert({
  action: 'approve_tutor',
  target_type: 'tutor',
  target_id: id,
})

// AFTER
const { data: { user } } = await supabase.auth.getUser()
await supabase.from('admin_log').insert({
  admin_id:    user.id,   // ← added
  action:      'approve_tutor',
  target_type: 'tutor',
  target_id:   id,
})
```

The dashboard `rejectTutor` also now logs `meta: { reason }` for audit
trail consistency with the registrations page.

---

## Fix 3 — Ambiguous `profiles` join in `application_notes` + missing `.catch()`

**File:** registrations/page.js (ApplicationModal)

`application_notes` has an `author_id` FK to `profiles`. The generic
`profiles(full_name)` select was ambiguous, causing the query to fail.
Because the `Promise.all` had no `.catch()`, one failing query silently
swallowed all three results — docs, lessons, and notes all came back empty.

```js
// BEFORE
supabase.from('application_notes')
  .select('*, profiles(full_name)')

// AFTER
supabase.from('application_notes')
  .select('*, profiles!author_id(full_name)')
```

Added `.catch()` to the `Promise.all`:

```js
Promise.all([...])
  .then(([{ data: d }, { data: l }, { data: n }]) => { ... })
  .catch(err => {
    console.error('[ApplicationModal] failed to load tab data:', err)
    setLoadError(true)
  })
```

A red error banner now renders inside the modal when this fires so it's
visible rather than silently empty.

---

## Fix 4 — Warning when `user_id` is null on a tutor record

**File:** registrations/page.js (ApplicationModal, Lessons tab)

If `tutors.user_id` is null, the lessons query falls back to `tutors.id`
(the PK), which is wrong — `lessons.tutor_id` stores the auth user id.
Added a console warning and a visible amber banner in the Lessons tab
so this is diagnosable without digging through Supabase logs.

---

## Additional: `rejectTutor` on dashboard now logs the reason

**File:** dashboard/page.js

The dashboard quick-reject used `window.prompt` but never wrote the reason
to `admin_log.meta`. Now consistent with registrations/page.js.

---

## Signup flow reminder

The pending-tutor query filters with `.is('rejection_reason', null)`.
Ensure your main-site signup sets `rejection_reason` to `NULL` (not an
empty string `''`) when creating the `tutors` row, otherwise newly signed-up
tutors will never appear in the Pending tab.
