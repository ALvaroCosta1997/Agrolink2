# AgrowLink — Severe Code & Production-Readiness Review

**Repo:** https://github.com/ALvaroCosta1997/Agrolink2
**Commit reviewed:** `2aa87890` (only commit in repo — "fix: remove edge function, direct Supabase calls, fix price_mode…")
**Stack:** Vite + React 18 + TypeScript, Supabase (Auth + Postgres + Storage + Edge Functions), Vercel, Leaflet, MUI + Radix + shadcn/ui, Tailwind 4, Resend (email)
**Review scope:** architecture & code quality, edge cases & robustness, security, production readiness
**Review date:** 2026-04-16

---

## TL;DR — The Verdict

AgrowLink is a **real, feature-rich MVP** that clearly went well beyond a prototype. The domain modelling is thoughtful (Portuguese marketplace for livestock, with seller contact visibility, soft-delete, cron cleanup, reports flow, admin panel, real-time chat, geolocation, image uploads). The UI work is substantial.

That said: **it is not production-ready today.** It is a Figma-Make-bundled single-commit codebase carrying multiple inherited "vibe-coded" smells that will bite you in production. The most important items are not cosmetic — they are data-integrity, security, and scalability issues that will go from theoretical to real the moment you have, say, 500 real users.

**Severity verdict:** **C-minus** in its current state. **B+ achievable** within a few focused days of work. There is no structural rewrite needed — the bones are OK, but the joints are not tightened.

| Category | Grade | One-line summary |
|---|---|---|
| Architecture & code quality | **D+** | 2,435-line App.tsx God component; 43 useStates; zero tests; no hooks/context extraction; committed node_modules |
| Edge cases & robustness | **D** | No pagination, no offline handling, silent error swallowing, no retry, weak validation, race-conditions on clicks |
| Security | **C-** | Hardcoded fallback secret, client-side admin gate, whole RLS layer is out-of-repo, unsanitized HTML email, dangerous account-delete flow |
| Production readiness | **D** | No tests, no CI, no monitoring, no migrations reproducibility, 414MB node_modules in git, dead edge functions, no rate limits |
| Domain modelling | **B** | Reasonable entity design; soft-delete + pg_cron cleanup is a mature touch |
| UX polish (what I could read statically) | **B** | Toast + shadcn + motion + i18n-ready design is good |

---

## 1. Is it "vibe-coded"?

**Yes, moderately.** The fingerprints of AI-assisted generation (Figma Make + Claude/Copilot-style output) are all over the codebase — and that's OK, except when the patterns they produce are not reviewed. Specifically:

- Field mappers (`rowToListing`, `listingToRow`, `listingUpdatesToRow`) are **duplicated in full between `src/app/api.ts` and `supabase/functions/server/index.tsx`** — including subtly different logic (e.g. the Edge Function defaults `price_mode` to `"unit"` while the frontend defaults to `"FIXED"`; `supabase/functions/server/index.tsx:105` vs `src/app/api.ts:105`). That's a classic LLM-copy artefact.
- `package.json:2` still says `"name": "@figma/my-make-file"`. It's never been renamed.
- `guidelines/Guidelines.md` is the untouched Figma Make template with the placeholder header "Add your own guidelines here".
- The Edge Function `supabase/functions/server/index.tsx` uses column names (`contact_visibility_enabled`, `contact_visibility_mode`, `contact_visibility_start`, `contact_visibility_end`) that **do not exist** in the schema — the migration `20260403000000_contact_governance.sql` creates `show_contacts`, `contact_schedule`, `contact_from`, `contact_until`. The frontend uses the correct names. Classic "LLM generated a plausible-looking second copy that drifted."
- Git log is literally **one commit**. No refactor pressure, no reviewer, no squash history.

Is there architectural thought behind the app? **Yes**, mainly visible in the migrations (soft-delete pattern + nightly pg_cron purge of stale chats — `supabase/migrations/20260402000000_messaging_governance.sql:42-87`). Someone thought about governance. That's mature. But the code-quality discipline didn't catch up to the data-modelling discipline.

