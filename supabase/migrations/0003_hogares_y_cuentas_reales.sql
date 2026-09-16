-- Gastos Pareja: hogares con cuentas reales (multi-usuario)
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de 0001 y 0002.
--
-- ⚠️ IMPORTANTE — LEER ANTES DE CORRER:
-- Esta migración cambia el modelo de un solo hogar fijo (Lolo/Jaz) a
-- múltiples hogares, cada uno con hasta 2 cuentas reales (email +
-- contraseña, usando Supabase Auth). Estos cambios NO son compatibles
-- con los datos que ya tengas cargados desde antes de este cambio:
--   - `movimientos.pagado_por` deja de ser texto libre y pasa a apuntar
--     a una persona real (`perfiles`).
--   - `ingresos` deja de tener las columnas fijas `ingreso_lolo` /
--     `ingreso_jaz` y pasa a ser una fila por persona por mes.
--   - Las categorías dejan de ser globales y pasan a pertenecer a un
--     hogar específico.
-- Si ya tenés gastos cargados en producción (vos y tu pareja), NO
-- corras esto todavía sobre ese proyecto: primero coordiná la migración
-- de esos datos (hay un paso aparte para eso). Esta migración está
-- pensada para un proyecto de Supabase nuevo/vacío, donde cada persona
-- que se registra arranca de cero con su propio hogar.

-- ── Tabla: hogares ──────────────────────────────────────────────────────

create table if not exists public.hogares (
  id         uuid primary key default gen_random_uuid(),
  nombre     text,
  codigo     text not null unique,
  capacidad  integer not null default 2,
  creado_en  timestamptz not null default now()
);

-- Genera un código de invitación corto y legible (ej. "K7QM-3XPZ").
create or replace function public.generar_codigo_hogar()
returns text
language plpgsql
as $$
declare
  alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sin 0/O/1/I para evitar confusión
  nuevo_codigo text;
  intento int := 0;
begin
  loop
    nuevo_codigo := (
      select string_agg(substr(alfabeto, (floor(random() * length(alfabeto)) + 1)::int, 1), '')
      from generate_series(1, 8)
    );
    nuevo_codigo := substr(nuevo_codigo, 1, 4) || '-' || substr(nuevo_codigo, 5, 4);
    exit when not exists (select 1 from public.hogares where codigo = nuevo_codigo);
    intento := intento + 1;
    if intento > 20 then
      raise exception 'No se pudo generar un código de hogar único';
    end if;
  end loop;
  return nuevo_codigo;
end;
$$;

-- ── Tabla: perfiles (una fila por cuenta real, ligada a auth.users) ─────

create table if not exists public.perfiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  hogar_id  uuid not null references public.hogares (id) on delete cascade,
  nombre    text not null,
  creado_en timestamptz not null default now()
);

create index if not exists perfiles_hogar_id_idx on public.perfiles (hogar_id);

-- No dejar sumar más gente de la que el hogar admite (por ahora, 2).
create or replace function public.chequear_capacidad_hogar()
returns trigger
language plpgsql
as $$
declare
  actuales int;
  cupo int;
begin
  select capacidad into cupo from public.hogares where id = new.hogar_id;
  select count(*) into actuales from public.perfiles where hogar_id = new.hogar_id;
  if actuales >= cupo then
    raise exception 'Este hogar ya alcanzó su capacidad máxima (%).', cupo;
  end if;
  return new;
end;
$$;

drop trigger if exists perfiles_chequear_capacidad on public.perfiles;
create trigger perfiles_chequear_capacidad
  before insert on public.perfiles
  for each row execute function public.chequear_capacidad_hogar();

-- Categorías por default para un hogar nuevo (se copian solas al crearse).
create or replace function public.sembrar_categorias_hogar()
returns trigger
language plpgsql
as $$
begin
  insert into public.categorias (hogar_id, nombre, icono, orden) values
    (new.id, 'Vivienda', '🏠', 1),
    (new.id, 'Supermercado', '🛒', 2),
    (new.id, 'Comida afuera', '🍽️', 3),
    (new.id, 'Transporte', '🚗', 4),
    (new.id, 'Servicios', '💡', 5),
    (new.id, 'Salud', '🩺', 6),
    (new.id, 'Ocio', '🎉', 7),
    (new.id, 'Ropa', '👕', 8),
    (new.id, 'Educación', '📚', 9),
    (new.id, 'Mascotas', '🐾', 10),
    (new.id, 'Regalos', '🎁', 11),
    (new.id, 'Otros', '📦', 12);
  return new;
