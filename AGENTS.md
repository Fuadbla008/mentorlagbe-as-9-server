# AGENTS.md

## Repo state and commands

- `package.json` declares only `express` (`^5.3.0`, installed 5.3.0) and no scripts. There is no `npm start`, `npm test`, `npm run lint`, or build/typecheck step—don't assume one exists. Until scripts are added, verify with `node --check <file>` and a manual smoke request.
- `.js` files are CommonJS (`package.json` has no `"type": "module"`). Use `require`/`module.exports`, or set `"type": "module"` explicitly before writing ESM.
- npm-only dependency management (`package-lock.json` v3). Change dependencies with `npm install`; don't hand-edit the lockfile.

## Express 5 routing gotcha

- Routes use `path-to-regexp` 8, not Express 4 syntax: `/*` and `/:id?` throw. Use `/*splat` (or `/{*splat}`) for wildcards and `/{/:id}` for optional params.

## Intended integration

- Sibling project `../assignment 9/mentorlagbe` (MentorLagbe) documents the expected backend contract in its README. It sends `Authorization: Bearer <token>` and expects `POST /payments/checkout` to return `{ url }`.
- Backend-only secret names from that contract: `MONGO_URI`, `BETTER_AUTH_SECRET`, `JWT_SECRET`, `IMGBB_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Keep them in this server's `.env`; the frontend's `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_UPLOAD_URL` point here.
