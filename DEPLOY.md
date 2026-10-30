# Deploying muse-ician to Vercel

muse-ician is a Vite single-page app plus three tiny serverless functions in `api/`.
Everything the app needs is already configured in `vercel.json`, so deployment is a
Git push and an import.

Recommended path: **connect the GitHub repo** (gives you preview deploys per branch).
CLI path is documented at the end.

---

## 1. Prerequisites

| Thing | Why | Check |
| --- | --- | --- |
| Node 20+ locally | `npm run check` uses it | `node -v` |
| The repo on GitHub | Vercel deploys from a Git provider | `git remote -v` |
| A Vercel account (free Hobby is fine) | hosting | [vercel.com](https://vercel.com) |

The build is fully self-contained: no database, no external service, no
mandatory environment variables. With zero env vars the app runs in **local mode**
(no AI, no live trends) and every other feature still works.

---

## 2. Deploy from the dashboard (recommended)

1. Push your branch:

   ```bash
   git add .
   git commit -m "muse-ician"
   git push origin YOUR_BRANCH
   ```

2. Go to **<https://vercel.com/new>** → **Import Git Repository** → pick `muse-ician`.
3. Vercel reads `vercel.json`, so the form is already correct:

   | Field | Value |
   | --- | --- |
   | Framework preset | **Vite** |
   | Build command | `npm run build` |
   | Output directory | `dist` |
   | Install command | `npm ci` |
   | Node version | 20.x or 22.x |

   Do **not** override them; if the dashboard shows something else, your
   `vercel.json` was not picked up (check that you pushed it).

4. Environment variables (optional — expand **Environment Variables** only if you
   want AI or live trends). For an OpenAI key the two lines that matter are
   `AI_PROVIDER=openai` and `AI_API_KEY=sk-...`; add `AI_MODEL=gpt-4o-mini` for the
   cheapest sensible default. Set them for **Production and Preview**, then
   redeploy — Vercel does not rebuild when you only add a variable.

   ```dotenv
   AI_PROVIDER=openai            # openai | anthropic | custom (OpenAI-compatible)
   AI_API_KEY=sk-...             # server-only secret
   AI_MODEL=gpt-4o-mini          # optional
   AI_BASE_URL=                  # only for AI_PROVIDER=custom
   AI_TIMEOUT_MS=30000           # optional
   ```

   | Variable | Purpose |
   | --- | --- |
   | `TREND_PROVIDER_URL` | Your own trend-feed endpoint (must return `{ items: [...] }`) |
   | `TREND_PROVIDER_NAME` | Label shown in the UI |
   | `TREND_PROVIDER_TOKEN` | Bearer token sent to that endpoint |

   Add them to **Production** *and* **Preview** if you use both. Never prefix them
   with `VITE_` — anything named `VITE_*` is inlined into the public JavaScript.

5. **Deploy.** First build takes about a minute.

6. After it finishes, open `https://<your-app>.vercel.app/api/status`. You should
   see:

   ```json
   { "ok": true, "ai": { "configured": false, "reason": "No AI provider is configured…" }, "trends": { "configured": false } }
   ```

   `configured: false` with a reason is the **correct** result in local mode. If
   you added keys and it still says false, the variables were added to the wrong
   environment or you did not redeploy.

---

## 3. Deploy with the CLI

```bash
npm i -g vercel
vercel login

vercel            # preview deployment → prints a URL
vercel --prod     # production deployment
```

Add secrets non-interactively (or paste them in the dashboard):

```bash
vercel env add AI_API_KEY production
vercel env add AI_PROVIDER production
vercel --prod
```

---

## 4. How the pieces map to Vercel

| Repo path | Becomes |
| --- | --- |
| `dist/` | Static files on the global CDN |
| `api/ai.ts` | Serverless function at `/api/ai` |
| `api/trends.ts` | Serverless function at `/api/trends` |
| `api/status.ts` | Serverless function at `/api/status` |
| `api/_lib/**` | Shared, non-routed helpers (underscore = not a route) |
| `rewrites` in `vercel.json` | SPA fallback, so `/calendar` deep links don't 404. `api/` is excluded. |
| `functions` in `vercel.json` | `maxDuration: 60` for AI calls (Hobby allows up to 60s) |
| `headers` in `vercel.json` | Immutable caching for hashed assets + security headers |

The same handlers are mounted as dev middleware by `vite.config.ts`, so
`/api/*` behaves identically on `npm run dev` and on Vercel. That plugin does not
ship to production — on Vercel the functions are compiled from `api/`.

---

## 5. Custom domain and previews

- **Domain:** Project → *Settings → Domains → Add*; point the DNS record Vercel shows you.
- **Previews:** every branch/PR gets its own URL automatically. Data is per-browser,
  so a preview can never touch your production library.
- **Rollback:** *Deployments → ⋯ → Promote to Production*.

---

## 6. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Deep links 404 | `rewrites` missing from the deployed `vercel.json`; redeploy after adding it |
| Build fails on `tsc -b` | Type error — run `npm run check` locally first; Vercel surfaces the same output |
| `/api/ai` returns 503 `not_configured` | No `AI_API_KEY` in that environment, or you didn't redeploy after adding it |
| `/api/ai` returns 504 `timeout` | Provider too slow — raise `AI_TIMEOUT_MS` (max 60000) or use a faster model |
| `/api/ai` returns 429 `rate_limited` | Provider quota; the UI shows this message and keeps working without AI |
| `/api/trends` returns 501 | No `TREND_PROVIDER_URL`. Trends are intentionally not fabricated |
| Blank page after deploy | Assets 404 — the output directory must be `dist`, not `build` |
| Install button never appears | `beforeinstallprompt` needs HTTPS, a production build and a reachable `/sw.js`. It will not appear on `npm run dev` |
| `/sw.js` serves the old app | Bump `CACHE_VERSION` in `public/sw.js`; the old cache is deleted on activate |
| `/api/ai` returns 401 or 403 | The key is wrong, revoked or has no credit — the message comes from your provider, not from muse-ician |
| `npm ci` fails | `package-lock.json` out of date relative to `package.json`; run `npm install` and commit the lockfile |

---

## 7. After the first deploy

- Open **Settings → Connect OpenAI** and press **Test connection**. It sends one
  small request through `/api/ai` and reports the real result.
- The app is installable from the browser's "Install app" / "Add to Home Screen"
  action. The service worker caches the shell, so the preset library, ideas,
  rubric, metadata, calendar and journal keep working offline.
- Nothing is published, scheduled or posted by the deployment. Calendar rows are
  planning records; the social platforms never see this app.

---

## 8. Deploying somewhere that is not Vercel

The frontend is plain static output (`dist/`) and can go on Netlify, Cloudflare
Pages, GitHub Pages or S3. Two caveats:

1. **SPA fallback** — configure the host to rewrite unknown paths to `/index.html`.
2. **`/api/*`** — these are Node-style handlers, not static files. Port them to
  your host's function format (Netlify Functions, Cloudflare Workers), or deploy
   only the frontend and accept that AI and live trends stay off. The app detects
   the missing endpoints and explains it instead of breaking.

GitHub Pages also needs `base` set in `vite.config.ts` if you serve from a
sub-path.