---

## 2. Is it viable in production?

**Not as-is. Yes after a focused fix-pass.**

Concrete blockers for production:

1. **No RLS policies in the repo** (other than listings SELECT). The security posture depends entirely on policies configured out-of-band in the Supabase dashboard. That is unreproducible and unauditable — if you lose the project or stand up staging, your security model is gone.
2. **No tests, no CI.** You have no safety net for any future change.
3. **No pagination.** `api.listings.getAll()` at `src/app/api.ts:271` pulls every active listing in one round trip. At a few hundred listings you'll be fine. At 5k it will freeze mobile browsers.
4. **Dead but deployable** Edge Function code. If that edge function is ever wired up by mistake, it will silently corrupt profile updates.
5. **Client-only admin gate.** `App.tsx:183` hardcodes `ADMIN_EMAIL = "av.pereiradacosta@gmail.com"`. If RLS on the `reports` table is permissive, any user can open DevTools, set `currentUser.email` in React state, and (if RLS allows) read all reports with reporter/reported email joins exposed.
6. **Hardcoded fallback `INTERNAL_SECRET`** in the email function (`supabase/functions/notify-new-message/index.ts:2`). If the env var isn't set in Supabase, anyone on the internet can hit that function with the fallback string now public on GitHub and cause email to be sent to any address.
7. **Account deletion** (`App.tsx:286-335`) is non-atomic, non-transactional, and **leaves auth.users records behind** — the comment at `App.tsx:319` literally says so. GDPR / Art.17 "right to erasure" is not met.

---

## 3. What's actually good

Give credit where due — these are not common in MVP code:

- **Soft delete on listings** with a partial index on `deleted_at IS NOT NULL` (`supabase/migrations/20260402000000_messaging_governance.sql:12-15`). Sensible.
- **pg_cron jobs** to purge messages + chats tied to deleted or inactive listings (`...:43-117`). Mature.
- **Single-source, typed row mappers** on the frontend (`src/app/api.ts:15-91`). The pattern is good even if the implementation is duplicated server-side.
- **Separate `chat_messages` table** with proper `chat_id` FK (visible in `api.ts:398-433`) rather than JSONB blob on chats. Correct evolutionary direction.
- **Cookie-consent gating** without third-party scripts (`App.tsx:170-178`).
- **Debounced contact-visibility save** using `timeDebounceRef` (`App.tsx:166`) to avoid write storms on time pickers — nice touch.
- **Proper auth delegation** to Supabase (no custom password storage), with `onAuthStateChange` listener in place (`api.ts:198-200`).
- **Supabase Storage with public URLs** for listing photos and per-user path prefix `${userId}/${Date.now()}-...` (`PublishWizard.tsx:424`). Scoping is correct; just needs MIME/size validation.
- **Soft-delete-aware SELECT RLS on listings** (public sees `deleted_at IS NULL`, owner sees their own — `...:22-28`). Correct pattern.
- **Portuguese-locale phone validators** (`PublishWizard.tsx:287-303`). Not perfect, not ReDoS-prone, better than nothing.
- **i18n-ready content in PT** and proper HTML `lang="pt"` + SEO meta (`index.html`). Clear product intent.

---

## 4. Findings by severity

Each finding is tagged with file paths and, where meaningful, line numbers, so you can jump in and fix.

### 🔴 P0 — Must fix before more users touch production

**P0-1. Hardcoded INTERNAL_SECRET fallback in email function**
`supabase/functions/notify-new-message/index.ts:2`
```
const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET') ?? 'agrowlink-internal-2026';
```
The fallback is now public in the repo. If the `INTERNAL_SECRET` env var is not set in Supabase (or is dropped during a re-deploy), the function will authenticate with the public string. Anyone can send arbitrary `receiver_email` + HTML-injected content to a user's inbox from `onboarding@resend.dev`. Abuse vector includes phishing, spam, and reputation damage to the `agrowlink.app` domain.

