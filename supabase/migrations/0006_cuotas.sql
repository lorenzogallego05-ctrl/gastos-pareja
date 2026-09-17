-- Fairo: gastos en cuotas (pagos recurrentes en varias partes).
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de 0001..0005.
--
-- Un gasto en cuotas se carga como varios movimientos normales (uno por
-- mes), etiquetados con en qué cuota van y a qué "plan" pertenecen. No
-- hace falta nada automático corriendo en el servidor: se generan todas
-- las cuotas restantes de una sola vez al cargarlo.

alter table public.movimientos add column if not exists cuota_actual integer;
alter table public.movimientos add column if not exists cuota_total integer;
alter table public.movimientos add column if not exists cuota_grupo_id uuid;

alter table public.movimientos drop constraint if exists movimientos_cuota_check;
alter table public.movimientos add constraint movimientos_cuota_check
  check (
    (cuota_actual is null and cuota_total is null and cuota_grupo_id is null)
    or (
      cuota_actual is not null and cuota_total is not null and cuota_grupo_id is not null
      and cuota_actual >= 1 and cuota_actual <= cuota_total
    )
  );

create index if not exists movimientos_cuota_grupo_id_idx on public.movimientos (cuota_grupo_id);
