-- Fairo: gastos "100% de la otra persona", cuentas/medios de pago
-- privados y liquidaciones (marcar deudas como saldadas).
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de 0001..0004.
--
-- Esta migración SÍ toca datos reales que ya estén cargados (a
-- diferencia de la 0003, no hace falta ningún paso de corte aparte):
-- solo agrega columnas/tablas nuevas y convierte el booleano
-- "compartido" al nuevo campo "modo", sin perder información.

-- ── movimientos: "modo" reemplaza a "compartido" ───────────────────────
-- Un movimiento ahora puede ser:
--   'personal'   → como antes: solo lo ve/cuenta quien lo pagó.
--   'compartido' → como antes: se reparte proporcional al % de ingresos.
--   'para_otro'  → nuevo: pagaste vos, pero es 100% gasto de la otra
--                  persona (no se reparte por %, se debe entero).

-- Hay que sacar de encima esta política antes de tocar "compartido": la
-- referencia (de la migración 0003), y Postgres no deja borrar una
-- columna de la que todavía depende una política.
drop policy if exists "movimientos_select" on public.movimientos;

alter table public.movimientos add column if not exists modo text;
alter table public.movimientos add column if not exists beneficiario_id uuid references public.perfiles (id);
alter table public.movimientos add column if not exists cuenta_id uuid;

update public.movimientos
  set modo = case when compartido then 'compartido' else 'personal' end
  where modo is null;

alter table public.movimientos alter column modo set not null;
alter table public.movimientos alter column modo set default 'compartido';

alter table public.movimientos drop constraint if exists movimientos_modo_check;
alter table public.movimientos add constraint movimientos_modo_check
  check (modo in ('personal', 'compartido', 'para_otro'));

alter table public.movimientos drop constraint if exists movimientos_beneficiario_check;
alter table public.movimientos add constraint movimientos_beneficiario_check
  check (
    (modo = 'para_otro' and beneficiario_id is not null)
    or (modo <> 'para_otro' and beneficiario_id is null)
  );

alter table public.movimientos drop column if exists compartido;

create index if not exists movimientos_beneficiario_id_idx on public.movimientos (beneficiario_id);

-- ── cuentas: medios de pago privados de cada persona ───────────────────
-- No son del hogar: cada perfil ve y administra solo las suyas.

create table if not exists public.cuentas (
  id              uuid primary key default gen_random_uuid(),
  perfil_id       uuid not null references public.perfiles (id) on delete cascade,
  entidad         text not null default 'otro',
  nombre          text not null,
  tipo            text not null,
  icono           text,
  saldo_base      numeric(12, 2) not null default 0,
  saldo_base_fecha date not null default current_date,
  creado_en       timestamptz not null default now(),
  constraint cuentas_tipo_check check (tipo in ('debito', 'credito'))
);

create index if not exists cuentas_perfil_id_idx on public.cuentas (perfil_id);

alter table public.movimientos drop constraint if exists movimientos_cuenta_id_fkey;
alter table public.movimientos add constraint movimientos_cuenta_id_fkey
  foreign key (cuenta_id) references public.cuentas (id) on delete set null;
create index if not exists movimientos_cuenta_id_idx on public.movimientos (cuenta_id);

alter table public.cuentas enable row level security;

drop policy if exists "cuentas_select" on public.cuentas;
drop policy if exists "cuentas_insert" on public.cuentas;
drop policy if exists "cuentas_update" on public.cuentas;
drop policy if exists "cuentas_delete" on public.cuentas;

create policy "cuentas_select" on public.cuentas
  for select using (perfil_id = auth.uid());
create policy "cuentas_insert" on public.cuentas
  for insert with check (perfil_id = auth.uid());
create policy "cuentas_update" on public.cuentas
  for update using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy "cuentas_delete" on public.cuentas
  for delete using (perfil_id = auth.uid());

-- ── liquidaciones: registro de pagos entre integrantes del hogar ──────
-- "de_perfil_id le transfirió monto a a_perfil_id" — visible para todo
-- el hogar (a diferencia de las cuentas, esto sí es información
-- compartida: afecta la deuda de los dos).

create table if not exists public.liquidaciones (
  id           uuid primary key default gen_random_uuid(),
  hogar_id     uuid not null references public.hogares (id) on delete cascade,
  de_perfil_id uuid not null references public.perfiles (id),
  a_perfil_id  uuid not null references public.perfiles (id),
  monto        numeric(12, 2) not null check (monto > 0),
  fecha        date not null default current_date,
  nota         text,
  creado_en    timestamptz not null default now(),
  constraint liquidaciones_distintos_check check (de_perfil_id <> a_perfil_id)
);

create index if not exists liquidaciones_hogar_id_idx on public.liquidaciones (hogar_id);

alter table public.liquidaciones enable row level security;

drop policy if exists "liquidaciones_select" on public.liquidaciones;
drop policy if exists "liquidaciones_insert" on public.liquidaciones;
drop policy if exists "liquidaciones_delete" on public.liquidaciones;

create policy "liquidaciones_select" on public.liquidaciones
  for select using (hogar_id = public.hogar_id_actual());
create policy "liquidaciones_insert" on public.liquidaciones
  for insert with check (hogar_id = public.hogar_id_actual());
create policy "liquidaciones_delete" on public.liquidaciones
  for delete using (hogar_id = public.hogar_id_actual());

-- ── movimientos_select: ahora usa "modo" en vez de "compartido" ────────
-- Los "para_otro" quedan visibles para todo el hogar (involucran a los
-- dos), igual que los compartidos. Solo los "personal" del otro
-- integrante siguen ocultos.

drop policy if exists "movimientos_select" on public.movimientos;
create policy "movimientos_select" on public.movimientos
  for select using (
    hogar_id = public.hogar_id_actual()
    and (modo <> 'personal' or pagado_por = auth.uid())
  );

-- ── Realtime ────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'cuentas'
  ) then
    alter publication supabase_realtime add table public.cuentas;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'liquidaciones'
  ) then
    alter publication supabase_realtime add table public.liquidaciones;
  end if;
end $$;
