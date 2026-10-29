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
- [Scripts and testing](#scripts-and-testing)
- [Architecture](#architecture)
- [Known limitations](#known-limitations)
- [Accessibility](#accessibility)

---

## What it does

| Area | Behaviour |
| --- | --- |
| **Preset library** | 30 original, editable video formats with hooks, shot lists, execution steps, CTA examples, common mistakes and accessibility notes. Create, edit, duplicate, favourite, archive, export and import your own. |
| **Songs** | Song records with lyrics, themes, strongest lines, audio sections, release status/date, equipment, constraints and persona notes. Everything else can link to a song. |
| **Ideas** | Any preset becomes an editable idea tied to a real song. Idea workspace with plan, coach and version-history tabs. |
| **Creative coach** | A transparent 0–100 readiness score from six weighted components, always available offline, plus an optional AI review that never overwrites your original text. |
| **Filming plan** | Scene sequence, shot list, on-screen text, audio section, editing notes, CTA, estimated production time. |
| **Metadata studio** | Separate YouTube Shorts, Instagram Reels and TikTok packages — title, caption, description, search phrases, hashtags with reasons, pinned comment, cover concept, accessibility notes. |
| **Content calendar** | Month / week / list views, drag-to-move posts, nine workflow statuses, filters, cadence control, and warnings for duplicate or overdue posts. |
| **Campaign planner** | Generates a multi-week plan from the preset library for one song; every date and order stays editable. |
| **Performance journal** | Typed-in results compared against your own median, with observed/perceived language kept separate and honest caveats. |
| **JSON interchange** | Versioned schema, validation with a preview, duplicate-ID strategies, real downloadable `example.json`, `muse-ician.schema.json`, starter pack and sample backups. |
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
- 30 starter presets (`src/data/seedPresets.ts`), each with a distinct creative purpose — not 30 renames of the same idea.
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
- One idea → three packages. Generating all three always produces genuinely different copy, not one caption pasted three times.
- Every field editable; per-field local regenerate; character counters against the platform limit; copy field, copy whole package, export JSON, mark draft/final.
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

| | YouTube Shorts | Instagram Reels | TikTok |
| --- | --- | --- | --- |
| Field called "title" | Short title | On-screen / cover line (no title field) | Opening caption line (no title field) |
| Title guidance | 100 chars | 125 chars | 100 chars |
| Caption / description | 5,000 | 2,200 | 2,200 |
| Visible before "more" | ~100 | ~125 | ~100 |
| Hashtags suggested / platform maximum | 3 / 15 | 5 / 30 | 4 / 30 |

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
| `starter-preset-pack.json` | All 30 starter presets as a real preset pack. |
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

1. Push the repository and import it in Vercel (or run `npx vercel deploy`).
2. Framework preset: **Vite**. Build command `npm run build`, output `dist` — already set in `vercel.json`.
3. `/api/*.ts` is deployed as serverless functions; the SPA is served for every other path.
4. Add any environment variables you want (see above). **None are required.**
5. Optional: restrict the AI key with provider-side spending limits; the endpoint already rate-limits per client.

### Any static host + your own API

The frontend is a static SPA. If you host `/api` elsewhere, point the frontend at it — or simply ship the static build without providers: AI and trend panels will explain that they are unavailable, and everything else keeps working.

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

The test suite (**12 files, 79 tests**) covers:

| Suite | What it proves |
| --- | --- |
| `tests/schema.test.ts` | Every committed artifact validates against the JSON Schema; malformed payloads are rejected |
| `tests/import.test.ts` | `skip` / `replace` / `new-id` planning, dangling references, unrelated records preserved |
| `tests/import-ui.test.tsx` | Uploading `public/example.json` previews without mutating, then imports; broken JSON changes nothing |
| `tests/analysis.test.ts` | Readiness rubric weights, bounds and honesty wording |
| `tests/metadata.test.ts` | Per-platform limits and truncation behaviour |
| `tests/insights.test.ts` | Performance-insight thresholds and small-sample caution |
| `tests/trends.test.ts` | Freshness levels, empty observations, no invented numbers |
| `tests/workspace.test.tsx` | Persistence, CRUD and demo-data add/remove through the context |
| `tests/storage.test.ts` | Repository picks IndexedDB and survives a fresh instance |
| `tests/accessibility.test.tsx` | Dialog Escape + focus return, toast live region, skip link, named icon-only links |
| `tests/app.test.tsx` | Route smoke test with one real `<h1>` per page |
| `tests/journey.test.tsx` | End-to-end journey: add a song, build an idea from a preset, log a result |

The build also splits vendor code into separate chunks (`react`, `storage`) so the first paint does not download everything at once.

If JavaScript is disabled the app shows a plain-language notice instead of a blank page — every record lives in your browser, so there is no server-rendered fallback to fall back to.

---

## Architecture

```
src/
  components/       UI primitives, forms, layout, preset card
  pages/            one file per route (13 routes)
  lib/              domain logic: types, analysis, metadata templates, trends,
                    insights, campaign planner, import planning, validation,
                    interchange (export builders + AI prompt), AI schemas
  state/workspace   React context: load, persist, CRUD, demo data, integrations
  storage/          IndexedDB → localStorage → memory repository + defaults
  data/             seed presets, demo bundle
  schema/           JSON Schema (validated with Ajv 2020-12)
api/
  status.ts ai.ts trends.ts
  _lib/             http helpers, provider adapters, prompt specifications
samples/            generated, validated example packs and backups
public/             example.json, schema copy, favicon
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
