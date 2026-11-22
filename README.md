# MentorLagbe Server

Production Express API for **MentorLagbe — Smart Tuition & Mentorship Platform**. It powers the role-based Next.js client with MongoDB, BetterAuth sessions, JWT role guards, Stripe Pro subscriptions, and ImgBB image uploads.

- Frontend reference deployment: `https://mentorlagbe-client.vercel.app/` (replace after your own deploy)
- API health check: `GET /api/health`
- Admin seed login: `admin@mentorlagbe.com` / `Admin@12345` (**local seed only — change before production**)

## Quick start

```bash
npm install
cp .env.example .env      # fill in the real values
npm run seed              # optional: load 10 users, 14 tuitions, 8 applications, 5 payments
npm run dev               # http://localhost:5000
npm run check             # syntax check every JS file
npm start                 # production-style start
```

`npm run seed` is idempotent: it clears the domain collections and BetterAuth tables, then recreates the connected demo dataset.

## Environment variables

Copy `.env.example` to `.env`. Nothing in `.env` is committed.

| Variable | Purpose |
| --- | --- |
| `PORT`, `NODE_ENV` | Server port and runtime mode |
| `MONGO_URI`, `MONGO_TRANSACTIONS` | MongoDB connection; enable transactions only on a replica set/Atlas |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | BetterAuth secret and public base URL |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Signs the bearer token stored by the frontend |
| `CLIENT_URL`, `CORS_ORIGIN` | Frontend origin for redirects, OAuth and CORS (comma-separated allowed) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout sessions and signed webhook fulfillment |
| `STRIPE_TUTOR_PRICE_ID`, `STRIPE_STUDENT_PRICE_ID` | Optional recurring Price IDs; without them a one-time `$15`/`$10` session is created |
| `IMGBB_KEY` | Server-side image upload proxy key (never exposed to the browser) |
| `SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD` | Passwords used only by `npm run seed` |

In production, `MONGO_URI`, `BETTER_AUTH_SECRET`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `IMGBB_KEY` are mandatory; startup fails fast if any are missing.

## API surface

Public:

- `GET /api/health`
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

- `POST /payments/checkout` → `{ url, sessionId }`; accepts `{ planId: "pro-student" | "pro-tutor", role }`
- `POST /payments/webhook` (raw Stripe signature), `GET /api/payments/verify?session_id=`
- `POST /api/upload/image` (multipart field `image`) → `{ url }`

All protected endpoints expect `Authorization: Bearer <token>`. The JWT is returned by `/api/auth/signin` and `/api/auth/signup`.

## Data design

The four domain collections follow the assignment brief exactly: `users`, `tuitions`, `applications`, `payments`. BetterAuth additionally stores its own `sessions`, `accounts`, and `verifications` records in MongoDB. Bookmarks are embedded in `users.bookmarks` so the domain model stays at four collections.

## Frontend wiring

In the Next.js app's `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://your-server-domain/api
NEXT_PUBLIC_UPLOAD_URL=https://your-server-domain/api/upload/image
```

`src/lib/api.js` already sends the bearer token and calls `/payments/checkout`, so no frontend code changes are needed for those helpers. Replace the demo store reads in `src/lib/data.js` and `src/lib/store.jsx` with `apiFetch` calls when you switch off demo mode.

## Deployment notes

- Use Node 18+ (the container image uses Node 20).
- Set every production environment variable, then run `npm start`.
- Point your load balancer/health check at `/api/health`.
- Add `https://your-server-domain/payments/webhook` to Stripe and set `STRIPE_WEBHOOK_SECRET` to the signing secret shown there.
- Add the deployed client domain to `CORS_ORIGIN` and `BETTER_AUTH_URL` to the deployed API URL.
- After the first deploy, run `npm run seed` once (with production-safe passwords) or create the admin manually, then change the seeded password.

## Packages used

`express`, `mongoose`, `mongodb`, `better-auth`, `jsonwebtoken`, `stripe`, `zod`, `multer`, `helmet`, `cors`, `compression`, `dotenv`.
