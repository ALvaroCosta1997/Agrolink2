# AgrowLink — Fix-Pass Playbook for a Non-Coder

**Goal:** Take AgrowLink from "C-minus, fragile MVP" to "B+, ready for real users" in roughly three to four weekends of focused work, using Claude Code plus a few dashboard tasks you'll do yourself.

**How to use this document:** Do it top to bottom. Do not skip phases. Every step is either "(in Claude Code)" or "(do yourself, outside Claude Code)". Check each box as you go.

> **Golden rule.** Never accept a change you don't at least glance at. Claude Code will show you a diff (the lines it wants to change). You don't need to understand every line — but you should always read the short summary it writes at the top and skim the files it touched. If something looks wrong, say "revert that" before committing.

---

## Phase 0 — Setup (45 minutes)

### 0.1 Back everything up (outside Claude Code)

Before you touch anything, make a copy of your repo folder. On Windows, right-click the `Agrolink2` folder → Copy → paste next to it and rename to `Agrolink2-backup`. On Mac, drag it to your Desktop while holding ⌥ (Option). **If anything goes wrong later, you can just throw away the working folder and go back to the backup.**

### 0.2 Install the tools (outside Claude Code)

You need four things. Most of them take less than five minutes each.

- [ ] **Git**. Check if you have it by opening a terminal and typing `git --version`. If it says "command not found", install from https://git-scm.com/downloads.
- [ ] **Node.js** (version 20 or newer). Check with `node --version`. Install from https://nodejs.org if missing. Pick the LTS version.
- [ ] **pnpm**. Your app uses pnpm, not npm. Install with: `npm install -g pnpm`
- [ ] **Claude Code**. Follow the instructions at https://docs.claude.com/en/docs/claude-code/overview. Usually: `npm install -g @anthropic-ai/claude-code` then `claude` to launch it. You'll need an Anthropic account.

### 0.3 Download the review and this playbook into your repo

- [ ] Download `AgrowLink_Code_Review.md` (the previous deliverable) and this `AgrowLink_Fix_Playbook.md` from your outputs folder.
- [ ] Drop both files into a new folder inside your repo, called `docs/`. So the final path is `Agrolink2/docs/AgrowLink_Code_Review.md`. This way Claude Code can read them when you ask it to.

### 0.4 Open the repo in Claude Code (in Claude Code)

- [ ] Open a terminal.
- [ ] `cd` into the Agrolink2 folder. On Windows that looks like: `cd C:\Users\alvaro\Agrolink2`. On Mac: `cd ~/Agrolink2` (or wherever you put it).
- [ ] Type `claude` and press Enter. You should now see a Claude Code session open in that folder.

### 0.5 Create the cleanup branch (in Claude Code)

Paste this exact message into Claude Code:

> **I'm about to do a cleanup of this repo. Before we touch anything, please run `git status` to confirm the working tree is clean, then create and switch to a new branch called `cleanup/p0-fixes`. After that, run `git log --oneline -5` and show me the output.**

What this does: creates a safety branch where all our changes will live. Your `main` branch stays untouched. If we break something catastrophically, we just delete this branch.

- [ ] Confirm Claude Code reports "Switched to a new branch 'cleanup/p0-fixes'".

### 0.6 Ground Claude Code in the plan (in Claude Code)

Paste this:

> **Please read `docs/AgrowLink_Code_Review.md` and `docs/AgrowLink_Fix_Playbook.md` in full. After reading, confirm you've understood by listing the six P0 items from the review in one line each. Do not make any code changes yet.**

This makes sure Claude Code has the same context you have.

---

## Phase 1 — Stop the bleeding (the six P0s)

### P0-1 — Remove the dead Edge Function (in Claude Code, 15 minutes)

Paste:

> **Please execute P0-6 from the review. Delete the entire `supabase/functions/server/` directory (including `index.tsx` and `kv_store.tsx`) since it is confirmed dead code. Then search the whole repo for any remaining references to `make-server-3243d623` or imports from those files and remove them. Run `pnpm build` afterwards to confirm nothing broke. Stop and show me the result before committing.**

- [ ] Read the list of files it changed.
- [ ] If the build passes, tell it: **"Good. Commit with message: `chore: remove dead edge function server`"**

### P0-2 — Remove the hardcoded email secret (in Claude Code, 5 minutes)

