alter table public.profiles
  add column if not exists first_name text,
  add column if not exists surname text,
  add column if not exists phone_number text,
  add column if not exists classes text[] not null default '{}',
  add column if not exists subjects text[] not null default '{}';

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_first_name text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  profile_surname text := nullif(trim(new.raw_user_meta_data->>'surname'), '');
  profile_classes text[] := case
    when jsonb_typeof(new.raw_user_meta_data->'classes') = 'array'
      then array(select jsonb_array_elements_text(new.raw_user_meta_data->'classes'))
    else '{}'::text[]
  end;
  profile_subjects text[] := case
    when jsonb_typeof(new.raw_user_meta_data->'subjects') = 'array'
      then array(select jsonb_array_elements_text(new.raw_user_meta_data->'subjects'))
    else '{}'::text[]
  end;
begin
  insert into public.profiles (
    id,
    name,
    email,
    first_name,
    surname,
    phone_number,
    classes,
    subjects
  )
  values (
    new.id,
    coalesce(
      nullif(trim(concat_ws(' ', profile_first_name, profile_surname)), ''),
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    lower(new.email),
    profile_first_name,
    profile_surname,
    nullif(trim(new.raw_user_meta_data->>'phone_number'), ''),
    profile_classes,
    profile_subjects
  )
  on conflict (id) do update set
    name = coalesce(excluded.name, profiles.name),
    email = excluded.email,
    first_name = coalesce(excluded.first_name, profiles.first_name),
    surname = coalesce(excluded.surname, profiles.surname),
    phone_number = coalesce(excluded.phone_number, profiles.phone_number),
    classes = case when cardinality(excluded.classes) > 0 then excluded.classes else profiles.classes end,
    subjects = case when cardinality(excluded.subjects) > 0 then excluded.subjects else profiles.subjects end,
    updated_at = now(),
    last_login_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of last_sign_in_at on auth.users
  for each row execute procedure public.handle_new_user();
