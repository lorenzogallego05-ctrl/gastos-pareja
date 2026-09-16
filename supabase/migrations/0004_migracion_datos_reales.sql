-- Gastos Pareja: migración de corte de los datos reales de Lolo y Jaz
-- al modelo de hogares/cuentas reales.
--
-- ⚠️ Este script es DE UN SOLO USO y toca datos de producción (borra la
-- tabla vieja "ingresos" y la columna vieja "pagado_por"). No lo corras
-- sin haber hecho antes un backup del proyecto (Supabase → Database →
-- Backups, o Settings → General → "Pause project" no sirve, usar el
-- backup automático/manual de la base).
--
-- Requisitos ANTES de correr esto (en este orden):
--   1. Ya se corrió `0003_hogares_y_cuentas_reales.sql` en este proyecto.
--   2. Lolo y Jaz ya se registraron en la app con su cuenta real
--      (email + contraseña) y confirmaron el email.
--   3. Uno de los dos usó "Crear mi hogar" → "Voy a compartir" en el
--      onboarding, escribiendo su nombre como "Lolo" (no hace falta
--      respetar mayúsculas, este script no distingue mayúsculas de
--      minúsculas).
--   4. El otro usó "Unirme con un código" con el código que le pasó el
--      primero, escribiendo su nombre como "Jaz".
--   5. Ambos ya figuran en la tabla `perfiles` del mismo hogar (podés
--      chequear con: select * from public.perfiles;).
--
-- Qué hace:
--   - Ubica el hogar de Lolo y Jaz por el nombre de sus perfiles.
--   - Pasa todas las categorías, presupuestos y movimientos existentes a
--     ese hogar.
--   - Convierte "movimientos.pagado_por" de persona_enum ('Lolo'/'Jaz')
--     a uuid, apuntando al perfil real de cada uno.
--   - Reconstruye "ingresos" (antes una fila por mes con ingreso_lolo /
--     ingreso_jaz) como una fila por persona y por mes.
--   - Deja las políticas de RLS de "ingresos" y "movimientos" en su
--     forma final (ya sin el cast de transición de la migración 0003).

-- Hay que sacar de encima la política de "movimientos_select" de la
-- migración 0003 ANTES de tocar la columna "pagado_por": esa política la
-- referencia (con el cast de transición), y Postgres no deja borrar una
-- columna de la que todavía depende una política.
drop policy if exists "movimientos_select" on public.movimientos;

do $$
declare
  v_hogar_id     uuid;
  v_perfil_lolo  uuid;
  v_perfil_jaz   uuid;
  v_sin_mapear   int;