Paste:

> **In `supabase/functions/notify-new-message/index.ts` line 2, remove the `?? 'agrowlink-internal-2026'` fallback. If the env var is missing, the function should throw on boot. Also add a one-sentence comment explaining why no fallback. Commit with message: `fix(security): remove hardcoded INTERNAL_SECRET fallback`.**

### P0-3 — Get node_modules and dist out of git (in Claude Code, 15 minutes)

Paste:

> **The repo has `node_modules/` and `dist/` tracked in git even though they are in `.gitignore`. Please run `git rm -r --cached node_modules dist`, then commit with message `chore: stop tracking node_modules and dist`. Do not rewrite history — just remove from tracking going forward. Confirm the repo size dropped by running `du -sh .git`.**

This one will make your repo much lighter and faster to clone for anyone else.

### P0-4 — Capture your current database into migrations (part in Claude Code, part outside)

This is the most important step of the whole playbook. Right now, your app's security rules live inside the Supabase dashboard. If you click the wrong button there, your security is gone with no audit trail. We're going to pull all those rules into version-controlled files.

**Outside Claude Code (30 minutes):**

- [ ] Install the Supabase CLI: https://supabase.com/docs/guides/cli — `brew install supabase/tap/supabase` on Mac, or Scoop/npm on Windows.
- [ ] In the terminal, run `supabase login` and follow the prompts.
- [ ] Find your project ID. It's `odznjlpzknczzutgirvk` (it's in `utils/supabase/info.tsx`).
- [ ] Run: `supabase link --project-ref odznjlpzknczzutgirvk`. It will ask for your database password — grab it from the Supabase dashboard → Project Settings → Database → "Reset database password" if you don't know it. **Save the password in a password manager.**

**In Claude Code:**

Paste:

> **I've just linked the Supabase CLI to the project. Please run `supabase db dump --schema public --data=false > supabase/migrations/00000000000000_baseline.sql` to capture the current schema and RLS policies. Then open that file and give me a plain-English summary of: (a) what tables exist, (b) what RLS policies exist on each table, and (c) anything that looks suspicious or missing. Do not commit yet — I want to review first.**

- [ ] Read the summary carefully. The most important thing is: **does the `reports` table have a policy that only lets admins SELECT?** If not, that's P0-3 still open.
- [ ] If Claude Code spots missing policies, ask it to **"draft an additional migration that adds the missing policies. Put it in `supabase/migrations/20260416000000_hardening.sql`. Show me the SQL first."**
- [ ] Once you've read and approved, tell Claude Code: **"Commit the baseline and hardening migrations."**

### P0-5 — Lock down the admin panel (in Claude Code + Supabase dashboard, 45 minutes)

Right now anyone could theoretically see reports if the RLS isn't tight. We need both a real admin role and server-side enforcement.

**In Claude Code, paste:**

> **Please implement a proper admin role:**
> **1. Create a migration `supabase/migrations/20260416010000_admin_role.sql` that adds a `role TEXT DEFAULT 'user'` column to `profiles`, plus RLS policies on `reports` that only allow SELECT/UPDATE where `(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`. Reporters should still be able to SELECT their own reports.**
> **2. In `src/app/App.tsx`, replace the hardcoded `ADMIN_EMAIL` constant and the `currentUser?.email === ADMIN_EMAIL` checks with `currentUser?.role === 'admin'`. Update the `UserType` type accordingly and load the `role` field in `rowToProfile` in `src/app/api.ts`.**
> **3. Show me the diff before committing.**

**Outside Claude Code (Supabase dashboard):**

- [ ] Go to https://supabase.com/dashboard → your project → Table Editor → `profiles`.
- [ ] Find your own row (search by email `av.pereiradacosta@gmail.com`).
- [ ] Set the `role` column to `admin`.
- [ ] Log out and log back into your app. Confirm the admin panel still works for you but would fail for any other user.

- [ ] Back in Claude Code: **"Commit with message: `feat(admin): server-enforced admin role replaces client email check`"**

### P0-6 — Make account deletion actually work (mostly in Claude Code, 2 hours)

This one is the highest-stakes change so we do it carefully. We're going to move the seven deletes into a single Postgres function that runs atomically, and call it from an Edge Function that can also delete the auth user.

