# AgrowLink — Fix-Pass Playbook v2 (May 2026)

**Revision:** v2.1 — incorporates Claude Code's review of v2.0 (May 12, 2026)
**Replaces:** `AgrowLink_Fix_Playbook.md` (April 2026)
**Goal:** Take AgrowLink from "partial fix-pass in April → paused for a month" to "production-ready for the first 100–200 real users" in roughly **3–4 focused weekends**.
**Audience:** You — a non-coder running the project solo, with Claude Code as your pair of hands and Anthropic Claude (this assistant) as your strategist.
**Budget:** Stay inside Supabase free tier + Vercel hobby + Resend free (3000 emails/month). Should remain €0/month plus your domain.

### Changes from v2.0

- **P1.2a** — SQL deletion order rewritten. The original instructed deleting `chat_messages WHERE sender_id = me` separately before `chats`, which is redundant given the `ON DELETE CASCADE` foreign key. The new wording explicitly says: just delete `chats`, let cascade handle messages from both parties. Also adds `SET search_path = public, pg_temp` to avoid a security-advisor warning.
- **P1.2c** — Added clarification that `SUPABASE_SERVICE_ROLE_KEY` is auto-provided by Supabase to all hosted edge functions. No manual secret needed. Also added a fallback instruction: if the "sign up again with the same email" test fails, ping Anthropic Claude to pull the function logs.
- **P2.5** — File size cap lowered from 10 MB to 5 MB to match the actual `listing-photos` bucket limit. Without alignment, uploads between 5–10 MB would pass client validation then silently fail server-side.
- **P2.7** — Reversed the recommendation: the client-side `chats.update(...)` call **stays**. The trigger is added as a server-side safety net, not as a replacement. Removing the client write would have added perceived latency.
- **P3.1c** — Removed the invalid `--data=false` flag from the `supabase db dump` command. Schema-only is the default behaviour; `--data-only` does the opposite. Added a note warning against letting Claude Code invent the flag.
- **0.4** — Reworded from "drop the file in" to "verify the file is already there", since you likely placed it before reading.

---

## How to read this document

There are three kinds of steps. They are labelled in the line itself so you never get confused.

- **(Claude Code)** — paste the prompt into your terminal Claude Code session. Claude Code will read your repo, propose changes, and ask for approval. Always review the diff before saying yes.
- **(Dashboard)** — click around in a browser. Either Supabase, Vercel, Resend, or GitHub. No code needed.
- **(Anthropic Claude)** — open `claude.ai` and ask me. Used for verification, planning, and "is this safe to do" checks. I have direct read access to your Supabase database and your Vercel deployments via MCP tools, so I can verify changes are live in seconds.

Wherever you see a checkbox `- [ ]`, tick it once that step is complete. Print this document if you prefer paper.

---

## A glossary of terms you don't need to memorise

You'll see these words throughout. Skim now, come back later when one confuses you.

- **Repo** — the folder of all your code (`Agrolink2`). "Repo" is short for "repository".
- **Branch** — a separate copy of the code where you can experiment. Your live code is on the branch called `main`. We make new branches for new work, then merge them back into `main` when they're good.
- **Commit** — a saved snapshot of your code. Every time you "commit", git records what changed and lets you go back later.
- **PR (Pull Request)** — a way to merge a branch back into `main` with a review step. On GitHub.com, PR pages show you exactly what's changing.
- **RLS (Row Level Security)** — Supabase's rule system for "who can see/edit what data". Critical for security. Most bugs people hit with Supabase come from RLS being wrong.
- **Migration** — a file ending in `.sql` that changes the database structure. Every change to your database goes through a migration file so you have a history.
- **Edge Function** — a small piece of code that runs on Supabase's servers (not in your browser). You have three: `make-server-3243d623` (old, dangerous, we'll kill it), `notify-new-message` (sends email when someone gets a chat), `server` (also old, kill it).
- **Service role key** — a master key that bypasses ALL security. Edge functions use it. The browser app should NEVER see it.
- **Anon key** — a public key the browser app uses. Safe to expose. RLS is what protects your data, not this key.
- **Production / live** — your actual website running at `agrowlink.app` that real users hit.
- **Diff** — the list of exact lines being changed. Always read it before approving.

---

## Where you are right now (state of the project, May 2026)

This section is the **most important context for you to understand**, because it determines what stays and what gets cut from the April playbook.

### What was already done since the April review (✅ confirmed live)

I verified each of these by querying your Supabase database and Vercel deployments directly.

- ✅ **Admin role is fully wired.** Your `profiles.role` column exists, your own account (`av.pereiradacosta@gmail.com`) is set to `admin`, and the admin panel checks `currentUser.role === 'admin'` server-side instead of comparing emails on the client.
- ✅ **Dead edge function code removed from the repo** (commit `68af9edd`). **BUT** — the deployed copy is still active on Supabase's servers. We'll kill it in Phase 1.
- ✅ **`INTERNAL_SECRET` fallback removed** from the email function (commit `3d7bf954`).
- ✅ **`node_modules/` and `dist/` untracked from git** (commit `2c2b0e09`).
- ✅ **Emergency database hotfix applied** (commit `67bf7c55`) — chat update policy fixed, app_config secret rotation, orphan cleanup unscheduled.
- ✅ **Email sender uses verified `agrowlink.app` domain** (no longer the Resend sandbox).
- ✅ **Email verification on signup works** — you confirmed this with a real test.
- ✅ **All Phase 1 work merged to `main`** via PR #5 (commit `8ff0b992`).

