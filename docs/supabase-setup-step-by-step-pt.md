# Guia passo a passo (iniciante) — configurar a base de dados no Supabase para o AgroLink

Este guia é para quem **não programa**. Vamos fazer em modo “receita”: clicar, copiar, colar e confirmar.

---

## Objetivo

No final, vais ter no Supabase:

1. Login de utilizadores (Auth)
2. Tabela de perfis (`profiles`)
3. Tabela de anúncios (`listings`)
4. Tabela de fotos de anúncios (`listing_photos`)
5. Tabela de favoritos (`favorites`)
6. Tabela de conversas (`chats`)
7. Tabela de mensagens (`chat_messages`)
8. Tabela de histórico de alterações (`listing_audit_log`)
9. Bucket de imagens (`listing-photos`)

---

## Antes de começar (5 minutos)

1. Entra em https://supabase.com e abre o teu projeto.
2. No menu esquerdo, confirma que vês:
   - **Authentication**
   - **SQL Editor**
   - **Table Editor**
   - **Storage**
3. Cria um bloco de notas no teu computador para guardar links/chaves.

---

## Passo 1 — ativar login por email/password

1. Vai a **Authentication > Providers**.
2. Em **Email**, garante que está **Enabled**.
3. Guarda.

> Nota: password **não** vai para a tua tabela manualmente. O Supabase guarda isso em `auth.users` automaticamente.

---

## Passo 2 — abrir o SQL Editor

1. Vai a **SQL Editor**.
2. Clica **New query**.
3. Apaga qualquer texto e cola o SQL do próximo passo.

---

## Passo 3 — criar tabelas (copiar e colar)

> Cola tudo abaixo num único query e clica **Run**.

```sql
-- extensões úteis
create extension if not exists pgcrypto;

-- =====================================================
-- 1) profiles
-- =====================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone_number text,
  phone_country text default '+351',
  region text,
  mode text not null default 'AMBOS' check (mode in ('COMPRAR','VENDER','AMBOS')),
  draft_message text default 'Boa tarde, vi o seu anúncio no AgroLink e estou interessado. Ainda está disponível?',
  contact_visibility_enabled boolean not null default true,
  contact_visibility_mode text not null default 'ALWAYS' check (contact_visibility_mode in ('ALWAYS','SCHEDULE')),
  contact_visibility_start time not null default '09:00',
  contact_visibility_end time not null default '19:00',
  is_first_login boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- 2) listings
-- =====================================================
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  species text not null check (species in ('Vacas','Ovelhas','Cabras')),
  life_stage text not null check (life_stage in ('NEWBORN','YOUNG','ADULT','SLAUGHTER')),
  breed text,
  male_qty integer not null default 0 check (male_qty >= 0),
  female_qty integer not null default 0 check (female_qty >= 0),
  male_price numeric(12,2) check (male_price is null or male_price >= 0),
  female_price numeric(12,2) check (female_price is null or female_price >= 0),
  male_avg_weight numeric(8,2) check (male_avg_weight is null or male_avg_weight >= 0),
  female_avg_weight numeric(8,2) check (female_avg_weight is null or female_avg_weight >= 0),
  price_mode text not null default 'FIXED' check (price_mode in ('FIXED','CONSULT')),
  description text not null,
  status text not null default 'Ativo' check (status in ('Ativo','Pausado','Vendido')),
  municipality text not null,
  freguesia text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  show_exact_location boolean not null default false,
  contact_name text not null,
  contact_phone text not null,
  contact_whatsapp boolean not null default false,
  views_count integer not null default 0,
  contacts_count integer not null default 0,
  saves_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_listings_seller_created on public.listings(seller_id, created_at desc);
create index if not exists idx_listings_status_created on public.listings(status, created_at desc);
create index if not exists idx_listings_species on public.listings(species);

-- =====================================================
-- 3) listing_photos
-- =====================================================
create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (listing_id, sort_order)
);

create index if not exists idx_listing_photos_listing_id on public.listing_photos(listing_id);

-- =====================================================
-- 4) favorites
-- =====================================================
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists idx_favorites_listing_id on public.favorites(listing_id);

-- =====================================================
-- 5) chats
-- =====================================================
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  last_update timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint chats_unique_thread unique (listing_id, seller_id, buyer_id),
  constraint chats_different_users check (seller_id <> buyer_id)
);

create index if not exists idx_chats_seller_last_update on public.chats(seller_id, last_update desc);
create index if not exists idx_chats_buyer_last_update on public.chats(buyer_id, last_update desc);

-- =====================================================
-- 6) chat_messages
-- =====================================================
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_chat_messages_chat_created on public.chat_messages(chat_id, created_at);

-- =====================================================
-- 7) listing_audit_log
-- =====================================================
create table if not exists public.listing_audit_log (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid,
  changed_by uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  before_data jsonb,
  after_data jsonb,
  changed_at timestamptz not null default now()
);

create index if not exists idx_listing_audit_log_listing_changed_at on public.listing_audit_log(listing_id, changed_at desc);

-- =====================================================
-- utilitário: updated_at automático
-- =====================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_listings_updated_at on public.listings;
create trigger trg_listings_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

-- =====================================================
-- auditoria automática em listings
-- =====================================================
create or replace function public.audit_listings_changes()
returns trigger
language plpgsql
security definer
as $$
declare
  actor uuid;
begin
  actor := auth.uid();

  if tg_op = 'INSERT' then
    insert into public.listing_audit_log(listing_id, changed_by, action, before_data, after_data)
    values (new.id, actor, 'INSERT', null, to_jsonb(new));
    return new;

  elsif tg_op = 'UPDATE' then
    insert into public.listing_audit_log(listing_id, changed_by, action, before_data, after_data)
    values (new.id, actor, 'UPDATE', to_jsonb(old), to_jsonb(new));
    return new;

  elsif tg_op = 'DELETE' then
    insert into public.listing_audit_log(listing_id, changed_by, action, before_data, after_data)
    values (old.id, actor, 'DELETE', to_jsonb(old), null);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_audit_listings_changes on public.listings;
create trigger trg_audit_listings_changes
after insert or update or delete on public.listings
for each row execute function public.audit_listings_changes();
```

