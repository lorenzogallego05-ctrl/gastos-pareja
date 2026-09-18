-- Fairo: gastos fijos (los que se repiten todos los meses: alquiler,
-- expensas, internet, gimnasio, suscripciones).
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de 0001..0007.
--
-- Un gasto fijo NO es un movimiento: es una plantilla. Cada mes aparece
-- como "pendiente" con el monto del mes pasado precargado, y recién
-- cuando se confirma se crea el movimiento de verdad. Se hace así a
-- propósito: expensas, internet o gimnasio cambian de precio seguido, y
-- generarlos solos con el monto viejo ensuciaría los números sin que
-- nadie se entere.

create table if not exists public.gastos_fijos (
  id             uuid primary key default gen_random_uuid(),
  hogar_id       uuid not null references public.hogares (id) on delete cascade,
  descripcion    text not null,
  categoria      text not null,
  monto_estimado numeric(12, 2) not null default 0,
  -- Día aproximado de vencimiento (1..31), solo para ordenar y avisar.
  -- Es opcional: no todos los gastos fijos tienen fecha clara.
  dia_del_mes    integer,
  modo           text not null default 'compartido',
  pagado_por     uuid not null references public.perfiles (id),
  cuenta_id      uuid references public.cuentas (id) on delete set null,
  activo         boolean not null default true,
  creado_en      timestamptz not null default now(),
  constraint gastos_fijos_modo_check check (modo in ('personal', 'compartido')),
  constraint gastos_fijos_dia_check
    check (dia_del_mes is null or (dia_del_mes >= 1 and dia_del_mes <= 31))
);

create index if not exists gastos_fijos_hogar_id_idx on public.gastos_fijos (hogar_id);

-- Vínculo explícito: así se sabe con certeza si el fijo de este mes ya
-- se cargó, en vez de adivinar comparando descripciones.
alter table public.movimientos add column if not exists gasto_fijo_id uuid;

alter table public.movimientos drop constraint if exists movimientos_gasto_fijo_id_fkey;
alter table public.movimientos add constraint movimientos_gasto_fijo_id_fkey
  foreign key (gasto_fijo_id) references public.gastos_fijos (id) on delete set null;

create index if not exists movimientos_gasto_fijo_id_idx on public.movimientos (gasto_fijo_id);

alter table public.gastos_fijos enable row level security;

drop policy if exists "gastos_fijos_select" on public.gastos_fijos;
drop policy if exists "gastos_fijos_insert" on public.gastos_fijos;
drop policy if exists "gastos_fijos_update" on public.gastos_fijos;
drop policy if exists "gastos_fijos_delete" on public.gastos_fijos;

-- Misma regla que los movimientos: los compartidos los ve todo el hogar,
-- los personales solo quien los paga.
create policy "gastos_fijos_select" on public.gastos_fijos
  for select using (
    hogar_id = public.hogar_id_actual()
    and (modo <> 'personal' or pagado_por = auth.uid())
  );
create policy "gastos_fijos_insert" on public.gastos_fijos
  for insert with check (hogar_id = public.hogar_id_actual());
create policy "gastos_fijos_update" on public.gastos_fijos
  for update using (hogar_id = public.hogar_id_actual())
  with check (hogar_id = public.hogar_id_actual());
create policy "gastos_fijos_delete" on public.gastos_fijos
  for delete using (hogar_id = public.hogar_id_actual());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'gastos_fijos'
  ) then
    alter publication supabase_realtime add table public.gastos_fijos;
  end if;
end $$;