### What was NOT done from the April playbook (still open)

- ❌ **Edge function still deployed.** The code is gone from your repo but `make-server-3243d623` v21 is still actively running on Supabase with full database access. This is the single biggest security gap right now.
- ❌ **Account deletion (P0-6)** — no `delete-account` edge function exists. The April playbook had this as the highest-stakes item; it was deferred.
- ❌ **Baseline migration / RLS dump** — never committed. So if you ever rebuild the project, your RLS rules are gone.
- ❌ **All of Phase 2** — no pagination, no error toasts everywhere, no image upload validation, no race-condition guards.
- ❌ **All of Phase 3** — no component split, no AuthProvider extraction, no tests, no CI.
- ❌ **All of Phase 4** — no Sentry, no rate limiting, no accessibility audit, no bundle analysis.

### New findings since April (added to this v2 playbook)

The April review couldn't see your live database directly. Now that I can, I've found these new issues:

- 🔴 **23 RLS policies are written in a slow style** that re-evaluates `auth.uid()` once per row. At 100–200 users this becomes noticeable lag. One-line fix per policy.
- 🔴 **Public storage bucket has an extra SELECT policy** that lets anyone list every photo file. Should be deleted.
- 🔴 **Seven database functions are publicly callable** by anyone on the internet without logging in. Should be locked down.
- 🟠 **3 orphan photo files in storage** — uploaded but never linked to a listing. Will keep growing without cleanup.
- 🟠 **Mutable `search_path` on 4 database functions** — minor SQL injection risk vector.
- 🟠 **Leaked-password protection is OFF.** Free Supabase feature, one click to enable.
- 🟠 **Two duplicate policies on `chat_messages` DELETE and `listings` SELECT** — silent performance tax.
- 🟠 **Migration history drift** — the local migration files don't match the live DB. Documented in your own commit message.

### Strategic decisions you've made for this v2

These came up explicitly in our planning conversation and are now baked in:

1. **Drop the "Controlo de Contactos" feature for launch.** The contact governance toggle has been broken for User B's view for over a month despite ~5 fix attempts. We're going to **hide it from the UI**, keep the DB columns (so we can re-enable later), and ship without it. This is the right call.
2. **Solo operator, no helpers.** No "open a PR for review" — you ARE the reviewer.
3. **€0 budget cap.** Every recommendation must stay inside free tiers.
4. **Real user testing happens AFTER this playbook.** So you can purge test data in Phase 1 without fear.

---

## How to use this playbook efficiently

- Do phases **in order**. Phase 1 fixes the things that could bite you tomorrow. Phase 2 makes the app robust under real users. Phase 3 makes future work fast. Phase 4 makes things "nice".
- Within a phase, the order also matters — earlier items unblock later ones.
- **Each Claude Code session = one branch = one PR = one merge.** Don't combine concerns.
- **Stop when tired.** Don't merge a PR at midnight just to feel done. Sleep on it.
- **Anthropic Claude is your safety net.** Before any scary change, ask me first: "Is this safe? What could go wrong?"

---

# Phase 0 — Verify the setup is still good (20 minutes)

A month has passed. Tools and credentials may have rotted. Let's check before we change anything.

### 0.1 Open the repo (Claude Code)

- [x] Open PowerShell.
- [x] Type `cd C:\Users\TwinPikes.TWINPIKES-078\Desktop\Agrolink2` and press Enter.
- [x] Type `claude` and press Enter. Wait for Claude Code to start.

### 0.2 Confirm everything still works (Claude Code)

Paste this exact message:

> **Hi Claude Code. Before we begin Phase 1 of the v2 playbook, please do a health check: run `git status` to confirm a clean tree, `git log --oneline -5` to show recent commits, `pnpm install` to refresh dependencies, then `pnpm build` to confirm the project builds. Report any errors but don't try to fix them yet.**

- [x] If `git status` says anything other than "nothing to commit, working tree clean", **stop**. Tell Claude Code: "There are uncommitted changes. Please show me what they are with `git diff`, and recommend whether to commit, stash, or discard them."
- [x] If `pnpm install` errors, ask: "What's failing and how do we fix it?"
- [x] If `pnpm build` errors, ask the same. We need a green build before changing anything.

### 0.3 Create the v2 branch (Claude Code)

> **Please create and switch to a new branch called `cleanup/v2-launch-prep`. Confirm with `git status` after.**

- [x] Confirm Claude Code reports "Switched to a new branch 'cleanup/v2-launch-prep'".

### 0.4 Confirm the v2 playbook is in the repo (you)

You probably already placed this file in `docs/` when you started reading it. Verify:

- [x] Open `Agrolink2/docs/` in your file explorer.
- [x] Confirm `AgrowLink_Fix_Playbook_v2.md` is there, alongside the April originals (`AgrowLink_Fix_Playbook.md` and `AgrowLink_Code_Review.md`).
- [x] If not, drop the file in now.
- [x] Either way: `git status` in PowerShell. If the playbook is untracked, ask Claude Code: **"Please commit `docs/AgrowLink_Fix_Playbook_v2.md` with message `docs: add v2 playbook` so future Claude Code sessions can read it."**

### 0.5 Ground Claude Code in this v2 playbook (Claude Code)

> **Please read `docs/AgrowLink_Fix_Playbook_v2.md` in full. It supersedes the April playbook. After reading, list the Phase 1 steps in this v2 in one line each, so I know we're aligned. Do not make any changes yet.**

- [x] Sanity-check Claude Code's summary matches Phase 1 below.

---