**Fix:** Remove the fallback entirely. Let the function 500 on boot if the secret is missing. Rotate the secret. Rotate the Resend key if you committed the history path that ever had it.

**P0-2. All RLS policies except one are out-of-repo**
`supabase/migrations/*.sql`
Only `listings_select_*` policies are in-repo. Everything else — `chats`, `chat_messages`, `favorites`, `profiles`, `reports`, `listing_photos`, `kv_store_3243d623` — must have RLS policies set in the Supabase dashboard, but they are not captured in migrations. You cannot reproduce your security model, you cannot do blue-green, you cannot diff, and you cannot review. Any dashboard edit silently changes security.

**Fix:** `supabase db dump --data=false --schema public > schema.sql` + commit + use `supabase migration new` as the only way to change RLS going forward. Use `supabase/config.toml` + `supabase link` for CI.

**P0-3. Reports table RLS security unknown — admin panel is client-gated only**
`src/app/App.tsx:183, 837, 2034, 2325`; `src/app/components/AdminReportsPage.tsx:160-175`
```
const ADMIN_EMAIL = "av.pereiradacosta@gmail.com";
...
{currentUser?.email === ADMIN_EMAIL && ( ... admin panel ... )}
```
The admin panel runs `api.supabase.from("reports").select("... reporter:profiles!reporter_id(email), reported_user:profiles!reported_user_id(email) ...")`. If RLS on `reports` allows any authenticated user to SELECT, then a malicious (or curious) logged-in user can read every report in the system including reporter and reported user emails. This is a PII breach under GDPR.

**Fix:** (a) Add RLS on `reports` that restricts SELECT/UPDATE to a known admin role (either via a `role` column on `profiles` checked with `auth.jwt()`, or via an allowlist function). (b) Move the admin role check server-side. (c) Stop hardcoding the email address in client code — use a Supabase claim or RPC. (d) Commit the policy to a migration.

**P0-4. Account deletion is not atomic and does not delete the auth.users record**
`src/app/App.tsx:286-335`
Seven `.delete()` statements fired client-side, in order, with no transaction. Any failure mid-flow leaves orphaned data. Line 319 admits: "Sign out (full auth deletion requires service_role — handled manually)". Result: the user's email address stays in `auth.users`, their account appears deleted but they cannot re-sign-up. GDPR Art.17 is not met.

Worse: the chat deletion `.delete().eq("buyer_id", userId)` will also remove the *counterparty's* row if RLS allows. This silently destroys a chat the other user is still participating in. If RLS correctly disallows it, you instead get a silent half-delete (the chat row survives but other tables get purged).

**Fix:** Move the whole operation into a Postgres function (`delete_user_account`) with `SECURITY DEFINER` that does all the deletes + calls `auth.admin.deleteUser(...)` via an Edge Function. Expose one endpoint. Wrap in a transaction. Return a clean success/failure.

**P0-5. `node_modules/` and `dist/` committed to git (65,748 files, 414 MB node_modules)**
`.gitignore` says the right thing, but the initial commit already tracked everything. `git ls-tree -r HEAD` confirms.
**Fix:** `git rm -r --cached node_modules dist && git commit`. Also trim `pnpm-lock.yaml` (169 KB — normal) and verify nothing else is tracked that shouldn't be.

**P0-6. Dead Edge Function with a wrong schema is deployable**
`supabase/functions/server/index.tsx` (496 lines).
The only commit message says "remove edge function, direct Supabase calls" — but the edge function code is still in the repo, and if deployed it will read/write `contact_visibility_enabled` etc., which don't exist in the DB. Also: endpoint `/seed` at line 480 has **no authentication** — anyone can try to seed data. It's gated by "skip if listings exist", which is not a security control.

**Fix:** Delete `supabase/functions/server/` entirely. Also delete `supabase/functions/server/kv_store.tsx`. Remove `make-server-3243d623` references anywhere.

---

### 🟠 P1 — Fix before scaling past ~500 users

