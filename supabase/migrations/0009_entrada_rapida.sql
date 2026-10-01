-- Fairo: carga rápida desde afuera de la app (Atajos de iOS, "Hey Siri,
-- anotá un gasto"). Ejecutar en el SQL Editor de Supabase DESPUÉS de
-- 0001..0008.
--
-- La idea: cada persona genera un token largo y aleatorio, lo pega una
-- sola vez en el Atajo de su celular, y desde ahí puede dictar un gasto
-- sin abrir la app. El token NO es la sesión de Supabase: solo sirve para
-- crear gastos, no para leer nada.
--
-- Por qué una función `security definer` y no la API normal: quien llama
-- desde el Atajo no tiene sesión, así que para las policies es "anon" y
-- no puede insertar movimientos. La función corre con permisos del dueño,
-- pero lo único que hace es validar el token y crear UN movimiento del
-- perfil dueño de ese token: no deja leer ni tocar nada más.

create table if not exists public.tokens_entrada_rapida (
  token     text primary key,
  perfil_id uuid not null unique references public.perfiles (id) on delete cascade,
  creado_en timestamptz not null default now(),
  usado_en  timestamptz
);

alter table public.tokens_entrada_rapida enable row level security;

drop policy if exists "tokens_entrada_rapida_select" on public.tokens_entrada_rapida;
drop policy if exists "tokens_entrada_rapida_insert" on public.tokens_entrada_rapida;
drop policy if exists "tokens_entrada_rapida_delete" on public.tokens_entrada_rapida;

-- Solo el dueño ve, crea y borra su token. Nadie más del hogar: es la
-- llave de carga de esa persona.
create policy "tokens_entrada_rapida_select" on public.tokens_entrada_rapida
  for select using (perfil_id = auth.uid());
create policy "tokens_entrada_rapida_insert" on public.tokens_entrada_rapida
  for insert with check (perfil_id = auth.uid());
create policy "tokens_entrada_rapida_delete" on public.tokens_entrada_rapida
  for delete using (perfil_id = auth.uid());

create or replace function public.crear_gasto_rapido(
  p_token       text,
  p_descripcion text,
  p_monto       numeric,
  p_categoria   text default null,
  p_modo        text default null,
  p_fecha       date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil_id   uuid;
  v_hogar_id    uuid;
  v_integrantes integer;
  v_categoria   text;
  v_modo        text;
  v_id          uuid;
begin
  select t.perfil_id, p.hogar_id into v_perfil_id, v_hogar_id
  from public.tokens_entrada_rapida t
  join public.perfiles p on p.id = t.perfil_id
  where t.token = p_token;

  -- Mismo mensaje para token inexistente que para token de un perfil
  -- borrado: no se filtra si existió alguna vez.
  if v_perfil_id is null then
    raise exception 'token inválido' using errcode = '28000';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'monto inválido' using errcode = '22023';
  end if;

  if p_descripcion is null or btrim(p_descripcion) = '' then
    raise exception 'falta la descripción' using errcode = '22023';
  end if;

  -- Categoría: la que vino, si de verdad existe en el hogar (sin
  -- distinguir mayúsculas ni acentos de más). Si no, "Otros", y si
  -- tampoco, la primera del hogar.
  select c.nombre into v_categoria
  from public.categorias c
  where c.hogar_id = v_hogar_id
    and lower(c.nombre) = lower(btrim(coalesce(p_categoria, '')))
  limit 1;

  if v_categoria is null then
    select c.nombre into v_categoria
    from public.categorias c
    where c.hogar_id = v_hogar_id
    order by (lower(c.nombre) in ('otros', 'otro')) desc, c.orden, c.nombre
    limit 1;
  end if;

  if v_categoria is null then
    raise exception 'el hogar no tiene categorías' using errcode = '22023';
  end if;

  -- Modo por defecto: igual que en la app, "compartido" si el hogar tiene
  -- más de una persona y "personal" si vive solo. Un gasto que debería
  -- repartirse y queda como personal no entra en el balance y el otro
  -- integrante ni lo ve, así que el default importa.
  select count(*) into v_integrantes
  from public.perfiles where hogar_id = v_hogar_id;

  v_modo := lower(btrim(coalesce(p_modo, '')));
  if v_modo not in ('personal', 'compartido') then
    v_modo := case when v_integrantes > 1 then 'compartido' else 'personal' end;
  end if;

  insert into public.movimientos (
    hogar_id, fecha, descripcion, categoria, monto,
    pagado_por, modo, beneficiario_id, notas
  ) values (
    v_hogar_id, coalesce(p_fecha, current_date), btrim(p_descripcion), v_categoria,
    p_monto, v_perfil_id, v_modo, null, 'Cargado por voz'
  )
  returning id into v_id;

  update public.tokens_entrada_rapida
  set usado_en = now()
  where perfil_id = v_perfil_id;

  return jsonb_build_object(
    'id', v_id,
    'descripcion', btrim(p_descripcion),
    'monto', p_monto,
    'categoria', v_categoria,
    'modo', v_modo
  );
end;
$$;

-- El Atajo llega sin sesión: para Supabase es "anon". El token que manda
-- es lo que lo identifica.
grant execute on function public.crear_gasto_rapido(text, text, numeric, text, text, date)
  to anon, authenticated;
