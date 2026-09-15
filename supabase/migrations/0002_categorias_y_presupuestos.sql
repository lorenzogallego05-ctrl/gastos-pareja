-- Gastos Pareja: categorías dinámicas + presupuestos por categoría
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de 0001_init.sql.

-- ── Tabla: categorias ───────────────────────────────────────────────────
-- Reemplaza el enum fijo de categorías por una tabla editable: Lolo y Jaz
-- pueden agregar categorías nuevas desde la app.

create table if not exists public.categorias (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null unique,
  icono     text not null default '📦',
  orden     integer not null default 0,
  creado_en timestamptz not null default now()
);

insert into public.categorias (nombre, icono, orden) values
  ('Vivienda', '🏠', 1),
  ('Supermercado', '🛒', 2),
  ('Comida afuera', '🍽️', 3),
  ('Transporte', '🚗', 4),
  ('Servicios', '💡', 5),
  ('Salud', '🩺', 6),
  ('Ocio', '🎉', 7),
  ('Ropa', '👕', 8),
  ('Educación', '📚', 9),
  ('Mascotas', '🐾', 10),
  ('Regalos', '🎁', 11),
  ('Otros', '📦', 12)
on conflict (nombre) do nothing;

-- ── movimientos.categoria: de enum fijo a texto libre ──────────────────

alter table public.movimientos
  add column if not exists categoria_texto text;

update public.movimientos
  set categoria_texto = categoria::text
  where categoria_texto is null;

alter table public.movimientos
  alter column categoria_texto set not null;

alter table public.movimientos drop column if exists categoria;
alter table public.movimientos rename column categoria_texto to categoria;

alter table public.movimientos
  add constraint movimientos_categoria_fkey
  foreign key (categoria) references public.categorias (nombre)
  on update cascade;

create index if not exists movimientos_categoria_idx on public.movimientos (categoria);

drop type if exists categoria_enum;

-- ── Tabla: presupuestos ─────────────────────────────────────────────────
-- Límite mensual opcional por categoría (AAAA-MM).

create table if not exists public.presupuestos (
  id        uuid primary key default gen_random_uuid(),
  mes       text not null,
  categoria text not null references public.categorias (nombre) on update cascade on delete cascade,
  monto     numeric(12, 2) not null check (monto >= 0),
  constraint mes_formato_presupuesto check (mes ~ '^\d{4}-\d{2}$'),
  constraint presupuestos_mes_categoria_key unique (mes, categoria)
);

-- ── Row Level Security (misma política que el resto: app privada) ──────

alter table public.categorias enable row level security;
alter table public.presupuestos enable row level security;

drop policy if exists "categorias_select" on public.categorias;
create policy "categorias_select" on public.categorias for select using (true);

drop policy if exists "categorias_insert" on public.categorias;
create policy "categorias_insert" on public.categorias for insert with check (true);

drop policy if exists "presupuestos_select" on public.presupuestos;
create policy "presupuestos_select" on public.presupuestos for select using (true);

drop policy if exists "presupuestos_insert" on public.presupuestos;
create policy "presupuestos_insert" on public.presupuestos for insert with check (true);

drop policy if exists "presupuestos_update" on public.presupuestos;
create policy "presupuestos_update" on public.presupuestos for update using (true) with check (true);

drop policy if exists "presupuestos_delete" on public.presupuestos;
create policy "presupuestos_delete" on public.presupuestos for delete using (true);

-- ── Realtime ────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'categorias'
  ) then
    alter publication supabase_realtime add table public.categorias;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'presupuestos'
  ) then
    alter publication supabase_realtime add table public.presupuestos;
  end if;
end $$;
