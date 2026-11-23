-- Writing: run once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- Safe to re-run. Readers are anonymous; only emails in public.authors can write.

create table if not exists public.authors (
  email text primary key check (email = lower(email))
);

create table if not exists public.pieces (
  slug       text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  title      text check (title is null or length(title) between 1 and 200),
  date       date not null default current_date,
  listed     boolean not null default true,
  body       text not null check (length(btrim(body)) between 1 and 200000),
  updated_at timestamptz not null default now()
);

create or replace function public.is_author() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.authors a where a.email = lower(auth.jwt() ->> 'email')
  ) and coalesce((auth.jwt() ->> 'email_verified')::boolean, true)
$$;

create or replace function public.touch_piece() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists pieces_touch on public.pieces;
create trigger pieces_touch before update on public.pieces
  for each row execute function public.touch_piece();

alter table public.authors enable row level security;
alter table public.pieces  enable row level security;
-- No policies on authors: nobody reads or edits it through the API. Manage it here, in SQL.

drop policy if exists "read listed" on public.pieces;
create policy "read listed" on public.pieces for select
  using (listed or public.is_author());
drop policy if exists "authors write" on public.pieces;
create policy "authors write" on public.pieces for all to authenticated
  using (public.is_author()) with check (public.is_author());

-- Unlisted pieces open by their exact link only: one row by slug, never a list.
create or replace function public.get_piece(p_slug text)
returns setof public.pieces language sql stable security definer set search_path = '' as $$
  select * from public.pieces where slug = p_slug limit 1
$$;

revoke all on public.authors from anon, authenticated;
revoke all on public.pieces from anon, authenticated;
grant select on public.pieces to anon, authenticated;
grant insert, update, delete on public.pieces to authenticated;
revoke all on function public.get_piece(text) from public;
grant execute on function public.get_piece(text) to anon, authenticated;
revoke all on function public.is_author() from public;
grant execute on function public.is_author() to anon, authenticated;

-- Who may write. Replace with your sign-in email (lowercase):
-- insert into public.authors (email) values ('you@example.com') on conflict do nothing;