**P1-1. No pagination anywhere**
- `src/app/api.ts:271` — `listings.getAll()` fetches every active listing.
- `src/app/api.ts:366` — `chats.getAll()` fetches every chat for a user.
- `src/app/api.ts:398` — `chats.getMessages(chatId)` fetches every message in a chat.
- `src/app/components/AdminReportsPage.tsx:162` — all reports loaded at once.

**Fix:** Supabase `.range(from, to)` pagination, infinite scroll, and virtualisation (`@tanstack/react-virtual`). Target: never load more than 50 rows at once client-side.

**P1-2. God component: `src/app/App.tsx` is 2,435 lines, 43 `useState`, and mixes auth, chat, listings, maps, admin, reporting, routing, rendering**
The subagent review listed all 43 useStates; I verified the big ones (`App.tsx:155-489`). A 2.4k-line component on mobile production code is almost certainly the #1 maintainability blocker.

**Fix:** Extract, in order of highest ROI: `AuthProvider` context → `useListings` / `useFavorites` / `useChats` hooks → split each `renderView()` case (`App.tsx:1100-1852`) into its own `*.View.tsx` component. Do not try to rewrite — surgically extract one concern per PR.

**P1-3. Silent error-swallowing in critical paths**
- `App.tsx:401-403` — post-login user-data load errors only `console.log`, user sees a screen with empty state but is signed in.
- `App.tsx:601-602` — chat creation failure: only `console.error`. Chat appears in UI (added to state) but may not be persisted.
- `App.tsx:676` — message send failure: only `console.error`, no retry, no "message failed" indicator. (This is the *marketplace-defining* user action.)
- `App.tsx:623` — mark-as-read failure: silently swallowed.
- `App.tsx:955-965` — favorite toggle failure: silent.

**Fix:** Every catch should either (a) toast the user, or (b) roll back optimistic state, or both. For messages specifically: keep an in-memory queue with retry + "not sent" marker, like WhatsApp.

**P1-4. Image uploads: no MIME check, no size cap, upload failure is silent**
`src/app/components/PublishWizard.tsx:408-438`. `e.target.files` accepted verbatim. `uploadBlob` defaults to the raw `File` if compression fails. Errors at line 432 are `console.error` only. A user who picked a 40 MB HEIC on iPhone may have no feedback, no photo added, no error.

**Fix:** (a) Constrain `<input type="file" accept="image/*">` (already done?) *and* validate `file.type` + `file.size` in JS. (b) Max 10 MB pre-compression, max 5 photos. (c) On failure, toast + surface retry. (d) Server-side: set a Supabase Storage policy for max object size + allowed MIME types.

**P1-5. Race conditions on rapid clicks**
- Chat create (`App.tsx:547-605`): no debounce; two quick clicks = two chats.
- Favorite toggle (`App.tsx:946-967`): no pending state; rapid toggles desync.
- Publish (`App.tsx:969-1010`): no pending flag; double submit possible.

**Fix:** `disabled={isSubmitting}` guards + `useRef` guard + idempotent create (e.g. unique constraint on `chats(listing_id, buyer_id, seller_id)` in the DB, which would also be cleaner).

**P1-6. Unsanitised HTML email interpolation**
`supabase/functions/notify-new-message/index.ts:27-61` interpolates `receiver_name`, `sender_name`, `listing_species`, `message_preview` directly into HTML. No escaping. A username like `<img src=x onerror=...>` will render in Gmail (many clients strip handlers but not all — Outlook Web and some self-hosted clients are flakier). Even without JS execution, attackers can forge "official-looking" content, hide fake "Unsubscribe" links, or inject tracking pixels.

**Fix:** A tiny `escapeHtml` helper applied to every interpolation point. Even better: use a templating library designed for emails (MJML, or raw template with strict escaping).

**P1-7. `chats.messages` JSONB column vs `chat_messages` table — dual source of truth**
`src/app/api.ts:421-430` writes a preview into `chats.messages` *and* into `chat_messages`. The JSONB column is used for the chat list preview. This is fine as an optimisation, but note the consistency bug: if `sendMessage` succeeds on `chat_messages` but fails on the `chats.update(...messages: previewMsg)` call, the preview is stale. There is no retry.

