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

Weightly treats code size as a product constraint. `npm run loc` counts nonblank runtime lines under `src/` and `worker/` and fails above **650 LOC**. Tests are reported separately. The MVP intentionally avoids an ORM and chart library.

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

For production, use the Worker API hostname, for example:

```text
https://api.weightly.example.com/api/auth/callback/google
```

Set Worker secrets rather than committing them:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

`WEB_ORIGIN` must be the Pages origin and `BETTER_AUTH_URL` must be the Worker API origin. For the simplest cookie behavior in production, use custom hostnames under the same parent domain (for example `weightly.example.com` and `api.weightly.example.com`).

## Deploy

### Worker

1. Create production D1 and replace the placeholder `database_id` in `wrangler.toml`.
2. Set `WEB_ORIGIN` and `BETTER_AUTH_URL` to production values.
3. Apply migrations and deploy.

```bash
npx wrangler d1 migrations apply weightly --remote
npm run worker:deploy
```

### Pages

Create a Cloudflare Pages project from this repository:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE=https://<worker-api-host>`

## Checks

```bash
npm test
npm run build
npm run worker:check
npm run loc
```

Tracked in #1.
