create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);
create unique index if not exists profiles_email_lower_idx on public.profiles (lower(email));
create table if not exists public.sheet_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','synced','failed')),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  synced_at timestamptz,
  last_error text
);
create index if not exists sheet_sync_jobs_status_idx on public.sheet_sync_jobs(status, created_at);
alter table public.profiles enable row level security;
alter table public.sheet_sync_jobs enable row level security;
create policy "Users can read their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can read their own jobs" on public.sheet_sync_jobs for select using (auth.uid() = user_id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), lower(new.email)) on conflict (id) do update set email = excluded.email, updated_at = now(), last_login_at = now(); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of last_sign_in_at on auth.users for each row execute procedure public.handle_new_user();