**In Claude Code, paste:**

> **Please implement a proper account-deletion flow as described in P0-4 of the review. Specifically:**
> **1. Create a migration `supabase/migrations/20260416020000_delete_account.sql` that defines a Postgres function `delete_user_account(target_user_id uuid)` as `SECURITY DEFINER`. It should delete (in order) listing_photos, listings, chat_messages, chats where the user is buyer or seller, favorites, reports, and finally profiles. All inside a single transaction. The function should check that `target_user_id = auth.uid()` at the top and raise an exception otherwise.**
> **2. Create a new Edge Function `supabase/functions/delete-account/index.ts` that: accepts a POST, checks the bearer token, extracts the user id, calls `delete_user_account(user_id)` via RPC, then calls `supabase.auth.admin.deleteUser(user_id)` using the service role key, and returns success.**
> **3. In `src/app/App.tsx`, replace the `handleDeleteAccount` function (lines 286-335) with a single call to the new edge function. Show me the full diff before committing.**
> **Important: do not attempt to deploy the edge function — I'll do that myself through the Supabase dashboard later.**

- [ ] Read the diff carefully. The account-deletion flow is critical.
- [ ] When happy: **"Commit with message: `fix(account): atomic deletion via Postgres function + auth removal`"**

**Outside Claude Code (Supabase dashboard, 20 minutes):**

- [ ] Install the Supabase function: `supabase functions deploy delete-account` from the terminal.
- [ ] Before testing with your real account, create a throwaway test account (sign up with a new email), then try deleting it. Verify it's gone from `auth.users` in the dashboard.

### Phase 1 checkpoint — rotate secrets (outside Claude Code, 20 minutes)

Since secrets have been in the repo history:

- [ ] **Supabase dashboard → Project Settings → Edge Functions → Environment variables.** Set `INTERNAL_SECRET` to a new random string (use a password manager to generate one). Delete any old entry.
- [ ] **Supabase dashboard → Project Settings → API.** Note: the `anon` key doesn't need rotation (it's public by design). The `service_role` key, however, can be rotated if you want to be paranoid — but it will require redeploying all edge functions.
- [ ] **Resend dashboard → API Keys.** Delete the current API key, create a new one, update it in the Supabase function env vars.

### Phase 1 checkpoint — push the branch and open a PR (in Claude Code)

- [ ] Paste: **"Please push the `cleanup/p0-fixes` branch and open a pull request on GitHub with a summary of every commit in this branch. Use the GitHub CLI (`gh`) if available."**
- [ ] **Do not merge yet.** Test the app end-to-end first: sign up, publish a listing, send a chat, favorite, delete account. If anything breaks, file it as a fix before merging.

🎉 **At this point the most dangerous stuff is gone. You can breathe.**

---

## Phase 2 — Robustness (1 week, mostly in Claude Code)

Same pattern: one branch per group of fixes, PR, test, merge.

### Session 1 — Pagination (2 hours)

Paste:

> **On a new branch `cleanup/pagination`, add pagination to the three `getAll`-style queries in `src/app/api.ts`: `listings.getAll`, `chats.getAll`, and `chats.getMessages`. Use Supabase `.range(from, to)` and default to 50 items per page. Then add "load more" buttons in the corresponding views in `App.tsx` and components. Show me the approach first, then the diff.**

### Session 2 — Error toasts everywhere (1 hour)

Paste:

> **On a new branch `cleanup/error-toasts`, go through every `catch` block in `src/app/App.tsx` and `src/app/api.ts`. For any that only call `console.error` or `console.log` in a user-facing action (chat send, favorite toggle, publish, profile update), add a `toast.error(...)` with a friendly Portuguese message. Leave non-user-facing catches alone. Show me the list before changing.**

### Session 3 — Image upload validation (1 hour)

Paste:

> **On a new branch `cleanup/image-uploads`, in `src/app/components/PublishWizard.tsx` around `handleFileChange`: reject files larger than 10 MB, reject files whose MIME type doesn't start with `image/`, cap total photos at 5, and surface errors via `toast.error`. Also handle the Supabase upload failure case by showing a toast instead of just `console.error`.**

### Session 4 — HTML escape the email template (15 minutes)

Paste:

