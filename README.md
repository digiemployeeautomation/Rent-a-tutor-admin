# Admin Console — Audit Fixes

## Fix 1: Registrations docs tab (CRITICAL)
File: app/registrations/page.js  → FULL REPLACEMENT

The Docs tab was querying `tutor_documents` (never populated).
Now reads selfie_path / national_id_front_path / national_id_back_path
directly from the tutors row that the verify page actually writes.

Also adds: National ID number in Overview, verification status banner,
doc-count badge in the list view.

## Fix 2: Bundles removed
Files: components/layout/Sidebar.js  → FULL REPLACEMENT
       components/layout/AdminShell.js → FULL REPLACEMENT

/bundles removed from sidebar NAV and PAGE_TITLES map.
Delete app/bundles/page.js from your repo.
