# Supabase data model and architecture (AgroLink)

This document defines the **target relational model** for AgroLink in Supabase, aligned with the current product decisions:

- One listing can have multiple buyers in chat.
- Listings/chats use hard delete.
- Listing photos are stored in Supabase Storage.
- Notifications are out of scope for now.
- Listing history/audit is required.

---

## 1) High-level architecture

### 1.1 Services and responsibilities

- **Supabase Auth (`auth.users`)**
  - Owns authentication credentials (email/password).
  - Source of truth for account identity.

- **Public schema tables (`public.*`)**
  - Stores profile, listings, favorites, chat, and audit domain data.
  - Uses `auth.users.id` as foreign key anchor.

- **Supabase Storage (`listing-photos` bucket)**
  - Stores image files.
  - `public.listing_photos` stores metadata and path references.

- **Application API layer (Edge Functions or direct client + RLS)**
  - Reads/writes domain data.
  - Enforces business workflows where needed.

### 1.2 Data flow (simplified)

1. User signs up/signs in via Supabase Auth.
2. A `profiles` row exists per authenticated user.
3. Seller creates listing -> row in `listings` + one/many rows in `listing_photos`.
4. Buyer favorites listing -> row in `favorites`.
5. Buyer starts chat for a listing -> row in `chats`, messages in `chat_messages`.
6. Listing create/update/delete emits entries to `listing_audit_log` via trigger.

### 1.3 “Meus anúncios”

No dedicated `my_listings` table is required.

```sql
select *
from public.listings
where seller_id = auth.uid()
order by created_at desc;
```

Ownership is already modeled by `listings.seller_id`.

---

## 2) Tables (detailed)

## 2.1 `public.profiles`

Purpose: user business profile and app preferences.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | PK, FK -> `auth.users(id)` on delete cascade |
| `name` | `text` | not null |
| `email` | `text` | optional mirror of auth email |
| `phone_number` | `text` | nullable |
| `phone_country` | `text` | default `'+351'` |
| `region` | `text` | nullable |
| `mode` | `text` | check in (`COMPRAR`,`VENDER`,`AMBOS`) |
| `draft_message` | `text` | default app template |
| `contact_visibility_enabled` | `boolean` | default `true` |
| `contact_visibility_mode` | `text` | check in (`ALWAYS`,`SCHEDULE`) |
| `contact_visibility_start` | `time` | default `'09:00'` |
| `contact_visibility_end` | `time` | default `'19:00'` |
| `is_first_login` | `boolean` | default `true` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

Indexes:
- PK index on `id`.
- Optional btree on `mode`, `region` if used in filters.

---

## 2.2 `public.listings`

Purpose: core livestock listing entity.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `seller_id` | `uuid` | FK -> `profiles(id)` not null |
| `species` | `text` | check in (`Vacas`,`Ovelhas`,`Cabras`) |
| `life_stage` | `text` | check in (`NEWBORN`,`YOUNG`,`ADULT`,`SLAUGHTER`) |
| `breed` | `text` | nullable |
| `male_qty` | `integer` | default `0` check >= 0 |
| `female_qty` | `integer` | default `0` check >= 0 |
| `male_price` | `numeric(12,2)` | nullable check >= 0 |
| `female_price` | `numeric(12,2)` | nullable check >= 0 |
| `male_avg_weight` | `numeric(8,2)` | nullable check >= 0 |
| `female_avg_weight` | `numeric(8,2)` | nullable check >= 0 |
| `price_mode` | `text` | check in (`FIXED`,`CONSULT`) |
| `description` | `text` | not null |
| `status` | `text` | check in (`Ativo`,`Pausado`,`Vendido`) |
| `municipality` | `text` | not null |
| `freguesia` | `text` | not null |
| `address` | `text` | nullable |
| `lat` | `double precision` | not null |
| `lng` | `double precision` | not null |
| `show_exact_location` | `boolean` | default `false` |
| `contact_name` | `text` | not null |
| `contact_phone` | `text` | not null |
| `contact_whatsapp` | `boolean` | default `false` |
| `views_count` | `integer` | default `0` |
| `contacts_count` | `integer` | default `0` |
| `saves_count` | `integer` | default `0` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

Indexes:
- `idx_listings_seller_created` on (`seller_id`, `created_at desc`) for “Meus anúncios”.
- `idx_listings_status_created` on (`status`, `created_at desc`).
- `idx_listings_species` on (`species`).
- If geospatial queries are needed later, migrate to PostGIS (`geography(Point,4326)`).

---

## 2.3 `public.listing_photos`

