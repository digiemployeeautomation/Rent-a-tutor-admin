# Rent a Tutor — Admin Dashboard

Standalone admin console for [Rent a Tutor](https://rentatutor.co.zm).  
Connects to the **same Supabase project** as the main site — no separate database.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database / Auth**: Supabase (shared with main site)
- **Payments**: MoneyUnify (tutor payouts)
- **Email alerts**: Resend
- **Hosting**: Vercel (deploy as `admin.rentatutor.co.zm`)

## Pages

| Route | Description |
|---|---|
| `/login` | Admin-only login — non-admins are rejected |
| `/dashboard` | Live stats, pending approvals, open reports |
| `/registrations` | Review tutor applications + documents |
| `/tutors` | Manage approved tutors, review lesson videos |
| `/reports` | Handle complaints and reports |
| `/reviews` | Moderate student reviews |
| `/analytics` | Revenue charts, growth, top subjects |
| `/announcements` | Broadcast messages to students/tutors |
| `/coupons` | Create and manage discount codes |
| `/bundles` | Manage exam prep bundles |
| `/payments` | Transactions + automated tutor payouts |
| `/users` | All users — students and tutors |

## Setup

### 1. Clone and install
```bash
git clone https://github.com/your-org/rent-a-tutor-admin
cd rent-a-tutor-admin
npm install
```

### 2. Environment variables
```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key (same values as main site)
```

### 3. Run the SQL migrations
Run **both** migration files in your Supabase SQL Editor:
- `supabase_admin_migration.sql`
- `supabase_admin_migration_v2.sql`

### 4. Create an admin account
In Supabase Table Editor → `profiles`, set `role = 'admin'` for your user.

### 5. Run locally
```bash
npm run dev   # Runs on http://localhost:3001
```

## Deployment (Vercel)

1. Push to GitHub
2. Import into Vercel
3. Set the same env vars as `.env.local.example`
4. In Vercel → Domains → add `admin.rentatutor.co.zm`

The admin app is fully independent — it runs as a separate Vercel deployment
on the admin subdomain.

## Security notes

- `middleware.js` verifies admin role on **every** protected route server-side
- Non-admin users who somehow reach the login page are rejected after DB role check
- All Supabase tables use RLS policies that restrict admin-only operations to `role = 'admin'`
- MoneyUnify auth key and Resend key are **server-side only** — never in client bundles