**Fix:** Use a Postgres trigger (`AFTER INSERT ON chat_messages`) that updates `chats.last_update` and `chats.messages` (last message preview). Drops the client round-trip and makes it atomic.

**P1-8. `localStorage` used for `agrowlink_survey_seen` but relied on as part of UX logic**
`App.tsx:408-413`. If a user clears cookies/localStorage, the survey reappears. Minor, but worth a server-side flag — which you already have (`has_seen_survey` column from migration `20260401...`). Why not always trust the server and drop local?

**Fix:** Drop `localStorage.getItem("agrowlink_survey_seen")`. Use `userProfile.hasSeenSurvey` as the single source. Update it to `true` in the DB when the survey is dismissed.

**P1-9. No offline handling**
Rural Portugal + livestock marketplace = patchy mobile data. Today: white screen or silent error if the network drops. There is no `online/offline` listener, no service worker, no cached listing list.

**Fix (minimal):** `window.addEventListener('online' / 'offline')` + a banner. (**Fix (proper):** service worker + cached last-known listings + outbox pattern for message sending.)

**P1-10. CORS origin `*` on the edge function**
`supabase/functions/server/index.tsx:10`. Acceptable only because cookies aren't being used, but if you ever add cookie-based auth or sensitive endpoints, this is wrong. Since you're deleting the edge function anyway (P0-6), this resolves itself.

---

### 🟡 P2 — Fix before feature-complete v1.0

**P2-1. No tests, no CI**
Zero `.test.*` or `.spec.*` files. No `.github/workflows/`. No Vercel preview gating.
**Fix:** Start small — Vitest + React Testing Library, write tests for `api.ts` row mappers (pure), `validatePhone`, and `filteredListings`. Add a GitHub Action that runs `pnpm build` + `pnpm test` on PR.

**P2-2. Weak form validation**
`PublishWizard.tsx`: no max lengths on description, no photo count cap, no lat/lng-inside-Portugal check, no name sanitisation, no email format check in `LoginScreen.tsx`. Phone regex is simplistic (accepts any `>=7` digits for non-PT/ES/FR countries).
**Fix:** `zod` schemas on both client (`react-hook-form` is already installed — use it) and — critically — in a Postgres trigger or Supabase policy, because anything client-side is advisory.

**P2-3. `any` casts are scattered through `api.ts` (23 occurrences)**
e.g. `src/app/api.ts:103-104, 109, 229-236`. Each one is a refactor landmine. Example bug vector: `(updates as any).tags` silently accepts arbitrary payload.
**Fix:** Define `DbProfileRow`, `DbListingRow`, etc. and run the mappers with strict types. Or generate types from Supabase: `supabase gen types typescript --project-id=odznjlpzknczzutgirvk`.

**P2-4. Typo / naming: repo is `Agrolink2`, brand is `AgrowLink`, package is `@figma/my-make-file`**
`package.json:2`, `README.md`. Trivial but it signals "never reviewed."

**P2-5. Personal email hardcoded in 3 places**
- `index.html:22` (OG image URL at agrowlink.app is fine, but footer of email references it too)
- `supabase/functions/notify-new-message/index.ts:58` (public-facing email footer: `av.pereiradacosta@gmail.com`)
- `src/app/App.tsx:183` (admin email)

**Fix:** A single `config.ts` module for constants; support an `ADMIN_UIDS` array fed from env; use a proper support alias (e.g. `support@agrowlink.app` once the domain is verified in Resend).

**P2-6. Resend `from: 'AgrowLink <onboarding@resend.dev>'`**
`supabase/functions/notify-new-message/index.ts:70`. This is Resend's **test domain**. Emails from this sender will hit spam, look unprofessional, and Resend will rate-limit you at ~100/day.
**Fix:** Verify `agrowlink.app` in Resend. Set SPF, DKIM, DMARC. Use `notifications@agrowlink.app` as sender.

