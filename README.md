# Diaspora Insurance welcome desk

A responsive visitor welcome desk built from the **Diaspora Insurance** Figma page: onboarding, check-in, QR scanning, confirmation, check-out and authorised reception registration. The wider Blackspot CRM and records dashboard are outside scope.

## Run locally

Use **Node.js 24 LTS** and npm 11. From the repository root:

```sh
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). Express listens on `127.0.0.1:8080`. The root command builds shared contracts, then watches all three workspaces. The interface and QR work without Google credentials; saving and staff sign-in show an explicit unavailable state until configured. There is no alternate production storage or authentication bypass.

| Command             | Purpose                                                         |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Shared compiler, Express and Next development servers           |
| `npm run build`     | Compile shared/backend, then produce a Next production build    |
| `npm start`         | Run compiled backend and Next; run build first                  |
| `npm run lint`      | ESLint and Prettier checks                                      |
| `npm run typecheck` | Strict checks across all workspaces                             |
| `npm test`          | Critical API, persistence, concurrency and authentication tests |
| `npm run format`    | Format source and documentation                                 |

## Google configuration

1. Enable **Google Sheets API** in a Google Cloud project. Create a service account and a private key. Share the target spreadsheet with its service-account email as **Editor**. Keep the key outside Git.
2. Create a tab named `Visitors`, or set `GOOGLE_SHEET_TAB`. Leave it empty for automatic headers, or retain the previous application's exact A:K headers:

   `Visit ID | First Name | Last Name | Phone Number | Email | Purpose of Visit | Sign-in Time | Sign-out Time | Sign-in Method | Sign-out Method | Visit Status`

3. In `backend/.env`, set `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`. The ID is the segment after `/d/` in the spreadsheet URL. Encode key newlines as `\n` inside a quoted environment value. Never place service-account credentials in frontend variables.
4. For reception access, create a Google OAuth **Web application** client, configure its consent screen/test users and add `http://localhost:3000/auth/google/callback` as an authorised redirect URI. Set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_CALLBACK_URL` and comma-separated `RECEPTIONIST_EMAILS`. Only verified, allowlisted Google emails gain access.
5. Set `APP_BASE_URL` to the public frontend origin. The generated QR links to that origin. A phone cannot reach another machine's `localhost`; use a reachable HTTPS hostname when testing on a phone. Camera access requires HTTPS or localhost and browser permission.

The service creates UTC ISO timestamps automatically and displays them in `TIME_ZONE` (default `Africa/Lagos`) using British English. It preserves historical purpose values, methods and VST references. New visits follow the design's four-field form. References contain cryptographic randomness to prevent guessing. Check-out requires the original reference and returns no personal data.

## Environment variables

The examples document all settings. `backend/.env` is loaded relative to the backend workspace for both development and production.

| Variable                                                                            | Default / purpose                                                                         |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `PORT`                                                                              | `8080`, backend port                                                                      |
| `APP_BASE_URL`                                                                      | `http://localhost:3000`, canonical frontend origin for QR, OAuth and origin checks        |
| `TIME_ZONE`                                                                         | `Africa/Lagos`, receipt display                                                           |
| `SESSION_KEYS`                                                                      | Comma-separated cookie signing keys, newest first; temporary random local key if absent   |
| `RECEPTIONIST_EMAILS`                                                               | Staff email allowlist, empty by default                                                   |
| `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_TAB`                                               | Spreadsheet and tab                                                                       |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`                                | Server-only Sheets credentials                                                            |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_CALLBACK_URL` | Server-only staff identity configuration                                                  |
| `TRUST_PROXY_HOPS`                                                                  | `0` by default; example uses `1` for the Next proxy. Match the real trusted proxy chain   |
| `NODE_ENV`                                                                          | Set `production` for production backend                                                   |
| `BACKEND_URL`                                                                       | Frontend server-only rewrite target, default `http://127.0.0.1:8080`; set before building |

Generate a signing key with `openssl rand -hex 48`. Production requires HTTPS `APP_BASE_URL` and signing keys of at least 48 characters. Deploy Next and Express on the same host (Express binds to loopback), place Next behind a TLS reverse proxy and set the correct proxy-hop count. Configure Google's production redirect URI and rebuild with the correct `BACKEND_URL`. Run `NODE_ENV=production npm start` after `npm run build`. Runtime starts use compiled files and a native Node.js process runner; they do not need tsx, the shared watcher or development dependencies. After building, `npm prune --omit=dev` is supported.