Se aparecer “Success. No rows returned”, está certo ✅

---

## Passo 4 — criar perfil automático quando um user é criado

No **SQL Editor**, corre este SQL:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
```

---

## Passo 5 — ativar RLS (segurança)

No **SQL Editor**, corre:

```sql
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.favorites enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.listing_audit_log enable row level security;
```

---

## Passo 6 — criar policies mínimas

No **SQL Editor**, corre:

```sql
-- PROFILES
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- LISTINGS
drop policy if exists "listings_select_all" on public.listings;
create policy "listings_select_all"
on public.listings for select
using (true);

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own"
on public.listings for insert
to authenticated
with check (seller_id = auth.uid());

drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_own"
on public.listings for update
to authenticated
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

drop policy if exists "listings_delete_own" on public.listings;
create policy "listings_delete_own"
on public.listings for delete
to authenticated
using (seller_id = auth.uid());

-- LISTING PHOTOS
drop policy if exists "listing_photos_select_all" on public.listing_photos;
create policy "listing_photos_select_all"
on public.listing_photos for select
using (true);

drop policy if exists "listing_photos_insert_owner" on public.listing_photos;
create policy "listing_photos_insert_owner"
on public.listing_photos for insert
to authenticated
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.seller_id = auth.uid()
  )
);

drop policy if exists "listing_photos_delete_owner" on public.listing_photos;
create policy "listing_photos_delete_owner"
on public.listing_photos for delete
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.seller_id = auth.uid()
  )
);

-- FAVORITES
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
on public.favorites for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
on public.favorites for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
on public.favorites for delete
to authenticated
using (user_id = auth.uid());

-- CHATS
drop policy if exists "chats_select_participant" on public.chats;
create policy "chats_select_participant"
on public.chats for select
to authenticated
using (seller_id = auth.uid() or buyer_id = auth.uid());

drop policy if exists "chats_insert_participant" on public.chats;
create policy "chats_insert_participant"
on public.chats for insert
to authenticated
with check (seller_id = auth.uid() or buyer_id = auth.uid());

drop policy if exists "chats_delete_participant" on public.chats;
create policy "chats_delete_participant"
on public.chats for delete
to authenticated
using (seller_id = auth.uid() or buyer_id = auth.uid());

-- CHAT MESSAGES
drop policy if exists "chat_messages_select_participant" on public.chat_messages;
create policy "chat_messages_select_participant"
on public.chat_messages for select
to authenticated
using (
  exists (
    select 1
    from public.chats c
    where c.id = chat_id
      and (c.seller_id = auth.uid() or c.buyer_id = auth.uid())
  )
);