begin
  select p.hogar_id into v_hogar_id
  from public.perfiles p
  where lower(trim(p.nombre)) = 'lolo';

  if v_hogar_id is null then
    raise exception 'No encontré ningún perfil llamado "Lolo". Registrate en la app y hacé el onboarding antes de correr esto.';
  end if;

  select id into v_perfil_lolo
    from public.perfiles where hogar_id = v_hogar_id and lower(trim(nombre)) = 'lolo';
  select id into v_perfil_jaz
    from public.perfiles where hogar_id = v_hogar_id and lower(trim(nombre)) = 'jaz';

  if v_perfil_lolo is null or v_perfil_jaz is null then
    raise exception 'El hogar % no tiene todavía los dos perfiles (Lolo y Jaz). Faltó que alguno se sume con el código.', v_hogar_id;
  end if;

  raise notice 'Hogar detectado: % — Lolo: %, Jaz: %', v_hogar_id, v_perfil_lolo, v_perfil_jaz;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'movimientos'
      and column_name = 'pagado_por' and data_type = 'uuid'
  ) then
    raise notice 'Esto ya se migró antes (movimientos.pagado_por ya es uuid). No hago nada más.';
    return;
  end if;

  -- ── categorías ──────────────────────────────────────────────────────
  -- El unique(hogar_id, nombre) y las FK compuestas hacia categorias ya
  -- las dejó listas la migración 0003 (no dependen de si hay datos
  -- previos). Ojo: al crear el hogar, el trigger "sembrar_categorias_
  -- hogar" ya le sembró sus propias 12 categorías por defecto (mismos
  -- nombres que las viejas, globales). Las viejas que compartan nombre
  -- con esas son redundantes — se borran, y cualquier movimiento/
  -- presupuesto que las usaba va a matchear igual por nombre contra la
  -- fila nueva del hogar en cuanto tenga su hogar_id. Las viejas que NO
  -- tengan equivalente (categorías personalizadas que hayas agregado) sí
  -- se migran, asignándoles el hogar_id.
  delete from public.categorias c_vieja
    where c_vieja.hogar_id is null
      and exists (
        select 1 from public.categorias c_nueva
        where c_nueva.hogar_id = v_hogar_id and c_nueva.nombre = c_vieja.nombre
      );

  update public.categorias set hogar_id = v_hogar_id where hogar_id is null;
  alter table public.categorias alter column hogar_id set not null;

  -- ── presupuestos ────────────────────────────────────────────────────
  update public.presupuestos set hogar_id = v_hogar_id where hogar_id is null;
  alter table public.presupuestos alter column hogar_id set not null;
  alter table public.presupuestos drop constraint if exists presupuestos_mes_categoria_key;
  alter table public.presupuestos drop constraint if exists presupuestos_hogar_mes_categoria_key;
  alter table public.presupuestos add constraint presupuestos_hogar_mes_categoria_key unique (hogar_id, mes, categoria);

  -- ── movimientos: hogar_id + pagado_por (persona_enum → uuid) ───────
  update public.movimientos set hogar_id = v_hogar_id where hogar_id is null;
  alter table public.movimientos alter column hogar_id set not null;

  alter table public.movimientos add column if not exists pagado_por_uuid uuid;
  update public.movimientos
    set pagado_por_uuid = case lower(pagado_por::text)
      when 'lolo' then v_perfil_lolo
      when 'jaz' then v_perfil_jaz
      else null
    end
    where pagado_por_uuid is null;

  select count(*) into v_sin_mapear from public.movimientos where pagado_por_uuid is null;
  if v_sin_mapear > 0 then
    raise exception 'Hay % movimiento(s) cuyo "pagado_por" no es Lolo ni Jaz. Revisalos antes de seguir.', v_sin_mapear;
  end if;

  alter table public.movimientos drop column pagado_por;
  alter table public.movimientos rename column pagado_por_uuid to pagado_por;
  alter table public.movimientos alter column pagado_por set not null;
  alter table public.movimientos add constraint movimientos_pagado_por_fkey
    foreign key (pagado_por) references public.perfiles (id);
  create index if not exists movimientos_pagado_por_idx on public.movimientos (pagado_por);
  create index if not exists movimientos_hogar_id_idx on public.movimientos (hogar_id);

  -- ── ingresos: (mes, ingreso_lolo, ingreso_jaz) → una fila por persona ─
  create table public.ingresos_nuevo (
    id        uuid primary key default gen_random_uuid(),
    hogar_id  uuid not null references public.hogares (id) on delete cascade,
    mes       text not null,
    perfil_id uuid not null references public.perfiles (id) on delete cascade,
    monto     numeric(12, 2) not null default 0,
    constraint mes_formato check (mes ~ '^\d{4}-\d{2}$'),
    constraint ingresos_hogar_mes_perfil_key unique (hogar_id, mes, perfil_id)
  );

  insert into public.ingresos_nuevo (hogar_id, mes, perfil_id, monto)
    select v_hogar_id, mes, v_perfil_lolo, ingreso_lolo from public.ingresos
    union all
    select v_hogar_id, mes, v_perfil_jaz, ingreso_jaz from public.ingresos;

  drop table public.ingresos;
  alter table public.ingresos_nuevo rename to ingresos;
  create index ingresos_hogar_id_idx on public.ingresos (hogar_id);

  raise notice 'Migración de datos completa.';
end $$;

-- Ya no hace falta el persona_enum viejo.
drop type if exists persona_enum;

-- ── RLS final (ingresos, tabla recreada: RLS y policies se perdieron) ──

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

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'ingresos'
  ) then
    alter publication supabase_realtime add table public.ingresos;
  end if;
end $$;

-- ── RLS final de movimientos (ya sin el cast de transición de 0003) ───

create policy "movimientos_select" on public.movimientos
  for select using (
    hogar_id = public.hogar_id_actual()
    and (compartido = true or pagado_por = auth.uid())
  );
