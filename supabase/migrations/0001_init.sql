-- Gastos Pareja: esquema inicial
-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push`).

create extension if not exists "pgcrypto";

-- ── Tipos ────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_type where typname = 'persona_enum') then
    create type persona_enum as enum ('Lolo', 'Jaz');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'categoria_enum') then
    create type categoria_enum as enum (
      'Vivienda',
      'Supermercado',
      'Comida afuera',
      'Transporte',
      'Servicios',
      'Salud',
      'Ocio',
      'Ropa',
      'Educación',
      'Mascotas',
      'Regalos',
      'Otros'
    );
  end if;
end $$;

-- ── Tabla: movimientos ──────────────────────────────────────────────────

create table if not exists public.movimientos (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null default current_date,
  descripcion text not null,
  categoria   categoria_enum not null,
  monto       numeric(12, 2) not null check (monto > 0),
  pagado_por  persona_enum not null,
  compartido  boolean not null default true,
  notas       text,
  creado_en   timestamptz not null default now()
);

create index if not exists movimientos_fecha_idx on public.movimientos (fecha desc);
create index if not exists movimientos_categoria_idx on public.movimientos (categoria);
create index if not exists movimientos_pagado_por_idx on public.movimientos (pagado_por);

-- ── Tabla: ingresos ─────────────────────────────────────────────────────

create table if not exists public.ingresos (
  id            uuid primary key default gen_random_uuid(),
  mes           text not null unique, -- formato 'AAAA-MM'
  ingreso_lolo  numeric(12, 2) not null default 0,
  ingreso_jaz   numeric(12, 2) not null default 0,
  constraint mes_formato check (mes ~ '^\d{4}-\d{2}$')
);

-- ── Row Level Security ──────────────────────────────────────────────────
-- Esta app no usa el sistema de autenticación de Supabase: es de uso
-- privado entre dos personas y el acceso se controla con la clave "anon"
-- (que solo vos y tu pareja conocen, vía las variables de entorno) más un
-- selector de usuario/PIN dentro de la propia app. Por eso las políticas
-- de abajo permiten leer y escribir a cualquiera que tenga esa clave.
-- No expongas la URL/clave del proyecto públicamente.

alter table public.movimientos enable row level security;
alter table public.ingresos enable row level security;

drop policy if exists "movimientos_select" on public.movimientos;
create policy "movimientos_select" on public.movimientos
  for select using (true);

drop policy if exists "movimientos_insert" on public.movimientos;
create policy "movimientos_insert" on public.movimientos
  for insert with check (true);

drop policy if exists "movimientos_update" on public.movimientos;
create policy "movimientos_update" on public.movimientos
  for update using (true) with check (true);

drop policy if exists "movimientos_delete" on public.movimientos;
create policy "movimientos_delete" on public.movimientos
  for delete using (true);

drop policy if exists "ingresos_select" on public.ingresos;
create policy "ingresos_select" on public.ingresos
  for select using (true);

drop policy if exists "ingresos_insert" on public.ingresos;
create policy "ingresos_insert" on public.ingresos
  for insert with check (true);

drop policy if exists "ingresos_update" on public.ingresos;
create policy "ingresos_update" on public.ingresos
  for update using (true) with check (true);

-- ── Realtime ────────────────────────────────────────────────────────────
-- Habilita que los cambios en estas tablas se transmitan por Supabase
-- Realtime para que ambos celulares se actualicen solos.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'movimientos'
  ) then
    alter publication supabase_realtime add table public.movimientos;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'ingresos'
  ) then
    alter publication supabase_realtime add table public.ingresos;
  end if;
end $$;
