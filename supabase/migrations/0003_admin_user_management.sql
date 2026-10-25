alter table public.profiles
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_reason text;
