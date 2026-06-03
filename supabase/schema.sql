-- ───────────────────────────────────────────────────────────────
-- AbsensiMentor — Supabase schema (single-document, realtime)
-- Run once in: Supabase project → SQL Editor → New query → paste → Run.
--
-- The whole app state is kept as one JSON document and synced in realtime to
-- every device. Login is name + birth-date (no Supabase Auth), so the anon
-- key needs read/write access — RLS is enabled with permissive policies,
-- which is adequate for an internal tool. The app seeds the document on first
-- connect, so no seed rows are needed here.
-- ───────────────────────────────────────────────────────────────

create table if not exists app_state (
  id         text primary key default 'singleton',
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

-- permissive policies for the anon role (internal tool, no Supabase Auth)
drop policy if exists "anon read app_state"   on app_state;
drop policy if exists "anon insert app_state" on app_state;
drop policy if exists "anon update app_state" on app_state;
create policy "anon read app_state"   on app_state for select using (true);
create policy "anon insert app_state" on app_state for insert with check (true);
create policy "anon update app_state" on app_state for update using (true) with check (true);

-- enable realtime so changes broadcast to all connected devices
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table app_state;
  end if;
end $$;