end;
$$;

drop trigger if exists hogares_sembrar_categorias on public.hogares;
create trigger hogares_sembrar_categorias
  after insert on public.hogares
  for each row execute function public.sembrar_categorias_hogar();

-- Función que devuelve el hogar de quien está haciendo la consulta.
-- SECURITY DEFINER a propósito: si no, como esta función se usa DENTRO
-- de la política de "perfiles", y esta consulta lee de "perfiles", Postgres
-- volvería a evaluar esa misma política sobre sí misma (recursión
-- infinita). Al ser SECURITY DEFINER, esta consulta puntual no pasa por
-- RLS, así que no hay ciclo.
create or replace function public.hogar_id_actual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hogar_id from public.perfiles where id = auth.uid()
$$;

-- ── Crear / unirse a un hogar ────────────────────────────────────────────
-- Estas son las ÚNICAS dos formas de conseguir un perfil (no hay policy
-- de "insert" directa sobre hogares/perfiles): así, el código de
-- invitación de un hogar nunca queda expuesto por una consulta abierta
-- -- solo se valida server-side, dentro de esta función.

create or replace function public.crear_hogar(
  p_nombre text,
  p_capacidad int default 2,
  p_nombre_hogar text default null
)
returns table (hogar_id uuid, codigo text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hogar_id uuid;
  v_codigo text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if exists (select 1 from public.perfiles where id = auth.uid()) then
    raise exception 'Ya pertenecés a un hogar';
  end if;
  if p_nombre is null or length(trim(p_nombre)) = 0 then
    raise exception 'Falta el nombre';
  end if;
  if p_capacidad not in (1, 2) then
    raise exception 'Capacidad inválida';
  end if;

  v_codigo := public.generar_codigo_hogar();
  insert into public.hogares (nombre, codigo, capacidad)
    values (nullif(trim(p_nombre_hogar), ''), v_codigo, p_capacidad)
    returning id into v_hogar_id;
  insert into public.perfiles (id, hogar_id, nombre) values (auth.uid(), v_hogar_id, trim(p_nombre));

  return query select v_hogar_id, v_codigo;
end;
$$;

create or replace function public.unirse_a_hogar(p_codigo text, p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hogar_id uuid;
  v_capacidad int;
  v_actuales int;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if exists (select 1 from public.perfiles where id = auth.uid()) then
    raise exception 'Ya pertenecés a un hogar';
  end if;
  if p_nombre is null or length(trim(p_nombre)) = 0 then
    raise exception 'Falta el nombre';
  end if;

  select id, capacidad into v_hogar_id, v_capacidad
    from public.hogares where codigo = upper(trim(p_codigo));

  if v_hogar_id is null then
    raise exception 'Código de hogar inválido';
  end if;

  select count(*) into v_actuales from public.perfiles where hogar_id = v_hogar_id;
  if v_actuales >= v_capacidad then
    raise exception 'Ese hogar ya está completo';
  end if;

  insert into public.perfiles (id, hogar_id, nombre) values (auth.uid(), v_hogar_id, trim(p_nombre));

  return v_hogar_id;
end;
$$;

-- ── categorias / presupuestos / movimientos: agregar hogar_id ──────────
-- (columnas nuevas, admiten null por ahora; se restringen más abajo solo
-- si la tabla está vacía, para no romper datos ya cargados)

alter table public.categorias add column if not exists hogar_id uuid references public.hogares (id) on delete cascade;
alter table public.presupuestos add column if not exists hogar_id uuid references public.hogares (id) on delete cascade;
alter table public.movimientos add column if not exists hogar_id uuid references public.hogares (id) on delete cascade;

-- El unique(nombre) global de "categorias" (de la migración 0002) tiene
-- que pasar a ser por hogar SIEMPRE, sin importar si hay datos previos:
-- la migración 0002 ya deja cargadas 12 categorías globales, así que sin
-- este cambio, el trigger que siembra las 12 categorías del PRIMER hogar
-- que se cree ('Vivienda', 'Supermercado', ...) chocaría contra esos
-- nombres ya existentes y la creación de ese hogar fallaría. Esto obliga
-- a rehacer también las FK de movimientos/presupuestos hacia categorias,
-- que apuntaban solo a categorias(nombre): ahora son compuestas
-- (hogar_id, categoria) → categorias(hogar_id, nombre), así un gasto o
-- presupuesto solo puede usar una categoría de su propio hogar. Si hay
-- filas con hogar_id todavía nulo (datos de antes de esta migración), la
-- FK simplemente no las valida hasta que la migración de corte les
-- asigne hogar_id (una FK no chequea una fila si alguna de sus columnas
-- es NULL).

alter table public.movimientos drop constraint if exists movimientos_categoria_fkey;
alter table public.presupuestos drop constraint if exists presupuestos_categoria_fkey;
alter table public.categorias drop constraint if exists categorias_nombre_key;
alter table public.categorias drop constraint if exists categorias_hogar_nombre_key;
alter table public.categorias add constraint categorias_hogar_nombre_key unique (hogar_id, nombre);

alter table public.movimientos add constraint movimientos_categoria_fkey
  foreign key (hogar_id, categoria) references public.categorias (hogar_id, nombre) on update cascade;
alter table public.presupuestos add constraint presupuestos_categoria_fkey
  foreign key (hogar_id, categoria) references public.categorias (hogar_id, nombre) on update cascade on delete cascade;

do $$
begin
  if (select count(*) from public.categorias where hogar_id is null) = 0 then
    alter table public.categorias alter column hogar_id set not null;
  else
    raise notice 'categorias tiene filas sin hogar_id (de antes de esta migración): no se fuerza NOT NULL todavía. Ver migración de corte para hogares existentes.';
  end if;
end $$;

do $$
begin
  if (select count(*) from public.presupuestos) = 0 then
    alter table public.presupuestos alter column hogar_id set not null;
    alter table public.presupuestos drop constraint if exists presupuestos_mes_categoria_key;
    alter table public.presupuestos add constraint presupuestos_hogar_mes_categoria_key unique (hogar_id, mes, categoria);
  else
    raise notice 'presupuestos tiene filas existentes: no se fuerza hogar_id NOT NULL. Ver migración de corte para hogares existentes.';
  end if;
end $$;

-- movimientos.pagado_por: de texto libre a referencia a un perfil real.
do $$
begin
  if (select count(*) from public.movimientos) = 0 then
    alter table public.movimientos alter column hogar_id set not null;
    alter table public.movimientos drop column if exists pagado_por;
    alter table public.movimientos add column pagado_por uuid references public.perfiles (id);
    alter table public.movimientos alter column pagado_por set not null;
    create index if not exists movimientos_pagado_por_idx on public.movimientos (pagado_por);
    create index if not exists movimientos_hogar_id_idx on public.movimientos (hogar_id);
  else
    raise notice 'movimientos tiene filas existentes: no se modifica pagado_por/hogar_id. Ver migración de corte para hogares existentes.';
  end if;
end $$;

-- ── ingresos: de columnas fijas (ingreso_lolo/ingreso_jaz) a una fila
--    por persona por mes ─────────────────────────────────────────────────

do $$
begin
  if (select count(*) from public.ingresos) = 0 then
    drop table public.ingresos;
    create table public.ingresos (
      id        uuid primary key default gen_random_uuid(),
      hogar_id  uuid not null references public.hogares (id) on delete cascade,
      mes       text not null,
      perfil_id uuid not null references public.perfiles (id) on delete cascade,
      monto     numeric(12, 2) not null default 0,
      constraint mes_formato check (mes ~ '^\d{4}-\d{2}$'),
      constraint ingresos_hogar_mes_perfil_key unique (hogar_id, mes, perfil_id)
    );
    create index ingresos_hogar_id_idx on public.ingresos (hogar_id);
  else
    -- No se recrea la tabla (tiene datos previos), pero igual necesita
    -- la columna "hogar_id" (nullable por ahora) para que las políticas
    -- de RLS de más abajo puedan crearse sin error. Queda en null hasta
    -- la migración de corte, que reconstruye esta tabla del todo.
    alter table public.ingresos add column if not exists hogar_id uuid references public.hogares (id) on delete cascade;
    raise notice 'ingresos tiene filas existentes: se agregó hogar_id (nullable), no se recrea la tabla todavía. Ver migración de corte para hogares existentes.';
  end if;
end $$;

-- ── Row Level Security ──────────────────────────────────────────────────
-- A partir de acá, el acceso ya no depende solo de la clave "anon": cada
-- fila pertenece a un hogar, y solo se puede leer/escribir si sos parte
-- de ese hogar (autenticado de verdad con Supabase Auth). No hay policies
-- de "insert" directas sobre hogares/perfiles a propósito: la única forma
-- de crear un hogar o sumarte a uno es a través de las funciones de
-- arriba (`crear_hogar` / `unirse_a_hogar`), que validan todo server-side.

alter table public.hogares enable row level security;
alter table public.perfiles enable row level security;

drop policy if exists "hogares_select" on public.hogares;
create policy "hogares_select" on public.hogares
  for select using (id = public.hogar_id_actual());

drop policy if exists "perfiles_select" on public.perfiles;
create policy "perfiles_select" on public.perfiles
  for select using (hogar_id = public.hogar_id_actual());

-- movimientos / categorias / presupuestos / ingresos: solo tu hogar.
-- Además, en movimientos: los gastos personales del otro integrante del
-- hogar no se pueden leer (privacidad real, no solo en la interfaz).

drop policy if exists "movimientos_select" on public.movimientos;
drop policy if exists "movimientos_insert" on public.movimientos;
drop policy if exists "movimientos_update" on public.movimientos;
drop policy if exists "movimientos_delete" on public.movimientos;

-- El cast a texto es a propósito: en un proyecto con datos reales
-- previos a esta migración, "pagado_por" puede seguir siendo el
-- persona_enum viejo ('Lolo'/'Jaz') hasta que corra la migración de
-- corte (0004), y comparar un enum contra un uuid directamente rompería
-- esta política (error de tipos) apenas se intenta crear. Comparando
-- como texto, mientras tanto simplemente no matchea (no rompe), y una
-- vez migrado a uuid real sigue funcionando igual.
create policy "movimientos_select" on public.movimientos
  for select using (
    hogar_id = public.hogar_id_actual()
    and (compartido = true or pagado_por::text = auth.uid()::text)
  );
create policy "movimientos_insert" on public.movimientos
  for insert with check (hogar_id = public.hogar_id_actual());
create policy "movimientos_update" on public.movimientos
  for update using (hogar_id = public.hogar_id_actual()) with check (hogar_id = public.hogar_id_actual());
create policy "movimientos_delete" on public.movimientos
  for delete using (hogar_id = public.hogar_id_actual());

drop policy if exists "categorias_select" on public.categorias;
drop policy if exists "categorias_insert" on public.categorias;

create policy "categorias_select" on public.categorias
  for select using (hogar_id = public.hogar_id_actual());
create policy "categorias_insert" on public.categorias
  for insert with check (hogar_id = public.hogar_id_actual());

drop policy if exists "presupuestos_select" on public.presupuestos;
drop policy if exists "presupuestos_insert" on public.presupuestos;
drop policy if exists "presupuestos_update" on public.presupuestos;
drop policy if exists "presupuestos_delete" on public.presupuestos;

create policy "presupuestos_select" on public.presupuestos
  for select using (hogar_id = public.hogar_id_actual());
create policy "presupuestos_insert" on public.presupuestos
  for insert with check (hogar_id = public.hogar_id_actual());
create policy "presupuestos_update" on public.presupuestos
  for update using (hogar_id = public.hogar_id_actual()) with check (hogar_id = public.hogar_id_actual());
create policy "presupuestos_delete" on public.presupuestos
  for delete using (hogar_id = public.hogar_id_actual());

alter table public.ingresos enable row level security;
drop policy if exists "ingresos_select" on public.ingresos;
drop policy if exists "ingresos_insert" on public.ingresos;
drop policy if exists "ingresos_update" on public.ingresos;

create policy "ingresos_select" on public.ingresos
  for select using (hogar_id = public.hogar_id_actual());
create policy "ingresos_insert" on public.ingresos
  for insert with check (hogar_id = public.hogar_id_actual());
create policy "ingresos_update" on public.ingresos
  for update using (hogar_id = public.hogar_id_actual()) with check (hogar_id = public.hogar_id_actual());

-- ── Realtime ────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'hogares'
  ) then
    alter publication supabase_realtime add table public.hogares;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'perfiles'
  ) then
    alter publication supabase_realtime add table public.perfiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'ingresos'
  ) then
    alter publication supabase_realtime add table public.ingresos;
  end if;
end $$;
