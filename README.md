# muse-ician

**Turn your music into your next idea.**

muse-ician is a working, local-first workspace for independent musicians: it turns a song into a run of short-form video ideas, checks how filmable those ideas really are, writes platform-specific publishing copy, schedules the work, and records what happened — without inventing trends, analytics or virality promises.

It is an application, not a landing page. Everything described below is implemented in this repository.

---

## Contents

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [The main journey](#the-main-journey)
- [Feature tour](#feature-tour)
- [Creative Readiness rubric](#creative-readiness-rubric)
- [Metadata conventions per platform](#metadata-conventions-per-platform)
- [Trends: what muse-ician will and will not do](#trends-what-muse-ician-will-and-will-not-do)
- [Data, storage and privacy](#data-storage-and-privacy)
- [JSON import / export](#json-import--export)
- [Optional AI provider](#optional-ai-provider)
- [Optional trend provider](#optional-trend-provider)
- [Deployment](#deployment)
- [Design system](#design-system)
- [Scripts and testing](#scripts-and-testing)
- [Architecture](#architecture)
- [Known limitations](#known-limitations)
- [Accessibility](#accessibility)

---

## What it does

| Area | Behaviour |
| --- | --- |
| **Preset library** | 35 original, editable video formats — 30 short-form plus 5 long-form YouTube formats — with hooks, shot lists, execution steps, CTA examples, common mistakes and accessibility notes. Create, edit, duplicate, favourite, archive, export and import your own. |
| **Songs** | Song records with lyrics, themes, strongest lines, audio sections, release status/date, equipment, constraints and persona notes. Everything else can link to a song. |
| **Ideas** | Any preset becomes an editable idea tied to a real song. Idea workspace with plan, coach, A/B variant, reuse and version tabs. |
| **Creative coach** | A transparent 0–100 readiness score from six weighted components, always available offline, plus an optional AI review that never overwrites your original text. |
| **Filming plan** | Scene sequence, shot list, on-screen text, audio section, editing notes, CTA, estimated production time. |
| **Metadata studio** | Separate YouTube Shorts, Instagram Reels, TikTok and **long-form YouTube** packages — title, caption, description, search phrases, hashtags with reasons, pinned comment, cover concept, accessibility notes. **Batch mode** builds packages for many ideas at once and exports a spreadsheet-safe CSV. |
| **Content calendar** | Month / week / list views, drag-to-move posts (or Alt + ←/→ on a focused post), nine workflow statuses, filters, cadence control, and warnings for duplicate, clashing (3+ on one day) or overdue posts. |
| **Series planner** | Turn one preset into a 3–5 part arc. Four arc shapes, distinct job per part, saved as ideas plus calendar entries in one campaign. |
| **Release runway** | Works backwards from a song's release date: seed → build → tease → launch → sustain, with the real starter preset behind each step and a one-click "add missing steps to calendar". |
| **Campaign planner** | Generates a multi-week plan from the preset library for one song; every date and order stays editable. |
| **Performance journal** | Typed-in results compared against your own median, with observed/perceived language kept separate and honest caveats. Comparatives group by platform, preset, song or objective and refuse to rank anything under three posts. |
| **JSON interchange** | Versioned schema, validation with a preview, duplicate-ID strategies, real downloadable `example.json`, `muse-ician.schema.json`, starter pack and sample backups. A per-collection **merge review** shows exactly what a collaborator's file would add, conflict with or skip, with a copyable report. |
| **A/B variant lab** | Generates hook and caption options, scores them on clarity, curiosity, song specificity, length fit and CTA strength, and explains the score. Applying a variant is an explicit action. |
| **Reuse engine** | One finished idea becomes an X post, Story sequence, carousel, email, newsletter section, community post and lyric card — every draft traceable to the idea and song it came from. |
| **Readiness history** | Every saved review is stored against the version it graded, with a trend line and a plain-language delta. |
| **Command palette** | ⌘K / Ctrl-K or `/` opens records *and* actions (add a song, plan a campaign, build a series, import, export, settings). |
| **Installable / offline** | Web app manifest, service worker, shortcuts and a share target. Installed, the whole local-first app works offline; only AI and live trends need the network. |
| **Demo mode** | Sample campaign, clearly labelled `Demo data`, removable in one click from the dashboard or Settings. |

Nothing in the app publishes to a social platform, edits video, or claims to know your analytics.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Requires Node 20+. No environment variables are needed for the core app.

```bash
npm run check        # typecheck + tests + production build
```

Open the app, add a song (or press **Add demo data** to explore a labelled sample campaign), then pick a preset.

### Deploy in one step

```bash
npx vercel deploy
```

`vercel.json` already contains the SPA rewrite and the `/api` function config. See [Deployment](#deployment).

---

## The main journey

1. **Add a song** — `/songs?new=1`. Only a title is required; lyrics, themes and production constraints sharpen everything downstream.
2. **Pick a preset** — `/library`. Filter by platform, objective, difficulty, budget, equipment, face visibility or duration.
3. **Customise it** — *Use as is*, *Customise* or *Start from the concept only*. The preset is copied; the original is untouched.
4. **Get honest feedback** — the idea's **Coach** tab scores readiness from the fields you filled in, then offers specific improvements. With an AI provider configured you can additionally request an AI assessment and apply its rewritten concept without losing your original.
5. **Build the filming plan** — scene sequence, shots, on-screen text, audio section, editing notes.
6. **Write platform metadata** — three separate packages, each respecting that platform's conventions.
7. **Schedule it** — the calendar is a planning record; drag posts between days or add them one by one.
8. **Record results** — type in what each platform reported.
9. **Learn** — the journal compares your own posts against your own median, naming sampling limits out loud.

---

## Feature tour

### Dashboard
Next action cards computed from your actual data (unfinished ideas, upcoming releases, posts due in the next week, published posts with no recorded result), active campaigns, workflow counts, recently edited ideas, release countdowns, and preference-based preset suggestions. Empty state routes first-time users to the three sensible starting points.

### Preset library
- 35 starter presets (`src/data/seedPresets.ts` re-exporting `longFormPresets.ts`), each with a distinct creative purpose — not 35 renames of the same idea.
- Search, sort (recommended, name, recently updated, difficulty, favourite), grid/list views.
- Filters: platform, objective, difficulty, budget, filming method, equipment, face visibility, duration band, favourites, user-created, archived.
- Bulk actions: favourite, archive, export, or turn several presets into ideas for one song at once.
- Full preset editor with validation (a preset needs a name, a summary, a description, an objective, a platform, a hook and at least one execution step).

### Idea workspace
Three tabs — **Plan**, **Coach**, **Versions**.

- Plan: every field editable, list editors for shots/steps/text, platform chips, status, scheduled date, campaign link.
- Coach: the local rubric breakdown, saved assessment, gap list, and AI review when configured. Applying an AI's rewritten concept is an explicit action that snapshots your current text first.
- Versions: automatic snapshot before edits (last 25), with restore.

### Metadata studio
- One idea → one package per surface (Shorts, Reels, TikTok, long-form YouTube). Generating them all at once always produces genuinely different copy, not one caption pasted around.
- Every field editable; per-field local regenerate; character counters against the platform limit (long-form surfaces show the description counter and the chapter block); copy field, copy whole package, export JSON, mark draft/final.
- Hashtags appear with the reason each was suggested.
- A visible note states the copy was written from saved fields only, with no live trend data, and that limits change.

### Content calendar
- Month, week and list views; previous/next/today; song, platform, status and campaign filters.
- Drag a post to another day (desktop) or edit its date.
- Inline status changes through the nine workflow statuses: idea, planning, scripted, filming, editing, ready-to-publish, published, reviewed, archived.
- Warnings: the same idea scheduled more than once, posts in the past that are not published/reviewed, duplicate platform+day collisions, and release countdowns.
- Cadence preference is editable here and reused by the campaign planner.
- Export the whole plan as JSON.

### Performance journal
- Log views, likes, comments, shares, saves, average watch time, completion rate, profile visits, link clicks and attributed followers — all optional.
- Comparisons (concept type / platform / song / month) against your **own** median.
- Observations are tagged `observed` or `possible explanation`, with confidence, and the caveats section always explains that numbers are hand-typed and that cross-platform view counts are not comparable.
- AI summary is optional and clearly an interpretation of your own typed numbers.
- Export a performance snapshot.

### Trend check
- Records require a name, a **named source**, a date and the evidence you actually saw.
- Opportunity score = currentness of evidence, relevance to your song, adaptability, identity fit. Stale (>45 days), undated or unattributed records score **nothing** and say why.
- No provider configured → evergreen craft guidance only; the page says so plainly.
- When a provider is configured, fetched records keep their source name, URL and timestamp.

### Settings
Artist profile and production defaults, preferred platforms, cadence, integration status with the exact environment variable names, storage backend and durability, demo data add/remove, workspace export/restore, delete-all with confirmation, app/schema versions.

---

## Creative Readiness rubric

Scores are computed locally and deterministically in `src/lib/analysis.ts`.

| Component | Weight | What moves it |
| --- | --- | --- |
| Hook strength | 25% | Length, specificity, presence of a concrete detail, avoidance of generic phrasing |
| Song fit | 20% | Whether the excerpt/scene actually connects to the saved song and its strongest lines |
| Audience clarity | 15% | A described viewer rather than "everyone" |
| Visual progression | 15% | Something changes on screen; beats are sequenced |
| Feasibility | 15% | Budget, equipment, time and face-visibility constraints vs. the preset's demands |
| Distinctiveness | 10% | Avoids the interchangeable captions the rubric explicitly flags |

- Missing information lowers **confidence** and is listed as a gap; it is never invented.
- Feasibility is capped when budget, equipment and time are all unknown.
- The score is labelled a **heuristic editorial checklist**, not a measurement or a prediction. No view, reach or streaming claims are made anywhere.

Trend Opportunity is a separate score with its own inputs and its own disclaimer.

---

## Metadata conventions per platform

Checked against platform help/creator documentation and public limit trackers in **October 2026**. Platforms change limits without notice, and the UI repeats that warning.

| | YouTube Shorts | Instagram Reels | TikTok | YouTube long-form |
| --- | --- | --- | --- | --- |
| Field called "title" | Short title | On-screen / cover line (no title field) | Opening caption line (no title field) | The searchable title |
| Title guidance | 100 chars | 125 chars | 100 chars | 100 chars |
| Caption / description | 5,000 | 2,200 | 2,200 | 5,000 |
| Visible before "more" | ~100 | ~125 | ~100 | ~157 |
| Hashtags suggested / platform maximum | 3 / 15 | 5 / 30 | 4 / 30 | 3 / 15 |
| Chapters | — | — | — | Required for the list to work: a `0:00` entry, 3+ timestamps, 10s apart |
| Practical runtime | ≤ 3 min | ≤ 90 s | ≤ 10 min | 2–15 min |

### Long-form YouTube

A visualiser, a full lyric video or a live session is a different craft problem from a 20-second hook: people arrive from search or a playlist and stay for the song. The five long-form starter presets (official visualiser, full lyric video, one-take live session, making-of mini documentary, arrangement breakdown) carry their own runtimes, shot lists and metadata rules.

- The **title** is written as the phrase someone would actually type, with an honest format suffix such as `(Official Visualiser)` or `(Lyric Video)` — never `#shorts #viral`.
- The **description** is the primary body: a one-line summary, a chapter block, the song/credit block, a listen link that says "add your streaming link" when none is saved, the CTA and up to 15 hashtags.
- **Chapters** are generated from the timestamps on your song record when you saved them, otherwise from an even split of the estimated runtime across your scene sequence. They are always normalised to YouTube's rules — start at `0:00`, at least three entries, 10 seconds apart — and there is a copy button for the block.
- The thumbnail concept is a 1280×720 still that survives at 320 px, and the accessibility note asks for a real subtitle file plus a description of the visuals.
- Nothing is published. These are copy-paste packages.

Also per platform: search phrases, pinned comment, cover/thumbnail concept, opening overlay, three alternative hooks, recommended excerpt, suggested duration, accessibility notes, and a rationale naming exactly which saved fields were used.

Source notes live in `PLATFORM_CONVENTIONS` (`src/lib/metadataTemplates.ts`) and are shown in the app.

---

## Trends: what muse-ician will and will not do

**Won't:** invent trending sounds, hashtags, formats, view counts or "best time to post" statistics. There is no scraping and no hidden dataset.

**Will:** store a trend only with a source name, timestamp and evidence; treat evidence older than 7 days as ageing and older than 45 days as stale; refuse to score an unattributed or undated record; show evergreen craft guidance when no provider is configured; explain that a fit score is not a reach prediction.

---

## Data, storage and privacy

- All records live in **IndexedDB** in your browser (`muse-ician` database), with an automatic `localStorage` fallback and a memory-only fallback if both are blocked. Settings shows which backend is live and whether it survives reload.
- Nothing syncs between devices and there is no account system.
- Lyrics, notes and constraints stay local. They are sent to an AI provider **only** when you press an AI action, and the prompt preview lists what is included.
- Imported JSON is treated strictly as data: no HTML injection, no evaluation, no URL fetching. Size (4 MB) and record-count limits are enforced, and imported text is rendered as text by React.
- Backup: **Import / export → Export workspace** or **Settings → Export backup**.

---

## JSON import / export

Format version: **1.0.0**. The schema lives at `src/schema/muse-ician.schema.json` and is copied to `public/muse-ician.schema.json` by `npm run artifacts`.

Downloadable in the app:

| File | What it is |
| --- | --- |
| `example.json` | A complete, valid template: manifest, one preset, one clearly-placeholder song, one linked idea, one metadata package, plus instructions for an AI tool. |
| `muse-ician.schema.json` | The JSON Schema every import is validated against. |
| `starter-preset-pack.json` | All 35 starter presets as a real preset pack. |
| Workspace backup | Every record plus preferences. |
| Campaign plan / metadata packages / performance snapshot | Scoped exports. |

### Import behaviour

1. File size and payload size are checked before parsing.
2. JSON is parsed safely (no `eval`, no fences stripped silently — you get an explicit message).
3. The payload is validated against the schema. Missing required fields, unknown enums, wrong types and bad dates are reported **with their JSON paths**.
4. A **preview** shows how many records of each type will be added, replaced, skipped or rejected, and lists id conflicts.
5. Unrecognised fields are dropped with a warning instead of being written.
6. **Duplicate IDs** are never overwritten silently. You choose: *skip* (default), *replace*, or *import as a new record with a new id* (references are remapped).
7. Dangling references are listed as warnings. muse-ician never invents the missing record.
8. Invalid records are never imported; valid records in the same file can still be applied.
9. Existing records that are not in the file are always preserved.
10. If validation or persistence fails, your library is unchanged.

Both **preset packs** and **workspace backups** are supported; a preset pack needs no songs or metadata.

### Copy AI Import Prompt

The Import / Export page builds a prompt containing the schema rules, your chosen song context (optional), optional selected lyrics, existing ideas to avoid duplicating, and any extra constraints. It can be copied or saved as `.txt`.

---

## Optional AI provider

The browser never holds a key. `/api/ai` proxies to the provider with a server-side key and returns validated JSON, or an explicit error code.

### Quick start with an OpenAI key

1. Create a key at <https://platform.openai.com/api-keys> (a low-budget or free-tier key is enough — every action is one short request).
2. Add these to **Vercel → Project → Settings → Environment Variables** (Production *and* Preview), or to a `.env` file at the repo root for `npm run dev`:

   ```dotenv
   AI_PROVIDER=openai
   AI_API_KEY=sk-...
   AI_MODEL=gpt-4o-mini
   ```

3. Redeploy (or restart `npm run dev`).
4. Open **Settings → Connect OpenAI** and press **Test connection**. It sends one small request and reports the real result, so "configured" is never just a label. `https://<your-app>.vercel.app/api/status` shows the same truth.

| Model | When to use it |
| --- | --- |
| `gpt-4o-mini` | Cheapest sensible default for coaching notes, captions and idea generation. |
| `gpt-4.1-mini` | Slightly stronger reasoning, still inexpensive. |
| `gpt-4o` | Best quality here; only worth it if you review ideas often. |
| `o4-mini` | Reasoning model — slower, so raise `AI_TIMEOUT_MS` to `60000`. |

Never prefix a key with `VITE_`: those variables are inlined into the public JavaScript bundle. The app has no field for entering a key on purpose — anything typed into a browser field is readable by anyone with access to that browser, and this app ships as static files.

| Variable | Purpose |
| --- | --- |
| `AI_PROVIDER` | `openai`, `openai-compatible`, `anthropic` or `mock` |
| `AI_API_KEY` | Provider key — server only |
| `AI_BASE_URL` | Optional base URL for compatible endpoints |
| `AI_MODEL` | Optional model override |
| `AI_TIMEOUT_MS` | Request timeout (default 60,000) |

Error codes surfaced to the UI: `not_configured` (503), `rate_limited` (429, 30 requests/minute per client), `payload_too_large` (120 KB context), `unknown_operation`, `invalid_provider_json`, `provider_auth_failed`, `provider_rate_limited`, `context_too_large`, `timeout` (504), `network_error`.

`AI_PROVIDER=mock` returns deterministic placeholder data. The UI treats `mock: true` as a failure and never saves it — the mock exists to verify wiring, not to pretend AI worked.

AI operations: `generate-ideas`, `customize-preset`, `evaluate-concept`, `create-filming-plan`, `generate-metadata`, `summarize-performance`, `explain-trend`. Every AI result is presented as a suggestion; applying it is always an explicit user action.

---

## Optional trend provider

Set `TREND_PROVIDER_URL` (plus optional `TREND_PROVIDER_NAME` and `TREND_PROVIDER_TOKEN`) to a source you are permitted to query. `/api/trends` performs a GET and maps this response shape:

```json
{
  "observed_at": "2026-10-01T12:00:00Z",
  "trends": [
    {
      "id": "provider-trend-1",
      "name": "POV lyric reveal",
      "platform": "tiktok",
      "description": "…",
      "source_name": "Example Trends API",
      "source_url": "https://…",
      "source_timestamp": "2026-10-01T09:00:00Z",
      "geography": "US",
      "keywords": ["pov", "indie pop"],
      "evidence": "…"
    }
  ]
}
```

Without it, `/api/trends` returns **501 with an explicit reason**. It never fabricates a response.

---

## Deployment

### Vercel (recommended)

Full walkthrough, env-var tables and troubleshooting: **[DEPLOY.md](./DEPLOY.md)**.

1. Push the repository and import it at <https://vercel.com/new> (or run `vercel` / `vercel --prod`).
2. Framework preset: **Vite**. Build command `npm run build`, output `dist`, install `npm ci` — already set in `vercel.json`, so the dashboard form is filled in for you.
3. `/api/*.ts` is deployed as serverless functions (`maxDuration: 60`); the SPA is served for every other path via the rewrite in `vercel.json`.
4. Add environment variables only if you want AI or live trends. **None are required**; without them the app runs in local mode.
5. Verify the deploy at `https://<your-app>.vercel.app/api/status` — `configured: false` with a reason is the expected local-mode answer.
6. Optional: restrict the AI key with provider-side spending limits.

### Any static host + your own API

The frontend is a static SPA. If you host `/api` elsewhere, point the frontend at it — or simply ship the static build without providers: AI and trend panels will explain that they are unavailable, and everything else keeps working.

---

## Design system

The visual language lives in two files, so every page changes together:

| File | Role |
| --- | --- |
| `tailwind.config.js` | Palette, radii, shadows, keyframes and animation timings |
| `src/index.css` | Base layer (aurora backdrop, film grain, focus rings), component classes (`.surface`, `.btn-*`, `.input`, `.chip`, `.stat-tile`), utilities (`.gradient-text`, `.stagger`) |

- **Palette.** Obsidian (`ink-900 #07070f`) base with a violet → cyan accent ramp
  (`#7b6bff` → `#3fdcff`) and a lime spark (`#c6f24e`) reserved for momentum and
  "published" states. Semantic tones stay separate: `ok`, `warn`, `danger`.
- **Surfaces.** Glass panels (translucent fill + 1px gradient highlight + 18px
  backdrop blur) instead of flat boxes, and a hairline gradient border drawn with
  a masked pseudo-element so edges catch light.
- **Motion.** One shared easing (`ease-spring`, `cubic-bezier(.22,1,.36,1)`),
  short durations (200–460 ms), a single page-transition fade-up on route change,
  hover lift on cards, a light sweep across primary buttons, and a slow 30 s
  aurora drift behind the app. Nothing animates twice, and nothing blocks input.
- **Typography.** Tight tracking on display headings (`-0.028em`), uppercase
  0.18em eyebrows, tabular numerals for every statistic.
- **Reduced motion.** A single `prefers-reduced-motion` block collapses all
  animation and transition durations to ~0 and stops the aurora drift.
- **Contrast.** Body text `#f1f2fa` on `#07070f` (≈17:1), muted `#a6abc9` (≈8:1),
  faint `#787d9f` (≈4.7:1). Accent colours are only used on text at ⩾ 4.5:1 or on
  non-text decoration.

To retheme, change `accent` / `aqua` / `lime` in `tailwind.config.js` and the
three `--aurora-*` custom properties in `src/index.css`. Nothing else is
hard-coded.

---

## Scripts and testing

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with the `/api` handlers mounted as middleware |
| `npm run build` | Typecheck (`tsc -b`) and produce `dist` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Strict TypeScript project build |
| `npm run test` | Vitest (jsdom) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run artifacts` | Regenerate `public/example.json`, the schema copy and `samples/*.json`, validating each one |
| `npm run check` | Typecheck + tests + build |

The test suite (**14 files, 123 tests**) covers:

| Suite | What it proves |
| --- | --- |
| `tests/schema.test.ts` | Every committed artifact validates against the JSON Schema; malformed payloads are rejected |
| `tests/import.test.ts` | `skip` / `replace` / `new-id` planning, dangling references, unrelated records preserved |
| `tests/import-ui.test.tsx` | Uploading `public/example.json` previews without mutating, then imports; broken JSON changes nothing |
| `tests/analysis.test.ts` | Readiness rubric weights, bounds and honesty wording |
| `tests/metadata.test.ts` | Per-platform limits and truncation behaviour |
| `tests/longform.test.ts` | Long-form YouTube titles, description/chapter blocks and YouTube's 0:00 + 3-entry + 10s chapter rules |
| `tests/insights.test.ts` | Performance-insight thresholds and small-sample caution |
| `tests/trends.test.ts` | Freshness levels, empty observations, no invented numbers |
| `tests/workspace.test.tsx` | Persistence, CRUD and demo-data add/remove through the context |
| `tests/storage.test.ts` | Repository picks IndexedDB and survives a fresh instance |
| `tests/accessibility.test.tsx` | Dialog Escape + focus return, toast live region, skip link, named icon-only links |
| `tests/app.test.tsx` | Route smoke test with one real `<h1>` per page |
| `tests/journey.test.tsx` | End-to-end journey: add a song, build an idea from a preset, log a result |
| `tests/features.test.ts` | Variant scoring, reuse drafts, series arcs, runway order, comparatives gating, readiness history, CSV formula escaping, merge review, command palette, calendar clash warnings |

The build also splits vendor code into separate chunks (`react`, `storage`) so the first paint does not download everything at once.

If JavaScript is disabled the app shows a plain-language notice instead of a blank page — every record lives in your browser, so there is no server-rendered fallback to fall back to.

---

## Architecture

```
src/
  components/       UI primitives, forms, layout, preset card
  pages/            one file per route (15 routes)
  lib/              domain logic: types, analysis, metadata templates, trends,
                    insights, campaign planner, import planning, validation,
                    interchange (export builders + AI prompt), variants (A/B
                    scoring), reuse, series, runway, comparatives, history,
                    batch (CSV), merge (collaborator diff), commands, AI schemas
  state/workspace   React context: load, persist, CRUD, demo data, integrations
  storage/          IndexedDB → localStorage → memory repository + defaults
  data/             seed presets, demo bundle
  schema/           JSON Schema (validated with Ajv 2020-12)
api/
  status.ts ai.ts trends.ts
  _lib/             http helpers, provider adapters, prompt specifications
samples/            generated, validated example packs and backups
public/             example.json, schema copy, favicon, icons,
                    manifest.webmanifest, sw.js
tests/              Vitest suites
```

Key decisions:

- **One record shape everywhere.** Records are snake_case and are the same objects stored, exported and validated — no mapping layer to drift.
- **Repository abstraction** so storage can degrade gracefully and so tests run in memory.
- **Validation before mutation**: the app builds a plan, shows it, and only then writes.
- **Local-first computation**: rubric, metadata templates, insights and the campaign planner never touch the network.

---

## Known limitations

- No publishing, scheduling APIs or account connections — calendar entries are planning records by design.
- No video editing, captions rendering or asset management.
- Performance numbers are typed in by hand; nothing imports platform analytics.
- The readiness rubric is an editorial heuristic, not a validated predictor, and it is labelled as such in the UI.
- Data lives in one browser and does not sync; clearing site data deletes it unless you exported a backup.
- AI availability depends entirely on your own provider credentials and budget.
- Platform limits were verified in October 2026 and can change; the interface tells you to re-check before publishing.
- Trend data is only as good as the provider or observation you give it.
- Variant scores, the readiness rubric and the runway ordering are editorial heuristics. None of them predicts reach.
- Install-to-home-screen needs a production build over HTTPS, so it is not testable in `npm run dev`.
- The share target accepts `title`/`text`/`link` query parameters and pre-fills a song draft; it does not import audio.

---

## Accessibility

- Every interactive control is a real button, link, input or select with a visible focus ring.
- Dialogs trap focus, close on Escape and restore focus to the trigger.
- Forms use labelled fields, `aria-invalid` and linked error text.
- Status is announced through an ARIA live region for toasts.
- Icon-only buttons carry `aria-label`s.
- Drag-and-drop is never the only way to move a post — every post can be edited with a date field.
- `prefers-reduced-motion` disables animations and transitions.
- Layout is responsive from 360 px upward; the mobile navigation uses a bottom bar plus an overflow sheet.