Signed HttpOnly, Secure-in-production, SameSite cookies expire after eight hours. OAuth uses state, nonce and PKCE. Staff writes require CSRF tokens; every staff request rechecks the allowlist. Cookies contain minimal staff identity and no Google tokens. Individual stolen cookies cannot be revoked centrally with this stateless design; remove an email from the allowlist (restart required), rotate signing keys to revoke all sessions, or replace the session implementation when introducing a conventional database. The frontend serves security headers and keeps all requests same-origin.

## Architecture and persistence limits

- `frontend/src/app`: App Router pages and metadata. `components`: reusable brand, shell and controls. `features/visits`: forms, scanner, receipts and staff flow. `lib`: API client.
- `backend/src/routes` → `controllers` → `services` → `repositories/visit-repository.ts`. The Google Sheets implementation owns row mapping, header checks, caching and row positions; `integrations` owns Google's transport and identity clients. Configuration and middleware are centralised.
- `shared/src`: Zod schemas, provider-independent domain models and API contracts. Production consumers import compiled ESM, using the single root lockfile.

Run **exactly one backend instance** and make it the only writer. A FIFO queue covers duplicate checks and updates. Sheets does not offer transactions across application instances; manual row sorting/deletion while running is unsupported. The repository bounds reads to 20,000 visits and refuses further writes at capacity; archive only while the server is stopped. Reads are briefly cached, with fresh reads on each exclusive operation. Safe requests use bounded exponential backoff with jitter and timeouts. Appends are never automatically retried; an ambiguous result is reconciled by reference or reported for reception to resolve. RAW writes prevent spreadsheet formula interpretation.

To migrate, implement `VisitRepository` with database transactions/unique constraints and change dependency construction in `app.ts`; controllers, services, frontend contracts and validation stay the same. No second database or CMS is included.

See [the research and implementation plan](docs/implementation-plan.md) for screen/node evidence, API contracts, assumptions and official references. Figma did not provide separate check-out or staff authentication layouts; these reuse its visual system. The supplied delivery plan and questions response PDFs have now been reviewed as supporting context; [the requirements review](docs/requirements-review.md) maps their relevant requirements and distinguishes the wider website/CMS proposals from this task. The supplied Verdana Pro font was not available, so headings use system Verdana with Inter fallback; body Inter is bundled locally. Brand images were exported directly from Figma.

The supporting documents also raise deployment matters that this code does not establish: DI's approved hosting/Google data location, identity-provider MFA policy, visitor retention/deletion policy, and backup/monitoring/recovery arrangements. These remain unverified; no automated retention, backup or monitoring services are included. The requirements review records these limits without expanding the Figma scope.

## Verification without Google credentials

`npm test` uses a test-only Sheets transport and Google identity double, exercising the real Express routes, validation, services and repository without touching live visitor records. To exercise successful flows manually in a browser, stop normal development, then run these commands in separate terminals:

```sh
NODE_ENV=test npm exec -w backend -- tsx tests/browser-server.ts
BACKEND_URL=http://127.0.0.1:4001 npm run dev
```

The fixture listens on 4001, keeps test rows in memory and simulates reception authentication. It is excluded from the production build. Records disappear when it stops. Restart ordinary `npm run dev` afterwards. Live Sheets access, actual Google login and physical-camera scanning must also be verified with deployment credentials and a camera-enabled device.

## Port configuration

`backend/.env` sets Express `PORT` (default 8080). The frontend proxy derives its target from that same file through `config/network.mjs`, avoiding a separate mismatched API port. `frontend/.env.local` sets `FRONTEND_PORT` (default 3000); Next receives an explicit CLI port and fails rather than silently choosing another port. Use `BACKEND_PORT` to override the API port from the shell and `FRONTEND_PORT` for the web port. Next sets its own `PORT` internally, so the proxy deliberately does not use that variable. `BACKEND_URL` remains an optional server-only proxy override for remote APIs; rebuild after changing production proxy configuration. If changing the frontend port, also update `APP_BASE_URL` and the registered Google OAuth callback URL. Startup logs show the actual listeners.

The repository also accepts the existing ordered header labels `Phone`, `Purpose`, `Signed In At`, `Signed Out At`, `Sign In Method`, `Sign Out Method` and `Status`, without rewriting them.

Real Google OAuth and Sheets test results, cleanup and remaining camera limitations are recorded in [the port-fix verification report](docs/port-verification.md).

## Vercel frontend build

Select `frontend` as the project Root Directory and enable access to source files outside that directory (needed for `shared` and `config`). Use the workspace build command `npm run build`, install development dependencies for compilation, and select Node.js **24.x** in the Vercel project settings. The frontend build now compiles its shared dependency first. Set `BACKEND_URL` to the deployed API origin before building. Vercel’s Node 26 selection in the failed log does not match this repository’s supported Node 24 engine. This addresses build configuration; the previously documented Sheets write-coordination constraint still applies to a serverless backend.