**P2-7. 25 `console.log/error/warn` calls in `App.tsx` alone**
These will ship to prod. Some carry error objects that can include user emails, IDs, or listings.
**Fix:** A simple `logger` module that strips in production or ships to Sentry. Better: integrate Sentry or LogRocket.

**P2-8. No rate limiting anywhere**
Favourites, chat messages, listing creation, report submission — all writable at full speed. Spam bots would have a field day. Supabase doesn't rate-limit `postgrest` calls at the table level.
**Fix:** Cloudflare in front of the API, or move write endpoints through an Edge Function that checks `rate_limit(user_id, action)` via a `rate_limits` table. Easiest: use `pg_net` + a counter row per user per minute.

**P2-9. Timezone handling is lossy**
`src/app/api.ts:76`, `:425`: `toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })` runs in the *viewer's* locale/TZ, not the sender's. Contact visibility times (09:00-19:00) stored as plain TIME with no TZ. DST transitions will drift. Mostly harmless for a Portugal-only app, worth noting if you expand.

**P2-10. No uniqueness or sanity constraints visible**
No unique constraint on `(favorites.user_id, listing_id)` visible in migrations (it's defended at insert with `error.code !== "23505"` at `api.ts:334`, which means the constraint exists — but it's not in the repo). Same risk for every other constraint: if someone re-creates the DB from the repo, they get a subtly broken schema.

**P2-11. Leaflet + supercluster without virtualisation for lists**
Having the map render clusters is fine. But the list view renders every listing as a card at `App.tsx:1100+`. At N > 500 listings visible, this will drop frames on mobile. Pair with P1-1.

**P2-12. `guidelines/Guidelines.md`, `ATTRIBUTIONS.md`, `package.json:name` are all untouched Figma Make boilerplate**
Minor, but it signals the codebase was never adopted.

---

### 🟢 P3 — Nice-to-have, cosmetic, or low-probability

**P3-1.** `dangerouslySetInnerHTML` in `src/app/components/ui/chart.tsx:83` is safe today (uses `React.useId()` + hardcoded `config`) but is the only occurrence in the repo — worth a comment explaining why it's safe, so a future dev doesn't copy the pattern with user input.

**P3-2.** `vite.config.ts` has no chunk splitting, no env handling, no sourcemap config. For a Vercel prod build, at least set `build.sourcemap: false` (or upload sourcemaps to Sentry), and consider `manualChunks` for `leaflet` + `recharts` + `motion` which are big.

**P3-3.** Bundle includes both MUI **and** Radix **and** shadcn. MUI (`@mui/material`, `@mui/icons-material`) is a ~1.1 MB footprint you might not need given you already have Radix/shadcn. Audit and remove one.

