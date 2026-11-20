-- monifes — initial schema.
-- Three tables, all owned per-user. Row Level Security means every query is
-- automatically limited to the signed-in person's own rows, so even a bug in
-- the app can never show one person's spends to another.

-- ─── profiles: one row per person (settings + optional budget) ────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  currency text not null default 'JPY',
  difficulty text not null default 'recommended'
    check (difficulty in ('easy', 'recommended', 'hard')),
  -- { necessities, "guilt-free", investments, savings } or null (not set up yet)
  budget jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── spends: the log — amount, bucket, and the feeling behind it ──────────────
create table public.spends (
  -- Generated on the device, so a spend logged offline keeps its id when it syncs.
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  bucket text not null
    check (bucket in ('necessities', 'guilt-free', 'investments', 'savings')),
  feeling text not null
    check (feeling in ('worth-it', 'joy', 'meh', 'impulse', 'regret')),
  label text check (char_length(label) <= 40),
  created_at timestamptz not null default now()
);

create index spends_user_created_idx on public.spends (user_id, created_at desc);

-- ─── no_spend_days: dates deliberately marked as a no-spend win ───────────────
create table public.no_spend_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- ─── Keep profiles.updated_at honest ──────────────────────────────────────────
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─── Row Level Security: each person sees and changes only their own rows ─────
alter table public.profiles enable row level security;
alter table public.spends enable row level security;
alter table public.no_spend_days enable row level security;

create policy "Own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Own spends" on public.spends
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Own no-spend days" on public.no_spend_days
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Signed-in users only; anonymous visitors get no table access at all.
revoke all on public.profiles, public.spends, public.no_spend_days from anon;
grant select, insert, update, delete
  on public.profiles, public.spends, public.no_spend_days to authenticated;
