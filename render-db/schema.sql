create extension if not exists pgcrypto;

create schema if not exists siksha_yatra;

create table if not exists siksha_yatra.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  name text,
  first_name text,
  surname text,
  phone_number text,
  classes text[] not null default '{}',
  subjects text[] not null default '{}',
  is_blocked boolean not null default false,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create unique index if not exists siksha_yatra_users_email_lower_idx
  on siksha_yatra.users (lower(email));