# Phase 1 — Stop the bleeding (one weekend, ~6 hours)

These are the items that could bite you the moment a real user — or worse, a malicious one — finds your site. We're closing them before anything else.

## P1.1 — Kill the live edge function `make-server-3243d623` (Dashboard, 5 minutes)

**Why this matters in plain English:** This edge function is a piece of server code that has a master key to your entire database. It can read and write ANY user's data. The code was removed from your repo a month ago, but the deployed version is still alive on Supabase's servers and still answers requests. It also exposes a `/seed` endpoint with no authentication — anyone who finds the URL can insert fake listings under any user's name.

The fix is one button click.

- [x] Open https://supabase.com/dashboard/project/odznjlpzknczzutgirvk/functions
- [x] You'll see three functions. Find `make-server-3243d623`.
- [x] Click on it.
- [x] Click the **⋮ (three dots) → Delete function** (top right or in the settings tab).
- [x] Type the function name to confirm. Delete.
- [x] Repeat for the function called just **`server`** (also dead code).
- [x] **Keep** `notify-new-message`. It's the email function and is live.

### P1.1 verification (Anthropic Claude)

Once done, message me in claude.ai:

> "Please verify make-server-3243d623 and server are deleted from Supabase."

I'll run a list query and confirm only `notify-new-message` remains.

---

## P1.2 — Build proper account deletion (Claude Code + Dashboard, 2 hours)

**Why this matters:** Under GDPR (Portuguese law), when a user clicks "Eliminar conta", their data — including their auth record — must be fully erased. Today, the delete flow runs seven separate delete commands from the browser. If any fail midway, the user is half-deleted. The `auth.users` record (containing their email) is NEVER deleted. They can't sign up again with that email. You'd fail an audit.

We're going to replace this with a single database function that deletes everything in one transaction (all-or-nothing), plus a tiny edge function that also wipes the auth record.

### P1.2a — Create the database function (Claude Code)

Paste:

