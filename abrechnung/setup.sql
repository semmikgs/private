-- MTV Übungsleiter-Abrechnung (Vereinsversion): Zugang per Code, ohne E-Mail
-- Einmal im Supabase-Projekt "Handball" unter "SQL Editor" ausführen.
-- VORHER unten bei "ADMIN" deine Login-Mail (die vom Trainer-Cockpit) eintragen.

create extension if not exists pgcrypto with schema extensions;

-- Übungsleiter: nur der Hash des Codes wird gespeichert, nie der Code selbst
create table if not exists public.ul_users (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code_hash  text not null unique,
  data       jsonb,
  updated_at timestamptz,
  last_seen  timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.ul_admins (user_id uuid primary key references auth.users(id) on delete cascade);

-- Kein direkter Zugriff – alles läuft über die Funktionen unten
alter table public.ul_users  enable row level security;
alter table public.ul_admins enable row level security;
revoke all on public.ul_users, public.ul_admins from anon, authenticated;

-- ADMIN: hier deine Login-Mail eintragen
insert into public.ul_admins(user_id)
select id from auth.users where email = 'DEINE-LOGIN-MAIL@beispiel.de'
on conflict do nothing;

-- ---------- Hilfsfunktionen ----------
create or replace function public.ul_hash(p_code text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(digest(upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g')), 'sha256'), 'hex')
$$;

create or replace function public.ul_new_code() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea := gen_random_bytes(8); s text := ''; i int;
begin
  for i in 0..7 loop s := s || substr(a, (get_byte(b, i) % 32) + 1, 1); end loop;
  return 'MTV-' || substr(s,1,4) || '-' || substr(s,5,4);
end $$;

create or replace function public.ul_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from ul_admins where user_id = auth.uid())
$$;

-- ---------- Für Übungsleiter (mit Code) ----------
create or replace function public.ul_get(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r ul_users;
begin
  update ul_users set last_seen = now() where code_hash = ul_hash(p_code) returning * into r;
  if r.id is null then raise exception 'Code ungültig'; end if;
  return jsonb_build_object('name', r.name, 'data', r.data, 'updated_at', r.updated_at);
end $$;

create or replace function public.ul_save(p_code text, p_data jsonb) returns timestamptz
language plpgsql security definer set search_path = public, extensions as $$
declare t timestamptz := now(); n int;
begin
  update ul_users set data = p_data, updated_at = t, last_seen = t where code_hash = ul_hash(p_code);
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Code ungültig'; end if;
  return t;
end $$;

-- ---------- Für dich (Admin, mit normalem Login) ----------
create or replace function public.ul_admin_list()
returns table(id uuid, name text, created_at timestamptz, updated_at timestamptz, last_seen timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not ul_is_admin() then raise exception 'kein Admin'; end if;
  return query select u.id, u.name, u.created_at, u.updated_at, u.last_seen from ul_users u order by u.name;
end $$;

create or replace function public.ul_admin_create(p_name text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare c text := ul_new_code();
begin
  if not ul_is_admin() then raise exception 'kein Admin'; end if;
  insert into ul_users(name, code_hash) values (trim(p_name), ul_hash(c));
  return c;
end $$;

create or replace function public.ul_admin_newcode(p_id uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare c text := ul_new_code();
begin
  if not ul_is_admin() then raise exception 'kein Admin'; end if;
  update ul_users set code_hash = ul_hash(c) where id = p_id;
  return c;
end $$;

create or replace function public.ul_admin_rename(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not ul_is_admin() then raise exception 'kein Admin'; end if;
  update ul_users set name = trim(p_name) where id = p_id;
end $$;

create or replace function public.ul_admin_delete(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not ul_is_admin() then raise exception 'kein Admin'; end if;
  delete from ul_users where id = p_id;
end $$;

-- Daten setzen (für die Übernahme deiner Cockpit-Abrechnung)
create or replace function public.ul_admin_setdata(p_id uuid, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not ul_is_admin() then raise exception 'kein Admin'; end if;
  update ul_users set data = p_data, updated_at = now() where id = p_id;
end $$;

revoke all on function public.ul_hash(text), public.ul_new_code(), public.ul_is_admin() from public, anon, authenticated;
revoke all on function public.ul_get(text), public.ul_save(text, jsonb),
  public.ul_admin_list(), public.ul_admin_create(text), public.ul_admin_newcode(uuid),
  public.ul_admin_rename(uuid, text), public.ul_admin_delete(uuid), public.ul_admin_setdata(uuid, jsonb) from public;
grant execute on function public.ul_get(text), public.ul_save(text, jsonb) to anon, authenticated;
grant execute on function public.ul_admin_list(), public.ul_admin_create(text), public.ul_admin_newcode(uuid),
  public.ul_admin_rename(uuid, text), public.ul_admin_delete(uuid), public.ul_admin_setdata(uuid, jsonb) to authenticated;

-- Kontrolle: muss eine Zeile mit deiner Mail zeigen
select u.email as admin from public.ul_admins a join auth.users u on u.id = a.user_id;
