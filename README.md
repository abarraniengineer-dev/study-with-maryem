# Study With Maryem 🌸

*Study. Grow. Bloom.*

A personal study companion PWA: smart planning, focus sessions, spaced revision, a garden that grows as you study, and Bloom AI — always recommending, never deciding for you.

## Tech

- **Vite + React 19 + TypeScript** (strict), React Router 7
- **Supabase** (optional at runtime — see below): Postgres + Auth + RLS
- **PWA**: manifest + service worker (offline app shell), installable
- **Netlify**: SPA redirects + optional serverless function for Bloom AI
- **Tests**: 29 Vitest unit tests over the planning engine & gamification

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests
npm run build        # production build to dist/
```

The app works **immediately with no configuration** — data is saved in localStorage on this device. This is real persistence, not a mock; it just lives on-device.

## Enable Supabase (accounts, sync across devices)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. SQL Editor → paste **`supabase/schema.sql`** → Run. This creates 8 tables with per-user **RLS** (users can only ever see their own rows), indexes, and `updated_at` triggers.
3. Authentication → Providers → **Email**: enable. For a private personal app, you can turn off "Confirm email" so Maryem can sign up without email verification.
4. Create `.env.local` in the project root:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   (The anon key is safe to expose — RLS is the security boundary.)

### Authentication status in the app

The current build ships all data via the local store; `src/lib/persist.ts` already contains the complete Supabase layer (fetchAll / upsert / delete with camelCase↔snake_case mapping) and activates automatically when both env vars are set. The sign-in UI is the remaining piece and is listed under *Known limitations* until wired — every other feature is auth-independent.

## Deploy to Netlify

`netlify.toml` is included (build `npm run build`, publish `dist`, SPA redirect so refreshing any route works).

- **Via Git**: push the repo, then "Add new site → Import from Git" in Netlify.
- **Via CLI**: `npm i -g netlify-cli && netlify deploy --build --prod` and complete the browser login (the login itself is yours to do — it's your account).
- Add the two `VITE_SUPABASE_*` env vars in *Site settings → Environment variables* if Supabase is enabled.

### Bloom AI (optional real AI)

Bloom works out of the box using an on-device planner (honest, context-aware, no fake "AI" branding). To connect a real LLM:

1. In `netlify/functions/bloom.ts` the key is read server-side — **never** in the frontend.
2. Set env vars in Netlify: `BLOOM_API_KEY` (+ optional `BLOOM_API_URL`, `BLOOM_API_MODEL`).
3. Set `VITE_BLOOM_ENDPOINT=/.netlify/functions/bloom` for the frontend.

Bloom **never creates quizzes or tests** — this is enforced in the function's system prompt and in the product (no quiz code exists anywhere).

## What's inside

| Area | Where |
|---|---|
| Smart engine (recommendations, weekly allocation, free-slot finder, rebalancing) | `src/lib/engine.ts` (+ 29 unit tests) |
| XP / levels / streaks / achievements / garden thresholds | `src/lib/gamify.ts` |
| Persistence (local now, Supabase-ready) | `src/lib/persist.ts`, `src/lib/appStore.tsx` |
| Screens | `src/screens/*` (Home, Schedule, Tasks, Focus, Subjects, Revision, Exams, Plan, Insights, Garden, Profile, Bloom) |
| Design system (palette, type, components, dark mode, reduced motion) | `src/styles.css` |
| PWA | `public/manifest.webmanifest`, `public/sw.js`, icons in `public/icons/` |
| AI (serverless, key stays server-side) | `netlify/functions/bloom.ts` |

## Verified in-browser (desktop + 390px mobile)

- Subject with ★★★ priority → Home hero recommends it with "Why this?" reasons
- Focus session (1-min custom) → +XP, streak set, garden points grow, session logged, **no duplicates**
- Task quick-add → complete → +10 XP → persists across reload
- Schedule event → conflict detection warns on overlap
- Exam → countdown chip; Revision → D1/D3/D7/D14/D30 schedule generated
- Plan My Week → allocation → accept adds blocks; "I only have 30 minutes" → fitting suggestion; rebalance catch-up plan
- Bloom AI → context-aware answers, suggestion chips, clear conversation
- Dark mode tokens, mobile bottom nav, desktop sidebar, no horizontal overflow, rest-day toggle, achievements earned live

## Known limitations

- Sign-in UI not yet wired (Supabase layer is ready and activates via env vars — see above)
- Atmospheres are synthesized noise (rain/cafe/library) — pleasant but simple; YouTube embed covers real playlists
- Notifications requested but reminder *scheduling* is browser-limited (fired when app is open)
- Bloom needs `BLOOM_API_KEY` for real LLM answers; otherwise it uses the honest local planner
