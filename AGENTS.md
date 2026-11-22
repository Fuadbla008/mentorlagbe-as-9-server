# AGENTS.md

## Commands

- `npm run dev` (port 5000), `npm start`, `npm run check` (syntax only), `npm run seed`, `npm run smoke`. There are no lint, test, or typecheck scripts.
- `npm run seed` is destructive: it clears the domain collections and BetterAuth tables before recreating the demo dataset.
- `npm run smoke` boots the app on a random port and verifies seeded counts, public/protected routes, and graceful degradation of unconfigured integrations. Run it after seeding.
- Copy `.env.example` to `.env` (gitignored). Production startup fails fast without `MONGO_URI`, `BETTER_AUTH_SECRET`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, and `IMGBB_KEY`. `STRIPE_WEBHOOK_SECRET` is optional.

## Architecture quirks

- CommonJS throughout. BetterAuth is ESM-only: use `initAuth()` in `src/config/better-auth.js` (dynamic `import`), never `require("better-auth")`. `src/server.js` connects MongoDB and BetterAuth before creating the app.
- Route order in `src/routes/index.js` matters: tutor/admin routers mount before the public `GET /tuitions/:id`, otherwise `/tuitions/mine` is swallowed by the `:id` param.
- Role guards are attached per route, never with `router.use(verifyTutor)` at the top of a router. These routers are mounted at `/`, so a router-level guard would run on every public request and return 401/403 for the whole API.
- `POST /payments/webhook` uses `express.raw()` and is registered before `express.json()` in `src/app.js`. Moving it breaks Stripe signature verification.
- Express 5 uses `path-to-regexp` 8: `/*` and `/:id?` throw. Use `/*splat` (or `/{*splat}`) and `/{/:id}`.
- Four domain collections (`users`, `tuitions`, `applications`, `payments`); BetterAuth additionally writes `sessions`, `accounts`, and `verifications`. Bookmarks are embedded in `users.bookmarks`.
- Stripe Checkout works without a webhook secret: Checkout's `success_url` points at `GET /api/payments/return?session_id=...`, which verifies the paid session and redirects to the client success page. `GET /api/payments/verify?session_id=...` does the same for API clients. Webhook fulfillment is idempotent via the unique `stripeSessionId`.
- `API_URL` is the public API origin used to build that `success_url`; it defaults to `BETTER_AUTH_URL`, and in production both fall back to `https://mentorlagbe-as-9-server.onrender.com`. `CLIENT_URL` falls back to `https://mentorlagbe-client.vercel.app`, which is where the return route finally redirects.

## Deployment

- `render.yaml` is the Render blueprint. Values marked `sync: false` are entered in the Render dashboard; secrets are generated for `BETTER_AUTH_SECRET` and `JWT_SECRET`. Local and production differ only by environment values.
- Health check target: `GET /api/health`. Public runtime config: `GET /api/config`.
- The frontend expects `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_UPLOAD_URL` in the sibling project `../assignment 9/mentorlagbe/.env.local`. Set `API_URL` to the deployed server origin on Render.

## Frontend contract

- Sibling project `../assignment 9/mentorlagbe` consumes this API. It sends `Authorization: Bearer <token>` from `/api/auth/signin`, expects `POST /payments/checkout` to return `{ url }`, and points `NEXT_PUBLIC_UPLOAD_URL` at `/api/upload/image`.
- Checkout plan selection is derived from `req.user.role`; clients cannot request the other role's price. Free tutors are limited to 2 tuitions and free students to 5 bookmarks.