> **In `supabase/functions/notify-new-message/index.ts`, the user-controlled fields `sender_name`, `receiver_name`, `listing_species`, `message_preview` are interpolated raw into the HTML. Add a tiny `escapeHtml` helper and wrap every interpolation. Do not change the visual output.**

### Session 5 — Race-condition guards (1 hour)

Paste:

> **On a new branch `cleanup/race-guards`, add `isSubmitting` state and `disabled={isSubmitting}` to the three write paths most prone to double-clicks: chat creation, favorite toggle, and listing publish. Also add a DB-level unique constraint on `chats(listing_id, buyer_id, seller_id)` via a new migration so duplicate chats are impossible even if the UI fails.**

### Session 6 — Trigger-based chat preview (30 minutes)

Paste:

> **Create a migration that adds an AFTER INSERT trigger on `chat_messages` which updates the parent `chats` row's `last_update` and `messages` (as a single-element preview array). Then remove the redundant `chats.update(...)` call from `api.ts`'s `sendMessage` function.**

---

## Phase 3 — Structural cleanup (1 week, mostly in Claude Code)

These are higher-effort but they make every future change faster. Do them in this order on separate branches.

### Session 7 — Extract AuthProvider (half day)

> **On a new branch `refactor/auth-provider`, create `src/app/context/AuthContext.tsx` that wraps all auth state currently in `App.tsx` (currentUser, accessToken, isLoginVisible, isAuthGateVisible, isOnboardingVisible, isPasswordRecovery, the handleLogin/handleLogout/requireAuth functions, and the auth useEffect hooks). Replace usage in App.tsx with `useAuth()`. Keep the tree working end-to-end. Show me the plan before coding.**

### Session 8 — Extract data hooks (half day)

> **On a new branch `refactor/data-hooks`, create `src/app/hooks/useListings.ts`, `useChats.ts`, `useFavorites.ts`. Each owns the relevant state and API calls. Replace the inline logic in `App.tsx` with these hooks. Show me the plan first.**

### Session 9 — Split renderView into components (half day)

> **On a new branch `refactor/views`, split each case of the `renderView()` switch in `App.tsx` (explorar, favoritos, meus-anuncios, mensagens, publicar, detalhes, perfil) into its own file under `src/app/views/`. App.tsx should end up under 500 lines. Show me a directory plan first.**

### Session 10 — Tests + CI (1 day)

> **On a new branch `chore/tests-ci`: (1) install Vitest and React Testing Library, (2) write tests for the pure functions in `api.ts` (the row mappers), `validatePhone` in PublishWizard, and the `filteredListings` memo, (3) add a GitHub Action at `.github/workflows/ci.yml` that runs `pnpm install --frozen-lockfile && pnpm build && pnpm test` on every PR. Aim for a green CI on first try.**

---

## Phase 4 — Production hardening (ongoing)

Spread this over a few weekends. These are low-urgency but high-leverage.

- Sentry for error monitoring (in Claude Code — `"add Sentry to the Vite app and edge functions"`).
- Rate limiting on writes (in Claude Code — ask it to design a `rate_limits` table and a check helper).
- Verify your domain in Resend (**outside Claude Code**, see below).
- Accessibility audit (in Claude Code — `"run an axe-core audit and list violations"`).
- Bundle analysis (in Claude Code — `"add @rollup/plugin-visualizer and tell me the top 10 largest modules"`).
- Drop MUI if you don't actually use it (in Claude Code — `"find all imports from @mui/* and tell me which pages depend on them"`).

---

## The "outside Claude Code" checklist (do these in parallel)

You can make progress on these while Claude Code is working. They don't need code skills, just dashboard clicks.

### Supabase dashboard

- [ ] Set `INTERNAL_SECRET` to a new random value (Phase 1 checkpoint).
- [ ] Rotate `RESEND_API_KEY` (Phase 1 checkpoint).
- [ ] Set your own profile's `role` to `admin` (P0-5).
- [ ] Deploy the new `delete-account` Edge Function (P0-6).
- [ ] Enable **daily backups** if on a paid plan. Project Settings → Database → Backups.
- [ ] Check that **email confirmations** are ON. Authentication → Providers → Email → "Confirm email".
- [ ] Review **Storage policies** on the `listing-photos` bucket — confirm uploads are limited to authenticated users and reads are public.
- [ ] Set a **max file size** on the `listing-photos` bucket (Storage → your bucket → Configuration → 10 MB).

