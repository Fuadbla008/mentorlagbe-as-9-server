# MentorLagbe Server

Production Express API for **MentorLagbe — Smart Tuition & Mentorship Platform**. It powers the role-based Next.js client with MongoDB, BetterAuth sessions, JWT role guards, Stripe Pro subscriptions, and ImgBB image uploads.

- API health check: `GET /api/health`
- Admin seed login: `admin@mentorlagbe.com` / `Admin@12345` (**local seed only — change before production**)

## Quick start

```bash
npm install
cp .env.example .env      # fill in the real values
npm run seed              # optional: load 10 users, 14 tuitions, 8 applications, 5 payments
npm run smoke             # verify data + routes against the local server
npm run dev               # http://localhost:5000
npm run check             # syntax check every JS file
npm start                 # production-style start
```

`npm run seed` is idempotent: it clears the domain collections and BetterAuth tables, then recreates the connected demo dataset. `npm run smoke` boots the real app on a random port and checks the seeded counts, public routes, JWT role guards, and graceful handling of unconfigured integrations. It needs no Stripe or ImgBB credentials.

## Environment variables

Copy `.env.example` to `.env`. Nothing in `.env` is committed.

| Variable | Purpose |
| --- | --- |
| `PORT`, `NODE_ENV` | Server port and runtime mode |
| `MONGO_URI`, `MONGO_TRANSACTIONS` | MongoDB connection; enable transactions only on a replica set/Atlas |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | BetterAuth secret and public base URL |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Signs the bearer token stored by the frontend |
| `CLIENT_URL`, `CORS_ORIGIN` | Frontend origin for redirects, CORS and checkout redirects (comma-separated allowed) |
| `STRIPE_SECRET_KEY` | Creates Checkout sessions |
| `STRIPE_PUBLISHABLE_KEY` | Non-secret key exposed to the client through `GET /api/config` |
| `STRIPE_WEBHOOK_SECRET` | **Optional.** Enables signed webhook fulfillment |
| `STRIPE_TUTOR_PRICE_ID`, `STRIPE_STUDENT_PRICE_ID` | Optional Price IDs; without them a one-time `$15`/`$10` session is created |
| `STRIPE_TUTOR_AMOUNT`, `STRIPE_STUDENT_AMOUNT` | Fallback amounts in USD when no Price ID is set |
| `IMGBB_KEY` | Server-side image upload proxy key (never exposed to the browser) |
| `SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD` | Passwords used only by `npm run seed` |

In production, `MONGO_URI`, `BETTER_AUTH_SECRET`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, and `IMGBB_KEY` are mandatory; startup fails fast if any are missing. `STRIPE_WEBHOOK_SECRET` is intentionally optional — without it, webhooks are disabled and Pro activation happens through `GET /api/payments/verify?session_id=...` after the Checkout redirect.

## API surface

Public:

- `GET /api/health`
- `GET /api/config` → non-secret publishable key, plan prices, and integration flags
- `GET /api/tuitions?q=&subject=&classLevel=&mode=&page=&limit=&sort=` → `{ items, total, totalPages, page }`
- `GET /api/tuitions/featured?limit=6`, `GET /api/tuitions/:id`
- `GET /api/stats`

Auth (`/api/auth/*`):

- `POST /signup`, `POST /signin`, `POST /signout`, `GET /me`
- BetterAuth's native endpoints are also mounted at `/auth/*`

Student:

- `PUT /api/profile`, `GET /api/profile`
- `POST /api/applications`, `GET /api/applications/mine`, `DELETE /api/applications/:id`
- `GET /api/bookmarks/mine`, `POST /api/bookmarks`

Tutor:

- `POST /api/tuitions`, `GET /api/tuitions/mine`, `PUT /api/tuitions/:id`, `DELETE /api/tuitions/:id`, `PATCH /api/tuitions/:id/status`
- `GET /api/applications/incoming`, `PATCH /api/applications/:id/status`

Admin:

- `GET /api/admin/users`, `PATCH /api/admin/users/:id/role`
- `GET /api/admin/tuitions`, `PATCH /api/admin/tuitions/:id/approval`
- `GET /api/admin/payments`, `GET /api/admin/stats`

Payments and media:

- `POST /api/payments/checkout` → `{ url, sessionId }`; the signed-in role decides the plan, so a mismatched `planId` is rejected
- `POST /payments/webhook` (raw Stripe signature), `GET /api/payments/verify?session_id=...`
- `POST /api/upload/image` (multipart field `image`) → `{ url }`

All protected endpoints expect `Authorization: Bearer <token>`. The JWT is returned by `/api/auth/signin` and `/api/auth/signup`.

## Data design

The four domain collections follow the assignment brief exactly: `users`, `tuitions`, `applications`, `payments`. BetterAuth additionally stores its own `sessions`, `accounts`, and `verifications` records in MongoDB. Bookmarks are embedded in `users.bookmarks` so the domain model stays at four collections. The seed dataset contains 10 users, 14 tuitions (12 approved and active), 8 connected applications, and 5 payments.

## Frontend wiring

In the Next.js app's `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://your-server-domain/api
NEXT_PUBLIC_UPLOAD_URL=https://your-server-domain/api/upload/image
```

Use `http://localhost:5000/api` for local development. `src/lib/api.js` already sends the bearer token and calls `/payments/checkout`, so no frontend code changes are needed for those helpers. Replace the demo store reads in `src/lib/data.js` and `src/lib/store.jsx` with `apiFetch` calls when you switch off demo mode. A Stripe publishable key can be read from `GET /api/config` instead of being hardcoded in the client.

## Deployment

### Render (blueprint)

`render.yaml` defines a Node web service with `npm ci` and `npm start`, and health checking at `/api/health`.

1. Push this repo to GitHub (already done).
2. In Render, choose **New → Blueprint** and select this repository.
3. Fill in only the `sync: false` values in the dashboard: `MONGO_URI`, `BETTER_AUTH_URL`, `CLIENT_URL`, `CORS_ORIGIN`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `IMGBB_KEY`, and optionally `STRIPE_WEBHOOK_SECRET`/Price IDs. `BETTER_AUTH_SECRET` and `JWT_SECRET` are generated automatically.
4. Deploy. No code changes are required between local and production; only environment values differ.

### Other hosts

- Use Node 18+ (the included Dockerfile uses Node 20).
- Set the production environment variables and run `npm start`.
- Point the health check at `/api/health`.
- Add `https://your-server-domain/payments/webhook` in Stripe and copy its signing secret into `STRIPE_WEBHOOK_SECRET` if you want webhook fulfillment. Without it, the verify endpoint handles activation.
- Set `CORS_ORIGIN` and `CLIENT_URL` to the deployed client domain, and `BETTER_AUTH_URL` to the deployed API URL.
- After the first deploy, run `npm run seed` once (with production-safe passwords) or create the admin manually, then change the seeded password.

## Packages used

`express`, `mongoose`, `mongodb`, `better-auth`, `jsonwebtoken`, `stripe`, `zod`, `multer`, `helmet`, `cors`, `compression`, `dotenv`.