> **Please implement atomic account deletion as described in P1.2 of the v2 playbook:**
>
> **1. Create a new migration file `supabase/migrations/20260512000000_delete_account.sql` that defines a Postgres function `delete_user_account()` with `SECURITY DEFINER` and `SET search_path = public, pg_temp` to avoid the mutable search_path security advisor warning.**
>
> **2. The function should, in this exact order inside a single transaction:**
>    - **First, declare a local variable `caller_id uuid := auth.uid();` and `RAISE EXCEPTION 'Not authenticated' WHEN caller_id IS NULL`.**
>    - **`DELETE FROM listing_photos WHERE listing_id IN (SELECT id FROM listings WHERE seller_id = caller_id);`**
>    - **`DELETE FROM listings WHERE seller_id = caller_id;` (this cascade-deletes any related rows by FK).**
>    - **`DELETE FROM chats WHERE buyer_id = caller_id OR seller_id = caller_id;` (the FK on chat_messages.chat_id is ON DELETE CASCADE, so all messages in those chats — from BOTH parties — are removed automatically. Do NOT add a separate chat_messages delete; that's redundant.)**
>    - **`DELETE FROM favorites WHERE user_id = caller_id;`**
>    - **`DELETE FROM reports WHERE reporter_id = caller_id;`**
>    - **`DELETE FROM profiles WHERE id = caller_id;`**
>    - **`RETURN jsonb_build_object('deleted', true);`**
>
> **3. After the function definition, `REVOKE EXECUTE ON FUNCTION delete_user_account() FROM anon;` and `GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;`.**
>
> **4. Apply the migration via the MCP `apply_migration` tool (NOT `supabase db push` — we know there's history drift).**
>
> **5. Show me the SQL before applying, and confirm after applying.**

- [X] Read the SQL. Verify: (a) it declares `caller_id := auth.uid()` and raises if null, (b) it only deletes `chats` (not `chat_messages`) since the FK cascades, (c) it has `SECURITY DEFINER` AND `SET search_path = public, pg_temp`, (d) it revokes from `anon`.
- [x] If yes: tell Claude Code **"Looks good. Apply it."**

**Why the deletion order matters:** Postgres foreign keys on this project are configured `ON DELETE CASCADE` (verified). So `DELETE FROM chats` automatically wipes every `chat_message` whose `chat_id` matches — including messages from the OTHER party in that conversation. If we instead deleted `chat_messages WHERE sender_id = caller_id` first, we'd only delete half the messages and leave the other half attached to a chat we're about to delete (which the CASCADE would then clean up anyway). Cleaner to just delete `chats` and let the cascade do its job.

### P1.2b — Create the edge function (Claude Code)

Paste:

> **Now create a new Supabase Edge Function at `supabase/functions/delete-account/index.ts` that:**
>
> **1. Accepts a POST request with a Bearer token in the Authorization header.**
> **2. Verifies the token using the Supabase admin client and extracts the user ID.**
> **3. Calls the `delete_user_account` RPC using the user's own JWT (so the SECURITY DEFINER check works).**
> **4. After the RPC succeeds, calls `supabase.auth.admin.deleteUser(userId)` using the service role key to wipe the auth record.**
> **5. Returns `{ success: true }` on success, or a clear error otherwise.**
> **6. Set CORS to allow only `https://agrowlink.app` (not `*`).**
> **7. Has `verify_jwt: false` in its config since we handle auth manually.**
>
> **Stop and show me the code. Do not deploy.**

- [x] Read the function. Look for: is the CORS origin set to your domain, not `*`? Does it check the token? Does it wipe the auth user AFTER the data deletion succeeds?
- [x] When happy: **"Commit with message: `feat(account): atomic deletion via Postgres function + edge function`"**

### P1.2c — Deploy and test the edge function (Dashboard, 30 min)

The edge function needs to be deployed manually because we don't have the Supabase CLI fully wired.

- [x] Open https://supabase.com/dashboard/project/odznjlpzknczzutgirvk/functions
- [x] Click **Deploy a new function** (or **Create function**).
- [x] Name it: `delete-account`
- [x] Copy the contents of `supabase/functions/delete-account/index.ts` from your repo into the editor.
- [x] Set **Verify JWT** to **OFF** (this function handles its own auth).
- [x] Click **Deploy**.

**A note about secrets:** Supabase automatically provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to every edge function in the hosted environment. You do NOT need to add them as secrets. Your existing `notify-new-message` function uses them this way.

**Test it works:**

- [ ] On https://agrowlink.app, sign up a brand new test account with a throwaway Gmail (e.g. yourname+test@gmail.com).
- [ ] Log in as that test account.
- [ ] Go to Perfil → Eliminar conta.
- [ ] Confirm the deletion.
- [ ] Try to sign back in with that same email. It should say "user not found".
- [ ] Try to sign UP again with that same email. It should let you (proving the auth record was wiped).
- [ ] **If the second "sign up" step fails because the auth record wasn't wiped:** ping me on claude.ai with `"Please check delete-account edge function logs for the last 1 hour"`. I'll pull the logs and tell you why `auth.admin.deleteUser` failed (usually a permissions or wrong-key issue).

### P1.2d — Wire the frontend to use the new endpoint (Claude Code)

Paste:

> **Now update the frontend to call the new edge function instead of the seven inline deletes. In `src/app/App.tsx`, find the `handleDeleteAccount` function. Replace its body with a single POST to `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account` with the bearer token, and handle success/error with toasts. Show me the diff before committing.**

- [x] Review the diff. The new function should be ~15 lines instead of 50.
- [x] **"Commit with message: `fix(account): frontend uses new atomic delete endpoint`"**

### P1.2 verification (Anthropic Claude)

Message me:

> "Please verify the delete-account function is deployed and the delete_user_account migration was applied."

---

## P1.3 — Hide the contact-governance UI (Claude Code, 30 minutes)

**Why this matters:** The "Controlo de Contactos" feature lets sellers restrict how buyers contact them (WhatsApp off, time-of-day restrictions). It's been broken for User B's view across multiple fix attempts. Rather than spend another weekend debugging it, we're going to **hide the UI** and **show all contact options by default** (the safe fallback). The database columns stay, so we can re-enable in the future.

### P1.3a — Make Claude Code understand the goal (Claude Code)

Paste:

> **I want to temporarily disable the Controlo de Contactos feature. Specifically: in the Profile/Settings UI, hide the section that lets users toggle WhatsApp/Phone visibility and set time-of-day rules. In the listing detail page and listing cards, always show all available contact methods (WhatsApp button if seller has phone with whatsapp flag, Phone button if seller has phone). Do NOT delete the database columns or the `sellerContactCache` state — we may re-enable this later.**
>
> **Before changing anything, please:**
> **1. Find the file/section that renders the Controlo de Contactos toggle in the profile settings.**
> **2. Find the function that decides whether to show WhatsApp/Phone buttons on listing cards and detail pages (probably called `getContactPolicy` or similar, taking `listing`, `currentUser`, `cache` as arguments).**
> **3. Show me the locations and your plan. Don't change code yet.**

- [ ] Read the plan. It should touch the settings UI and the contact-button logic, NOT touch the schema.

### P1.3b — Apply the change (Claude Code)

Once you've approved the plan:

> **OK, please implement it. Show me the diff before committing. Add a short comment above each disabled block explaining "temporarily disabled in v2 launch playbook — re-enable when the cache-population bug is fixed".**

- [ ] Review the diff. Confirm: settings toggle is hidden, listing buttons always show, comments explain why.
- [ ] **"Commit with message: `feat(contacts): temporarily disable Controlo de Contactos for launch`"**

### P1.3c — Test (you)

- [ ] After Claude Code pushes the branch, wait ~2 minutes for Vercel to build a preview.
- [ ] In your Vercel dashboard, click the preview URL.
- [ ] Log in as User A (your main account). Confirm the Controlo de Contactos toggle is GONE from your profile.
- [ ] Open a listing as User A. Confirm WhatsApp and Phone buttons are visible.
- [ ] Open an incognito window. Sign in as User B (your test account). Open the same listing. Confirm WhatsApp and Phone buttons are visible.

---

## P1.4 — Fix the public storage bucket policy (Anthropic Claude, 2 minutes)

**Why this matters:** Your `listing-photos` bucket is public (correct, since photos appear on listing pages). But it ALSO has a `SELECT` policy on the `storage.objects` table that lets anyone LIST every file in the bucket. Public buckets don't need this for the URLs to work. Today, anyone can enumerate every photo path, including from listings you've deleted.

I'll run this fix directly via MCP. Message me:

> **Please drop the listing_photos_read policy on storage.objects per playbook P1.4, then verify the bucket still serves photos correctly.**

I'll run the SQL and confirm.

---

## P1.5 — Lock down the public SECURITY DEFINER functions (Anthropic Claude, 5 minutes)

**Why this matters:** Seven of your database functions are marked `SECURITY DEFINER` (meaning they run with elevated privileges). All seven are also callable by anyone on the internet via HTTP, without logging in. This is wrong — these functions are meant to be called by triggers, not by the public REST API.

The fix is `REVOKE EXECUTE ... FROM anon, authenticated` on each one.

Message me:

> **Please apply the SECURITY DEFINER lockdown migration per playbook P1.5. Revoke EXECUTE from anon and authenticated on all 7 functions flagged by the security advisor.**

I'll apply the migration and re-run the advisor to confirm warnings are gone.

---

## P1.6 — Enable leaked-password protection (Dashboard, 1 minute)

**Why this matters:** Supabase can check new passwords against the HaveIBeenPwned database for free. If a user tries to sign up with `password123`, it rejects them. You currently have this OFF.

- [ ] Open https://supabase.com/dashboard/project/odznjlpzknczzutgirvk/auth/providers
- [ ] Scroll to **Email** → click to expand.
- [ ] Find **Leaked password protection** (or **Password Strength**).
- [ ] Toggle **ON**.
- [ ] Save.

---

## P1.7 — Set the storage bucket size limit (Dashboard, 2 minutes)

**Why this matters:** Your bucket allows files up to 5 MB. That's fine. But there's no policy enforcing it as a hard cap — it's only the bucket setting. A determined user could try to bypass via the API.

- [ ] Open https://supabase.com/dashboard/project/odznjlpzknczzutgirvk/storage/buckets
- [ ] Click `listing-photos`.
- [ ] Click the **⚙ Configuration** or **Settings** tab.
- [ ] Confirm **File size limit** is `5,242,880 bytes (5 MB)`.
- [ ] Confirm **Allowed MIME types** is `image/jpeg, image/png, image/webp, image/heic`.
- [ ] If not, set them and save.

---

## P1.8 — Clean up orphan storage files (Anthropic Claude, 5 minutes)

**Why this matters:** Your bucket has 11 files but only 8 are referenced from the `listing_photos` table. The 3 orphans are upload attempts that never linked. Will only grow. We'll delete them once now, and add a cleanup function for the future.

Message me:

> **Please identify the 3 orphan files in listing-photos and propose what to do. Don't delete anything yet — show me the file paths and how they got orphaned first.**

I'll find them and confirm whether they're safe to delete. (If they're recent, they might be uploads in progress.)

---

## P1.9 — Phase 1 final test + merge (you + Claude Code)

### Test the live preview

- [ ] Open the Vercel preview URL for the `cleanup/v2-launch-prep` branch.
- [ ] Run through this manual checklist:
  - [ ] Sign up a new test account
  - [ ] Confirm the email link
  - [ ] Log in
  - [ ] Publish a listing with 2 photos
  - [ ] Open the explore page — confirm your listing appears
  - [ ] Open the listing detail
  - [ ] Send a chat message from a different incognito account
  - [ ] Receive the email notification
  - [ ] Mark as favourite
  - [ ] Delete the test account
  - [ ] Try logging in as that account — should fail
  - [ ] Try signing up with the same email — should work
- [ ] If anything breaks, paste the error into Claude Code and ask "What went wrong?"

### Merge to main (Claude Code)

> **Please push the `cleanup/v2-launch-prep` branch and open a pull request. Include a summary of every commit in the PR description. Use the `gh` CLI if available.**

- [ ] Read the PR description.
- [ ] Merge the PR on GitHub.com (button: **Merge pull request**).
- [ ] Wait for the production deploy on Vercel to go green.
- [ ] Smoke-test the live site one more time.

🎉 **Phase 1 done. The dangerous stuff is gone.** You can launch from here if you wanted — Phases 2 and 3 are about making it robust and maintainable for the next year.

---

# Phase 2 — Robustness for real users (one weekend, ~6 hours)

Now we make the app behave well when real users hit it. These are not optional for 100–200 users.

Each session is one branch, one PR, one merge. Pick a couple of evenings, do them one at a time.

## P2.1 — Pagination (Claude Code, 1 hour)

**Why this matters:** Today, every time someone opens the explore page, the app downloads ALL listings. At 6 listings this is fine. At 200 listings, mobile users on slow connections will see a spinner for 10+ seconds.

Paste in a new branch (Claude Code creates branches automatically when you ask):

> **On a new branch `cleanup/v2-pagination`, add pagination to the three big queries:**
>
> **1. `src/app/api.ts` → `listings.getAll()` — accept `{ page = 0, pageSize = 50 }` and use Supabase `.range(page * pageSize, (page + 1) * pageSize - 1)`.**
> **2. Same for `chats.getAll()` and `chats.getMessages(chatId)`.**
> **3. In `App.tsx`, where the explore view renders, add a "Carregar mais anúncios" button at the bottom that loads the next page.**
> **4. Default page size of 50.**
>
> **Show me your plan first.**

- [ ] Approve the plan.
- [ ] When done: review the diff. Make sure it doesn't break the empty state ("no listings yet").
- [ ] Test on the preview URL — scroll past 50 listings (you don't have 50 yet, but the button shouldn't appear at all when there are <50).
- [ ] **"Commit and push. Open a PR."**

## P2.2 — RLS performance fix (Anthropic Claude, 10 minutes)

**Why this matters:** Your 23 RLS policies use `auth.uid()` in the slow style. At low user counts you won't notice. At 100–200 with multiple listings per user, queries get slower per row. The fix is a one-line change per policy: wrap `auth.uid()` in `(select auth.uid())`. Supabase explicitly documents this. It's mechanical.

Message me:

> **Please apply the RLS performance migration per playbook P2.2 — wrap auth.uid() with (select auth.uid()) on all 23 flagged policies. Verify the performance advisor shows 0 warnings after.**

I'll generate the migration, apply it, and confirm with the advisor.

## P2.3 — Drop the duplicate permissive policies (Anthropic Claude, 5 minutes)

**Why this matters:** You have two SELECT policies on `listings` that overlap (`listings_select_all` already covers what `listings_select_own` does). Same on `chat_messages` DELETE. Every query runs both. Small tax, easy fix.

Message me:

> **Please drop the redundant permissive policies per playbook P2.3 — keep listings_select_all, drop listings_select_own; keep one of the chat_messages DELETE policies (the broader one).**

## P2.4 — Error toasts on every user action (Claude Code, 1 hour)

**Why this matters:** Today, if a chat message fails to send, the user sees nothing — the message just doesn't appear. Same for failed favourites, failed publishes. We need every error to either (a) show a toast in Portuguese, or (b) roll back the optimistic state.

In a new branch:

> **On a new branch `cleanup/v2-error-toasts`, audit every `try/catch` block in `src/app/App.tsx` and `src/app/api.ts`. For any catch that runs in response to a user action (chat send, message send, favourite toggle, publish listing, edit listing, delete listing, edit profile, save survey), do BOTH:**
>
> **1. Add a `toast.error('Algo correu mal. Por favor tenta novamente.')` (or a more specific message if the error is recognisable) — using whatever toast library is already imported.**
> **2. If the action had optimistic state (e.g. the favourite heart filled in before the API responded), roll it back.**
>
> **Show me the list of catches you found first before changing.**

- [ ] Read the list. Should be ~10–15 catches.
- [ ] Approve, review the diff, commit, push, PR, merge.

## P2.5 — Image upload validation (Claude Code, 30 min)

**Why this matters:** Today a user can pick a 40 MB HEIC photo on iPhone and the upload might silently fail. They get no feedback. Also, the client must reject the file BEFORE attempting upload, because Supabase's storage hard-caps at 5 MB (verified in P1.7) — anything bigger fails server-side without a useful error.

In a new branch:

> **On a new branch `cleanup/v2-image-uploads`, in `src/app/components/PublishWizard.tsx` find the file input handler. Before passing to the compression/upload, validate:**
>
> **1. Reject if `file.size > 5 * 1024 * 1024` (5 MB — matches the Supabase bucket cap) — show toast: "Foto demasiado grande. Máximo 5 MB."**
> **2. Reject if `!file.type.startsWith('image/')` — show toast: "Apenas imagens são permitidas."**
> **3. Cap total photos at 5 — show toast: "Máximo 5 fotos por anúncio."**
> **4. If the Supabase upload fails despite client validation, show toast: "Erro ao carregar a foto. Tenta novamente."**
>
> **Note: the 5 MB cap is intentional and matches the server-side `file_size_limit` on the `listing-photos` bucket. Do not raise it without also updating the bucket setting.**
>
> **Show me the diff before committing.**

## P2.6 — Race-condition guards (Claude Code, 30 min)

**Why this matters:** Double-clicking "Publish" creates two listings. Double-clicking a favourite makes the state flap. Easy to fix.

In a new branch:

> **On a new branch `cleanup/v2-race-guards`, find the three write paths most prone to double-click: chat creation, favourite toggle, publish. For each, add a `useState` `isSubmitting` boolean and a `disabled={isSubmitting}` on the button. Also add a unique constraint migration on `chats(listing_id, buyer_id, seller_id)` if not already present (I think it is — verify with the schema).**

- [ ] When done, message me to verify the unique constraint situation: "Please check whether `chats_unique_thread` is the unique index on (listing_id, buyer_id, seller_id)."

## P2.7 — Trigger-based chat preview (Anthropic Claude, 10 minutes)

**Why this matters:** When a chat message is sent, the code currently writes to TWO places: the `chat_messages` table AND a `messages` jsonb column on `chats`. If the second write fails, the chat preview gets stale until the user refreshes. We're going to add a database trigger that updates the preview server-side as a **safety net** — but we keep the client-side write because removing it would add ~300–800ms of perceived latency to every sent message (the user would see their message arrive but the conversation-list preview would lag behind by a Realtime round-trip).

**Approach: defense in depth.** Client writes for instant UX → if it fails, the trigger catches it on the next message → user never sees a stale preview for long.

Message me:

> **Please apply the trigger-based chat preview migration per playbook P2.7. The trigger should fire AFTER INSERT on chat_messages and update the parent chats row's `last_update` and `messages` (a one-element JSONB array containing the latest message preview). The trigger should use `SET search_path = public, pg_temp` and be idempotent — i.e. running it after the client already wrote the same data should produce the same result, not duplicate.**

Once I confirm the trigger is live, **do NOT remove the client-side `chats.update(...)` call**. Keep it for UX speed. The trigger is the durable fallback. The redundancy is intentional.

- [ ] When I confirm the trigger is deployed, you're done with P2.7 — no Claude Code step needed.

## P2.8 — Email throttling (Claude Code, 30 min)

**Why this matters:** Your Resend free tier is 100 emails/day. A spammy user could blow through that in one busy day. We're going to add a simple per-user-per-hour limit.

In a new branch:

> **On a new branch `cleanup/v2-email-throttle`, modify the `notify-new-message` edge function to:**
>
> **1. Look up the receiver's most recent unread notification email timestamp from a new `email_sends` table (create it via migration).**
> **2. If the receiver received an email in the last 30 minutes, skip sending (return early with `{ throttled: true }`).**
> **3. Otherwise, send the email AND record the timestamp.**
> **4. The `email_sends` table: `id uuid pk, user_id uuid fk profiles, sent_at timestamptz default now()`. Index on `(user_id, sent_at DESC)`.**

- [ ] Review the migration AND the function change.
- [ ] Test by sending two chat messages in a row to a different account. The second should not generate an email.

## P2.9 — Test data cleanup (Anthropic Claude, 5 min)

**Why this matters:** You have 4 test profiles, 6 test listings, 5 test favourites, 11 storage files in production. Before real users arrive, wipe them.

When you're ready:

> **Please wipe all production test data: delete all profiles, listings, listing_photos, favorites. Wipe all files from the listing-photos storage bucket. Reset the cron job stats. Confirm afterwards that all counts are zero.**

⚠️ **Only do this once you're truly ready to invite real users.** It's destructive.

## P2.10 — Phase 2 merge

Same pattern as Phase 1.9: test the preview, merge each PR one by one, final smoke test on production.

---

# Phase 3 — Make future work fast (one weekend, ~8 hours)

These are bigger refactors. They make every future feature easier. Without them, every new feature compounds the risk of another runtime crash (you saw this in April with the "Os Meus Anúncios" crash cluster).

## P3.1 — Capture the current DB into a baseline migration (Claude Code + Dashboard, 1 hour)

This was P0-4 in the April playbook and never got done. It's critical for future you.

### P3.1a — Install Supabase CLI (Dashboard / terminal)

- [ ] Open PowerShell.
- [ ] Install the Supabase CLI: see https://supabase.com/docs/guides/cli/getting-started. On Windows the easiest is via Scoop: `scoop install supabase`.
- [ ] Verify: `supabase --version`.

### P3.1b — Link to your project (terminal)

- [ ] `supabase login` (will open a browser to authenticate).
- [ ] `cd C:\Users\TwinPikes.TWINPIKES-078\Desktop\Agrolink2`
- [ ] `supabase link --project-ref odznjlpzknczzutgirvk`
- [ ] When prompted for the database password, get it from the Supabase dashboard → Project Settings → Database → "Reset database password". Use a password manager.

### P3.1c — Dump and commit (Claude Code)

> **The Supabase CLI is now linked. Please run `supabase db dump --schema public -f supabase/migrations/00000000000000_baseline.sql` to capture the current state. (Schema-only is the default — no need for a `--data` flag; `--data-only` would do the opposite.) Then read the file and give me a plain-English summary of: tables, RLS policies, functions, indexes, triggers. Don't commit yet.**

- [ ] Read the summary. Verify it matches what you expect (4 admin policies on reports, etc.).
- [ ] **"Commit with message: `chore(db): capture baseline schema and RLS as a migration`"**

**Note on the dump:** Supabase's `db dump` defaults to schema-only — exactly what we want. The `--data-only` flag (which we are NOT using) would output INSERT statements for the row data instead. There is no `--data=false` flag in the CLI; don't let Claude Code invent one.

From now on, **every** database change goes through a migration file. Never click around in the dashboard to change RLS again.

## P3.2 — Extract the AuthContext (Claude Code, 2 hours)

**Why this matters:** Your `App.tsx` is 2,400+ lines with 43 `useState` calls. The April commits show repeated crashes from hooks declared inside `switch/case` blocks. Pulling auth out is the first surgical extraction. Cuts ~300 lines from `App.tsx`.

In a new branch:

> **On a new branch `refactor/auth-context`, create `src/app/context/AuthContext.tsx` that owns all auth state (currentUser, accessToken, isLoginVisible, isAuthGateVisible, isOnboardingVisible, isPasswordRecovery, plus the handlers handleLogin, handleLogout, requireAuth). Expose a `useAuth()` hook. Replace usages in App.tsx. Keep behaviour identical. Show me the plan before coding.**

- [ ] Read the plan. Should be: new file + ~10 changes in App.tsx.
- [ ] Test thoroughly on preview: sign in, sign out, session restore, password reset.

## P3.3 — Extract data hooks (Claude Code, 2 hours)

In a new branch:

> **On a new branch `refactor/data-hooks`, create three custom hooks under `src/app/hooks/`: `useListings`, `useChats`, `useFavorites`. Each owns the relevant useState calls and API call wrappers currently in App.tsx. Replace usage in App.tsx. Keep behaviour identical.**

## P3.4 — Split renderView into page components (Claude Code, 2 hours)

> **On a new branch `refactor/views`, split each case of the `renderView()` switch in App.tsx (explorar, favoritos, meus-anuncios, mensagens, publicar, detalhes, perfil) into its own file under `src/app/views/`. App.tsx should drop below 800 lines. Show me the directory plan first.**

## P3.5 — Tests + CI (Claude Code, 2 hours)

> **On a new branch `chore/tests-ci`: (1) install Vitest and React Testing Library, (2) write 8–10 tests for pure functions: row mappers in api.ts, validatePhone, filteredListings, the new useAuth hook. (3) Add `.github/workflows/ci.yml` running `pnpm install --frozen-lockfile && pnpm build && pnpm test` on every PR. Aim for green CI on first try.**

After this you can enable branch protection on `main` requiring CI to pass.

---

# Phase 4 — Polish (spread across weekends)

Pick items as you have time. None are launch-blockers.

## P4.1 — Sentry error monitoring (Claude Code, 30 min, free tier)

> **Add Sentry to the React app and to the notify-new-message edge function. Use the free tier (5k events/month). Show me where to grab the DSN from Sentry.io.**

You'll get an email when ANY user hits an unhandled error.

## P4.2 — Resend digest mode (Claude Code, 1 hour)

Already partially done in P2.8 (throttling). Optional: extend to daily digests for inactive users.

## P4.3 — Bundle analysis & MUI removal (Claude Code, 2 hours)

> **Add @rollup/plugin-visualizer to Vite. Run `pnpm build` and report the top 10 largest modules. Then identify whether MUI (`@mui/material`, `@mui/icons-material`) is actually used anywhere essential; if not, remove it.**

Will cut your bundle by ~500 KB if MUI is dead weight.

## P4.4 — Accessibility audit (Claude Code, 2 hours)

> **Run axe-core against the live site and list the top accessibility violations. Fix the top 5.**

## P4.5 — Rate limiting on writes (Claude Code, 3 hours)

> **Implement a `rate_limits` table and a check function. Apply to: listing creation, chat message send, report creation. 30 per hour per user.**

## P4.6 — Service worker for offline (Claude Code, 1 day)

Rural Portugal has spotty mobile data. A service worker that caches the last-known listings would dramatically improve UX. Only do if you have time.

---

# The "Dashboard tasks" checklist (do these alongside Claude Code)

A consolidated list you can knock out during coffee breaks.

### Supabase dashboard

- [ ] **(P1.1)** Delete `make-server-3243d623` and `server` edge functions.
- [ ] **(P1.2c)** Deploy the new `delete-account` edge function.
- [ ] **(P1.6)** Enable leaked-password protection.
- [ ] **(P1.7)** Verify `listing-photos` bucket has 5 MB cap and MIME restrictions.
- [ ] **(P3.1b)** Reset DB password if needed, save in password manager.
- [ ] **(P2.9)** Wipe test data when ready.
- [ ] **(P4.1)** Add Sentry DSN as env var if you do P4.1.

### Resend dashboard

- [ ] Verify your domain is still valid (re-check SPF/DKIM/DMARC records).
- [ ] Note: you're on the free 3000/month plan. Should be enough at launch.

### Vercel dashboard

- [ ] **Branch protection**: Enable preview deployments for every PR (should be on by default).
- [ ] **Production protection**: Confirm only `main` deploys to production.
- [ ] **Env vars**: Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (probably are — check).
- [ ] **(P4.1)** Add `VITE_SENTRY_DSN` if you do Sentry.

### GitHub

- [ ] **Settings → Branches → Add rule for `main`**: "Require a pull request before merging" + (after P3.5) "Require status checks to pass".
- [ ] **Security → Dependabot alerts**: turn on.

### Password manager

- [ ] Save: Supabase DB password, Supabase service_role key, Resend API key, Vercel tokens, GitHub PAT (if any).

---

# Safety rules that apply to every Claude Code session

- **Always start on a new branch.** If Claude Code doesn't offer, tell it: "Create a new branch first."
- **Never approve a 400-line diff blindly.** Ask: "Break this into smaller commits."
- **Test locally before merging.** `pnpm dev` should boot. Click around.
- **One concern per branch.** Don't let "add pagination" turn into "add pagination and refactor auth".
- **If you get scared, stop.** Tell Claude Code: "Undo the last change." Or run `git reset --hard HEAD~1` on the branch.
- **Don't delete branches until merged.** The branch is your safety net.
- **Migrations are one-way.** Once you've run a migration, rolling back is painful. Test on a Supabase database branch if you have one.

---

# When you're stuck

| Problem | First action |
|---|---|
| Claude Code broke the build | `git reset --hard HEAD` on the branch, or delete the branch |
| You don't understand what Claude Code said | Paste it back: "Explain this like I'm not a coder." |
| A command failed | Paste the full error: "What went wrong and how do we fix it?" |
| The app won't boot | "Please run pnpm build and pnpm dev and diagnose. Don't change code, just report." |
| Something feels wrong but you can't say what | Stop. Open claude.ai, message me. I can verify the live state in ~2 minutes. |
| You broke production | On Vercel: Deployments → find the last good deploy → Promote to Production. Then debug. |

---

# Realistic timeline (evenings + weekends, solo)

| Week | What | Hours |
|---|---|---|
| 1 | Phase 0 + Phase 1 (P1.1 → P1.9) | 6–8 |
| 2 | Phase 2 (P2.1 → P2.10) | 6–8 |
| 3 | Phase 3 (P3.1 → P3.5) | 8–10 |
| 4 | Phase 4 cherry-picks + real-user invite | 4–6 |

After Week 1, the dangerous stuff is gone — you could soft-launch.
After Week 2, the app is robust under real users.
After Week 3, future features are 3x faster to add.
Week 4 is for polish.

---

# One last note

You've already done the hardest single thing — the admin role refactor in April. The rest of the work is mechanical: closing known gaps, one branch at a time. None of it requires you to write code. It requires you to:

1. Read what Claude Code proposes.
2. Push back when something smells off.
3. Click around to verify it works.
4. Move on to the next item.

You don't need to be a coder. You need to be a careful owner. Three weekends of this and you'll know more about your codebase than 90% of solo founders ever do about theirs.

Ping me on claude.ai whenever you're unsure. I can see your database, your deployments, and your function logs in real time — verifying a "did this actually land?" question takes me 30 seconds.

Good luck. Let's ship this.

---

*Playbook v2 — May 2026. Supersedes the April 2026 version. Reach out to Anthropic Claude in claude.ai for unblocks, live verifications, and emergency rollback help.*