### Resend (email sender)

- [ ] Log into resend.com.
- [ ] **Domains → Add Domain → `agrowlink.app`**. Follow the SPF / DKIM / DMARC DNS instructions.
- [ ] Wait for verification (can take 30 min to 24 h).
- [ ] Change the `from` in `notify-new-message/index.ts` from `onboarding@resend.dev` to `notifications@agrowlink.app` (you can ask Claude Code to make this change).
- [ ] Delete the old test API key and create a new one scoped to just the production domain.

### Domain registrar (if `agrowlink.app` exists already)

- [ ] Add SPF, DKIM, DMARC DNS records as instructed by Resend.
- [ ] Verify the domain is pointed at Vercel (A / CNAME records).
- [ ] Add `www.agrowlink.app` if not already.

### Vercel

- [ ] In the project, check that **Environment Variables** match what the app needs. If you switch to env-based Supabase config later, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] Enable **Preview Deployments for every PR** (should be on by default). This lets you click a link and test every branch before merging.
- [ ] Add a **custom 404 page** (optional but nice).

### GitHub

- [ ] Enable **branch protection** on `main`: Settings → Branches → Add rule → "Require a pull request before merging" + "Require status checks" (after Session 10 the CI check will appear).
- [ ] **Settings → Secrets and variables → Actions** — nothing to add yet, but this is where future deploy keys would live.
- [ ] **Security → Dependabot alerts** — turn on. It'll tell you about vulnerable dependencies.

### Password manager

- [ ] Save: Supabase DB password, Supabase service_role key, Resend API key, any Vercel tokens. If they're only on your laptop, you'll lose them.

---

## Safety rules that apply to every Claude Code session

- **Always start on a new branch.** If Claude Code doesn't offer, tell it: "Please create a new branch first."
- **Never say "yes to all".** Read the diff. If it's 400 lines, ask: "Can you break this into smaller commits?"
- **Test locally before merging.** `pnpm dev` should boot. Sign in, click around.
- **If you get scared, stop.** Tell Claude Code: "Undo the last change." Or outside Claude Code: `git reset --hard HEAD~1` on the broken branch.
- **Don't delete branches until the fix is in main.** The branch is your safety net.
- **One concern per branch.** Don't let "add pagination" turn into "add pagination and refactor the auth flow and update the UI kit". If Claude Code drifts, say: "Stay focused on pagination only."
- **Migrations are one-way.** Once you've run a migration against your real DB, rolling back is painful. Test new migrations on a Supabase branch first (Supabase has a feature for this — "Database Branches" on paid plans) or on a copy of your project.

---

## When you're stuck

- **Claude Code broke something.** `git reset --hard HEAD` on the branch, or delete the branch and start over.
- **You don't understand what Claude Code just said.** Paste it back and say: "Explain this like I'm not a coder."
- **A command failed.** Copy the whole error, paste it into Claude Code, ask: "What went wrong and how do we fix it?"
- **The app won't boot after a change.** Ask: "Please run `pnpm build` and `pnpm dev` and diagnose why they fail. Do not change code yet, just report."
- **Bigger question.** Come back to Cowork and ask me — I can help interpret, debug, or write a new playbook section.

---

## A realistic timeline for a non-coder doing this in evenings and weekends

| Week | What gets done | Hours |
|---|---|---|
| 1 | Phase 0 setup + Phase 1 P0s | 4-6 |
| 2 | Phase 2 robustness (pagination, errors, uploads, races) | 4-6 |
| 3 | Phase 3 structural (contexts, hooks, view split, tests+CI) | 6-8 |
| 4 | Phase 4 hardening — cherry-pick items | 3-5 |

After week 1, your app is dramatically safer. After week 3, it's actually production-ready for a soft launch. Week 4 is for going beyond "safe" to "scalable".

---

## One last note

You're not a coder, but that's OK. You'll be a much better *owner* of this codebase after three weekends of this. You'll know what every file roughly does. You'll be able to reason about changes. The app is yours — Claude Code is just the pair of hands. Read the diffs. Ask why. Push back when something smells off. That's what turns "vibe-coded MVP" into "a product I can actually run."

Good luck. Ping me when you hit the first snag — I'd rather unblock you early than help you recover late.
