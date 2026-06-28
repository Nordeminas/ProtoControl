create table if not exists public.app_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

drop policy if exists "Allow public app data read" on public.app_data;
create policy "Allow public app data read" on public.app_data for select using (true);

drop policy if exists "Allow public app data write" on public.app_data;
create policy "Allow public app data write" on public.app_data for all using (true) with check (true);
