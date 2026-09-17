-- Orden manual y visibilidad de cada cuenta en la tarjeta de Inicio
-- (cada perfil puede reordenar y ocultar sus propias cuentas ahí, sin
-- afectar la lista completa en Finanzas > Cuentas).
alter table public.cuentas add column if not exists orden integer not null default 0;
alter table public.cuentas add column if not exists oculta_en_inicio boolean not null default false;

-- Backfill: las cuentas ya cargadas arrancan ordenadas por fecha de
-- creación (mismo orden en que ya se listan hoy), para que no aparezcan
-- todas empatadas en 0.
with numeradas as (
  select id, row_number() over (partition by perfil_id order by creado_en asc) - 1 as rn
  from public.cuentas
)
update public.cuentas c
set orden = numeradas.rn
from numeradas
where c.id = numeradas.id;
