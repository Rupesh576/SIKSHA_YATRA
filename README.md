# SIKSHA_YATRA — Teacher Learning Portal

Responsive Next.js prototype for Stemtech Innovation Foundation. It includes a branded landing page, email/password sign up and sign in, a protected dashboard, an authenticated content endpoint, an admin gate, and a Postgres schema for teacher accounts.

Authentication is self-hosted: passwords are hashed with bcrypt and sessions are signed JWTs in an httpOnly cookie, stored in a PostgreSQL database (tested against a Render Postgres instance, but any Postgres works).

## Run locally

1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `JWT_SECRET`, and `GOOGLE_DRIVE_CONTENT_URL`.
3. Apply `render-db/schema.sql` to your Postgres database: `psql "$DATABASE_URL" -f render-db/schema.sql`. It creates a `siksha_yatra` schema with a single `users` table, so it's safe to share a database with other projects.
4. Run `npm run dev`.

## Admin user management

Set `ADMIN_EMAILS` to a comma-separated list of trusted admin email addresses. An allowlisted admin can open `/admin` to review teacher profile details, block/unblock sign-in, or permanently remove an account. There is no separate admin role in the database — any account whose email is in `ADMIN_EMAILS` gets admin access.

## Google Sheets setup

Create a Sheet named `Teacher Portal Users` with a `Users` tab, enable Sheets API, create a service account, and share the sheet with that service account. Add its server-only credentials to `.env.local`. `workers/sheet-sync.ts` is a safe starting point for a managed worker; it is not currently wired into the app.

## Deployment

Deploy to Vercel and/or Render, add the same environment variables there, and point `DATABASE_URL` at your production Postgres instance. If the web service and database are both on Render, use the internal connection string for lower latency; otherwise use the external one.

## Production-readiness backlog

- Add rate limiting and abuse monitoring on the signup/signin endpoints.
- Add structured error reporting and admin retry actions.
- Add password reset / forgot-password flow.
- Replace the temporary admin email allowlist with a database-backed role claim and audit logging.
- Run load/security tests before making any capacity or production-readiness claim.