**P3-4.** `main.tsx` not reviewed (couldn't find it in uploads), probably trivial.

**P3-5.** `Math.random().toString(36).substr(2, 9)` at `PublishWizard.tsx:365` for a client-side listing id. It's fine because the DB overrides on insert, but `substr` is deprecated and the whole line is dead code that just confuses readers.

**P3-6.** `PhoneCountrySelect`, `DistritoSelect` — likely good; not reviewed in depth.

**P3-7.** No Vercel analytics consent gate, but `@vercel/analytics` is in `package.json`. In the EU you must not load it before consent. If you use it, gate it behind `document.cookie` consent just like you did for the banner.

---

## 5. Data-integrity deep dive — the two things that will bite you

### 5.1 The contact-visibility column drift

The same data is stored in two different column-naming conventions depending on which code path writes it.

| Where | Column names |
|---|---|
| Migration `20260403000000_contact_governance.sql:11-15` | `show_contacts`, `contact_schedule`, `contact_from`, `contact_until` |
| Frontend `src/app/api.ts:233-236` | Uses the migration names ✅ |
| Edge function `supabase/functions/server/index.tsx:255-258` | `contact_visibility_enabled`, `contact_visibility_mode`, `contact_visibility_start`, `contact_visibility_end` ❌ |

Today the edge function is dead. The moment it gets re-enabled, profile writes via the edge function will silently no-op (Supabase returns "0 rows updated" for unknown columns? — actually it 400s with "column does not exist", but depending on how strictly the code handles it, it may be logged and lost). Either way: wrong.

**Fix:** Delete the edge function (see P0-6) or, if keeping, rename to match.

### 5.2 The chat-messages dual write

`api.ts:408-433` writes to `chat_messages` (new, correct) and then updates `chats.messages` (JSONB preview). Not atomic. Not idempotent on retry. A trigger on `chat_messages` would replace this with one atomic write.

---

## 6. Security posture summary

I can only audit what's in the repo. Since the RLS policies are not, several conclusions are conditional on "what you actually have configured in Supabase." With that caveat:

| Threat | Status |
|---|---|
| **Secret leakage** in client | ✅ Only anon key is exposed, which is correct — **but** the INTERNAL_SECRET fallback in the email function is a concrete leak (P0-1). |
| **Auth bypass** | Mostly handled by Supabase Auth. The risk is client-gated admin — P0-3 is concrete, the rest is RLS-dependent. |
| **SQL injection** | Not applicable — all writes go through `@supabase/supabase-js` which uses parameterised queries. ✅ |
| **XSS (web)** | Low risk — React escapes by default; only one `dangerouslySetInnerHTML` (P3-1). |
| **XSS (email)** | Real risk (P1-6) — direct HTML interpolation. |
| **CSRF** | Not applicable (cookie-free auth via bearer token). ✅ |
| **IDOR** | RLS-dependent. Listing update/delete in the edge function has explicit seller-owner check (`server/index.tsx:324-326`), but that function is dead. The frontend `listings.update(id, updates)` at `api.ts:293` has **no ownership check** — relies entirely on RLS. You must verify the policy exists in the dashboard. |
| **Rate limiting / DoS** | None (P2-8). |
| **GDPR / Right to erasure** | Broken (P0-4). |
| **Dependency CVEs** | Didn't scan; run `pnpm audit` and it will spit a list. `leaflet-draw@1.0.4` and a few Radix 1.x packages may have advisories. |

---

## 7. Production readiness scorecard

| Concern | Status |
|---|---|
| Tests | ❌ 0 tests |
| CI/CD | ❌ No GitHub Actions, no preflight |
| Migrations reproducibility | ❌ Only 3 migrations, base schema and most RLS missing |
| Observability / logging | ⚠️ `console.*` only — no Sentry, no DataDog, no server-side structured logs |
| Monitoring / alerting | ❌ None |
| Error boundaries | ❓ Not checked — likely missing given App.tsx pattern |
| Offline support | ❌ None |
| Performance (bundle size) | ⚠️ Unknown — likely large given MUI + Radix + Leaflet. Run `vite-bundle-visualizer` |
| Performance (data) | ❌ No pagination, no virtualisation |
| Accessibility | ⚠️ Radix provides a11y primitives but lots of custom buttons — run axe-core |
| Internationalisation | ⚠️ PT-hardcoded strings everywhere — fine if PT-only forever, otherwise refactor |
| Backup / disaster recovery | ❓ Supabase daily backup is on by default on paid plans — verify |
| Docs / runbook | ❌ README is autogenerated Figma stub |
| Secrets management | ⚠️ `.env` gitignored ✅ but INTERNAL_SECRET fallback is a leak ❌ |
| Deployment config | ⚠️ Vercel mentioned but no `vercel.json`; Supabase functions have no `config.toml` |
| Code ownership / history | ❌ Single commit |

---

## 8. Prioritised fix list — what to do Monday morning

### Week 1 — Stop the bleeding (P0 only)

1. **Delete** `supabase/functions/server/` and `supabase/functions/server/kv_store.tsx`. Remove any residual references. **(30 min)**
2. **Delete the fallback** in `supabase/functions/notify-new-message/index.ts:2` and rotate `INTERNAL_SECRET` + `RESEND_API_KEY` in Supabase dashboard. **(10 min)**
3. **Remove `node_modules` and `dist` from git history.** `git rm -r --cached node_modules dist && git commit`. Optionally rewrite history (`git filter-repo`) to shrink the repo. **(1 hour)**
4. **Dump current RLS** from Supabase: `supabase db dump --data=false > supabase/migrations/00000000000000_baseline.sql`. Review, commit. From now on, change RLS only via migrations. **(2-3 hours)**
5. **Audit `reports` table RLS.** Add a policy: `CREATE POLICY reports_select_admin ON reports FOR SELECT USING (auth.jwt() ->> 'email' = 'av.pereiradacosta@gmail.com' OR reporter_id = auth.uid());`. Even better: add a `role` column on `profiles` and use it. **(30 min)**
6. **Implement `delete_user_account()` as a Postgres function** + Edge Function wrapper that also calls `supabase.auth.admin.deleteUser`. Replace `App.tsx:286-335` with a single call. **(4 hours)**

### Week 2 — Robustness

7. Pagination on `listings.getAll`, `chats.getAll`, `chats.getMessages`, `reports`. **(1 day)**
8. Proper error toasts in all silent-catch sites (P1-3 list). **(half day)**
9. Image upload MIME + size validation + error surface (P1-4). **(half day)**
10. Debounce + pending states on chat create, favourite toggle, publish (P1-5). **(half day)**
11. HTML-escape email interpolation (P1-6). **(20 min)**
12. Add a `CREATE TRIGGER` that syncs `chats.last_update`/`chats.messages` from `chat_messages` inserts (P1-7 / 5.2). **(1 hour)**

### Week 3 — Structural cleanup

13. Extract `AuthProvider` context; remove the 10 auth-related useStates from `App.tsx`. **(1 day)**
14. Extract `useListings`, `useChats`, `useFavorites` hooks. **(1 day)**
15. Split each `renderView()` case into a component file. **(1 day)**
16. Replace `any` in `api.ts` with generated types: `supabase gen types typescript --project-id=odznjlpzknczzutgirvk --schema public > src/app/types.db.ts`. **(2 hours)**
17. Drop MUI if Radix/shadcn is sufficient (P3-3). **(half day)**
18. Set up Vitest + first 10 tests (mapper functions, `validatePhone`, filter memo). **(1 day)**
19. GitHub Action: `pnpm install --frozen-lockfile && pnpm build && pnpm test`. Vercel preview gate. **(2 hours)**

### Week 4 — Production hardening

20. Sentry for client + Supabase function errors. **(2 hours)**
21. Rate limiting on `reports`, `chat_messages`, `listings` via a `rate_limits` table or Cloudflare in front. **(1 day)**
22. Verify Resend domain, SPF/DKIM/DMARC, switch `from` to `notifications@agrowlink.app` (P2-6). **(1 hour + DNS wait)**
23. Service worker for offline listing cache + message outbox (P1-9). **(2-3 days if done properly)**
24. `pnpm audit` — patch CVEs. **(1 hour)**
25. Accessibility audit (axe-core). **(1 day)**

### Nice-to-haves

26. Replace the hardcoded `ADMIN_EMAIL` constant with a real admin role model.
27. Rename the package, update README, delete `guidelines/Guidelines.md`.
28. Bundle analysis + code splitting for Leaflet/Recharts/Motion.
29. Write a proper `supabase/README.md` and `DEPLOYMENT.md`.

---

## 9. One final piece of advice

The app is a solid MVP that — once the top six P0s are closed and pagination is in — is genuinely viable. Don't let the severity of this review scare you into rewriting. Do **not** rebuild in Next.js or migrate to a different stack; the Vite + Supabase combo is fine and mature. The work is **hygiene, not architecture.**

The most useful single investment you can make is adopting `supabase` CLI migrations as the only way to change the database. Every other P0 becomes tractable once your security policies are in version control. Do that first.

Good work on the product thinking. Now tighten the screws.

---

*Report generated by severe static review — no dynamic testing, no runtime inspection of your Supabase project, no pen-testing. Findings marked "depends on RLS" require you to open the Supabase dashboard and confirm. If you want, I can help you write the baseline RLS migration or the `delete_user_account` function next.*