drop policy if exists "chat_messages_insert_participant" on public.chat_messages;
create policy "chat_messages_insert_participant"
on public.chat_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.chats c
    where c.id = chat_id
      and (c.seller_id = auth.uid() or c.buyer_id = auth.uid())
  )
);

-- AUDIT LOG (somente leitura para dono do anúncio)
drop policy if exists "audit_select_listing_owner" on public.listing_audit_log;
create policy "audit_select_listing_owner"
on public.listing_audit_log for select
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.seller_id = auth.uid()
  )
);
```

---

## Passo 7 — criar bucket de fotos

1. Vai a **Storage**.
2. Clica **New bucket**.
3. Nome: `listing-photos`
4. Deixa **Private** (recomendado).
5. Cria.

> Depois, a app gera URL assinada quando precisar mostrar imagem.

---

## Passo 8 — teste rápido (sem programar)

### 8.1 Criar um utilizador

1. Vai a **Authentication > Users**.
2. Clica **Add user**.
3. Preenche email e password.
4. Guarda.

### 8.2 Verificar perfil automático

1. Vai a **Table Editor > profiles**.
2. Confirma que apareceu 1 linha com o mesmo `id` do user.

### 8.3 Criar anúncio manual

1. Vai a **Table Editor > listings**.
2. Clica **Insert row**.
3. Preenche campos obrigatórios (principalmente `seller_id`, `species`, `life_stage`, `description`, `municipality`, `freguesia`, `lat`, `lng`, `contact_name`, `contact_phone`).
4. Guarda.

### 8.4 Verificar “Meus anúncios”

No SQL Editor, executa:

```sql
select id, seller_id, species, status, created_at
from public.listings
order by created_at desc;
```

Se precisares filtrar por um utilizador específico:

```sql
select *
from public.listings
where seller_id = '<UUID_DO_USER>';
```

### 8.5 Erros comuns ao inserir anúncio (muito importante)

Se aparecer erro de **check constraint** (como `listings_life_stage_check`), significa que o texto colocado não está exatamente no formato esperado pela tabela.

#### Valores válidos (têm de ser exatamente estes)

- `species`: `Vacas`, `Ovelhas`, `Cabras`
- `life_stage`: `NEWBORN`, `YOUNG`, `ADULT`, `SLAUGHTER`
- `price_mode`: `FIXED` ou `CONSULT`
- `status`: `Ativo`, `Pausado`, `Vendido`

> Exemplos que **dão erro**:
> - `Cow` (deve ser `Vacas`)
> - `Adulto` (deve ser `ADULT`)
> - `1000` no `price_mode` (deve ser `FIXED` ou `CONSULT`; o preço vai em `male_price`/`female_price`)

#### Exemplo rápido (SQL pronto a colar)

```sql
insert into public.listings (
  seller_id, species, life_stage, male_qty, female_qty,
  male_price, female_price, price_mode,
  description, status, municipality, freguesia,
  lat, lng, contact_name, contact_phone, contact_whatsapp
) values (
  'f61a7cd5-d7f6-4b34-be1c-9ec088aaed66',
  'Vacas',
  'ADULT',
  0,
  1,
  null,
  1000,
  'FIXED',
  'Vaca muito fixe',
  'Ativo',
  'Portalegre',
  'Portalegre',
  39.69476052188982,
  -7.500587858555922,
  'Alvaro',
  '+351914226597',
  true
);
```

Se este insert funcionar, a estrutura está correta e o problema era apenas o formato dos valores.

---

## Passo 9 — como apagar de vez (hard delete)

Como decidiste “apagar de uma vez”, quando apagares um anúncio em `listings`:

- fotos associadas em `listing_photos` apagam também (`on delete cascade`),
- chats associados apagam também,
- mensagens desses chats apagam também.

O histórico fica em `listing_audit_log` (registo do DELETE).

---

## Passo 10 — checklist final

Se todos os itens abaixo estiverem OK, estás pronto:

- [ ] Consegues criar users em Authentication
- [ ] Cada user cria linha em `profiles`
- [ ] Consegues inserir anúncio em `listings`
- [ ] Consegues inserir foto em `listing_photos`
- [ ] Consegues guardar favorito em `favorites`
- [ ] Consegues criar chat/mensagem em `chats` e `chat_messages`
- [ ] Apagar anúncio remove dependências
- [ ] `listing_audit_log` recebe eventos

---

## Se der erro

Copia o erro completo e guarda num bloco de notas com:

1. Em que passo aconteceu
2. Query SQL usada
3. Print do ecrã

Com isso, resolve-se rápido sem adivinhar.
