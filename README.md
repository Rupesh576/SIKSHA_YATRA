# Teacher Learning Portal MVP

Responsive Next.js prototype for Stemtech Innovation Foundation. It includes a branded landing page, Supabase email OTP and Google OAuth entry points, a protected dashboard, an authenticated content endpoint, an admin gate, and the PostgreSQL/outbox migration.

## Run locally

1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL/key and Drive folder URL.
3. In Supabase SQL Editor, run `supabase/migrations/0001_teacher_portal.sql`, `supabase/migrations/0002_teacher_profile_details.sql`, and `supabase/migrations/0003_admin_user_management.sql` in order. If earlier migrations have already been applied, run only the ones not yet applied.
4. Enable Email OTP and Google provider in Supabase Auth. Add `http://localhost:3000/auth/callback` to redirect URLs.
5. Run `npm run dev`.

Without Supabase values, the landing page still renders and shows a clear setup message when a login method is selected.

## Admin user management

Set `ADMIN_EMAILS` to a comma-separated list of trusted admin email addresses and configure the server-only `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and the deployment environment. Never expose the service role key in a `NEXT_PUBLIC_` variable. An allowlisted admin can open `/admin` to review teacher profile details, block/unblock sign-in, or permanently remove an account.

## Google Sheets setup

Create a Sheet named `Teacher Portal Users` with a `Users` tab, enable Sheets API, create a service account, and share the sheet with that service account. Add its server-only credentials to `.env.local`. `workers/sheet-sync.ts` is a safe starting point for a managed worker; it should be connected to the `sheet_sync_jobs` outbox with claiming, retries, idempotent `user_id` lookups, and reconciliation before production.

## Deployment

Deploy to Vercel, add the same environment variables, and register the production callback URL in both Supabase and Google Cloud. `GOOGLE_DRIVE_CONTENT_URL` is only gated by the app endpoint; Drive sharing permissions still control the underlying content.

## Production-readiness backlog

- Configure durable queue/worker, idempotent Sheet upserts, exponential backoff and reconciliation.
- Add rate limiting, abuse monitoring, structured error reporting and admin retry actions.
- Test OAuth identity linking, email-provider quotas, backups, RLS policies and representative peak concurrency.
- Replace the temporary admin email allowlist with a database-backed role claim and audit logging.
- Run load/security tests before making any capacity or production-readiness claim.