Purpose: ordered photo metadata per listing.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `listing_id` | `uuid` | FK -> `listings(id)` on delete cascade |
| `storage_path` | `text` | not null (e.g. `seller/listing/file.jpg`) |
| `sort_order` | `integer` | default `0` |
| `created_at` | `timestamptz` | default `now()` |

Constraints/indexes:
- Unique (`listing_id`, `sort_order`) to keep deterministic order.
- Index on (`listing_id`).

Storage convention:
- Bucket: `listing-photos`
- Path: `<seller_id>/<listing_id>/<uuid>.jpg`

---

## 2.4 `public.favorites`

Purpose: many-to-many between users and saved listings.

| Column | Type | Constraints / Notes |
|---|---|---|
| `user_id` | `uuid` | FK -> `profiles(id)` on delete cascade |
| `listing_id` | `uuid` | FK -> `listings(id)` on delete cascade |
| `created_at` | `timestamptz` | default `now()` |

Constraints/indexes:
- PK (`user_id`, `listing_id`) to prevent duplicates.
- Index on (`listing_id`) for “who saved this listing” counts/admin.

---

## 2.5 `public.chats`

Purpose: conversation channel for a buyer/seller pair in a listing.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `listing_id` | `uuid` | FK -> `listings(id)` on delete cascade |
| `seller_id` | `uuid` | FK -> `profiles(id)` |
| `buyer_id` | `uuid` | FK -> `profiles(id)` |
| `last_update` | `timestamptz` | updated on every new message |
| `created_at` | `timestamptz` | default `now()` |

Constraints/indexes:
- Unique (`listing_id`, `seller_id`, `buyer_id`) avoids duplicate threads.
- Check `seller_id <> buyer_id`.
- Index (`seller_id`, `last_update desc`) and (`buyer_id`, `last_update desc`).

---

## 2.6 `public.chat_messages`

Purpose: chat message stream.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `chat_id` | `uuid` | FK -> `chats(id)` on delete cascade |
| `sender_id` | `uuid` | FK -> `profiles(id)` |
| `text` | `text` | not null |
| `created_at` | `timestamptz` | default `now()` |
| `read_at` | `timestamptz` | nullable |

Indexes:
- (`chat_id`, `created_at`) for timeline retrieval.
- (`sender_id`, `created_at`) optional for moderation/admin tooling.

---

## 2.7 `public.listing_audit_log`

Purpose: immutable audit/history for listing lifecycle.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `listing_id` | `uuid` | nullable FK (nullable so delete history remains) |
| `changed_by` | `uuid` | nullable FK -> `profiles(id)` |
| `action` | `text` | check in (`INSERT`,`UPDATE`,`DELETE`) |
| `before_data` | `jsonb` | nullable |
| `after_data` | `jsonb` | nullable |
| `changed_at` | `timestamptz` | default `now()` |

Implementation notes:
- Trigger on `listings` writes one audit row per mutation.
- For `DELETE`, keep `before_data`, null `after_data`.
- Optional partitioning if this table grows significantly.

---

## 3) Relationship map

- `auth.users (1) -> (1) profiles`
- `profiles (1) -> (N) listings`
- `listings (1) -> (N) listing_photos`
- `profiles (N) <-> (N) listings` via `favorites`
- `listings (1) -> (N) chats`
- `chats (1) -> (N) chat_messages`
- `listings (1) -> (N) listing_audit_log`

---

## 4) Security model (RLS baseline)

Recommended baseline policies:

- `profiles`
  - user can `select/update` own row (`id = auth.uid()`).

- `listings`
  - anyone can `select` active/public listings (or authenticated users only, your choice).
  - owner can `insert/update/delete` where `seller_id = auth.uid()`.

- `listing_photos`
  - readable alongside listing visibility.
  - writable only by listing owner.

- `favorites`
  - user can manage only own rows (`user_id = auth.uid()`).

- `chats`
  - only participants (`seller_id = auth.uid() OR buyer_id = auth.uid()`) can read/write.

- `chat_messages`
  - only chat participants can read; sender/participants can insert according to business rules.

- `listing_audit_log`
  - read restricted (e.g., owner/admin); no direct writes from client.

---

## 5) App components -> table mapping

- Account and profile screens -> `profiles`
- Publish/Edit listing wizard -> `listings` + `listing_photos`
- Feed/search/map/listing details -> `listings` (+ `listing_photos`)
- Favorites screen -> `favorites` join `listings`
- Chat history/chat thread -> `chats` + `chat_messages`
- Admin/history views -> `listing_audit_log`

---

## 6) Why this model is enough (including “Meus anúncios”)

- “Meus anúncios” comes from `listings.seller_id` + index.
- No separate `my_listings` table is needed.
- This avoids duplicated ownership data and keeps writes simple/consistent.

