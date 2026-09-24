# Weightly

A deliberately small weight logger that emphasizes the estimated trend instead of day-to-day noise.

## MVP

- Google sign-in with Better Auth
- Cloudflare Worker API + D1
- React/Vite frontend for Cloudflare Pages
- Automatic timestamp on weight entry
- Edit/delete weight, date, and time
- 30-day raw + EWMA trend chart
- 7-day / 30-day change, kg/week, and %/week
- EasyMoney-style **Input / Edit / Visualize** navigation

## Simplicity budget

Weightly treats code size as a product constraint. `npm run loc` counts nonblank runtime lines under `src/`, `worker/`, and `functions/` and fails above **650 LOC**. Tests are reported separately. The MVP intentionally avoids an ORM and chart library.

## Local setup

Requirements: Node 24+, a Cloudflare account, D1, and Google OAuth credentials.

```bash
npm install
cp .env.example .env.local
cp .dev.vars.example .dev.vars
npx wrangler d1 create weightly
```

Put the returned D1 `database_id` into `wrangler.toml`, then run:

```bash
npx wrangler d1 migrations apply weightly --local
npm run worker:dev
npm run dev
```

The defaults are frontend `http://localhost:5173` and API `http://localhost:8787`.

## Google / Better Auth

Create a Google OAuth Web client. Add this local redirect URI:

```text
http://localhost:8787/api/auth/callback/google
```

Production uses the Pages origin:

```text
https://weightly.kinn-kinn.com/api/auth/callback/google
```

Set production secrets in Cloudflare Pages:

- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Production

Weightly is deployed as a single-origin Cloudflare application:

- App: https://weightly.kinn-kinn.com
- Frontend: Cloudflare Pages
- API: Pages Functions under `/api/*`
- Database: D1 `weightly`

The Pages project is `weightly-web`. The custom domain points to `weightly-web.pages.dev`.

## Checks

```bash
npm test
npm run build
npm run worker:check
npm run loc
```

Tracked in #1 and #3.
