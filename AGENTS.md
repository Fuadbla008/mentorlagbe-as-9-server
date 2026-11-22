# AGENTS.md

## Commands

- `npm run dev` (port 5000), `npm start`, `npm run check` (syntax only), `npm run seed`. There are no lint, test, or typecheck scripts.
- `npm run seed` is destructive: it clears the domain collections and BetterAuth tables before recreating the demo dataset.
- Copy `.env.example` to `.env` (gitignored). Production startup fails fast without `MONGO_URI`, `BETTER_AUTH_SECRET`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `IMGBB_KEY`.

## Architecture quirks

- CommonJS throughout. BetterAuth is ESM-only: use `initAuth()` in `src/config/better-auth.js` (dynamic `import`), never `require("better-auth")`. `src/server.js` connects MongoDB and BetterAuth before creating the app.
- Route order in `src/routes/index.js` matters: tutor/admin routers mount before the public `GET /tuitions/:id`, otherwise `/tuitions/mine` is swallowed by the `:id` param.
- `POST /payments/webhook` uses `express.raw()` and is registered before `express.json()` in `src/app.js`. Moving it breaks Stripe signature verification.
- Express 5 uses `path-to-regexp` 8: `/*` and `/:id?` throw. Use `/*splat` (or `/{*splat}`) and `/{/:id}`.
- Four domain collections (`users`, `tuitions`, `applications`, `payments`); BetterAuth additionally writes `sessions`, `accounts`, and `verifications`. Bookmarks are embedded in `users.bookmarks`.

## Frontend contract

- Sibling project `../assignment 9/mentorlagbe` consumes this API. It sends `Authorization: Bearer <token>` from `/api/auth/signin`, expects `POST /payments/checkout` to return `{ url }`, and points `NEXT_PUBLIC_UPLOAD_URL` at `/api/upload/image`.
