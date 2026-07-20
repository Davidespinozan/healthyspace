-- ═══════════════════════════════════════════════════════════════════════════
-- LOS ÚLTIMOS TRES HUECOS
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. La bitácora no sabía QUÉ receta cambió ──────────────────────────────
-- `registro` salía de `v_despues->>'id'`, pero `truck_recetas` tiene llave
-- primaria compuesta (producto, insumo) y no columna `id`. O sea que en la tabla
-- que el propio comentario de 0018 marca como crítica —"cambiar una receta cambia
-- el costo de un platillo"— el renglón de bitácora decía NULL: registraba que
-- algo cambió, pero no qué.
--
-- Ahora si no hay `id` se arma la identidad con la llave primaria real de la
-- tabla, sea cual sea. Sirve para ésta y para cualquiera que se agregue después.
create or replace function public.trg_bitacora()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_antes jsonb; v_despues jsonb; v_cambios text[]; k text; v_id text;
begin
  v_antes   := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_despues := case when tg_op = 'DELETE' then null else to_jsonb(new) end;

  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(v_despues) loop
      if v_antes->>k is distinct from v_despues->>k then
        v_cambios := array_append(v_cambios, k);
      end if;
    end loop;
    if v_cambios is null then return new; end if;   -- update que no cambió nada
  end if;

  -- Identidad del renglón: `id` si existe; si no, la llave primaria real.
  v_id := coalesce(v_despues->>'id', v_antes->>'id');
  if v_id is null then
    select string_agg(coalesce(coalesce(v_despues, v_antes)->>a.attname, '?'), ' · '
                      order by array_position(c.conkey, a.attnum))
      into v_id
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.conrelid = tg_relid and c.contype = 'p';
  end if;

  insert into public.truck_bitacora (tabla, operacion, registro, actor, antes, despues, cambios)
  values (tg_table_name, tg_op, v_id, auth.uid(), v_antes, v_despues, v_cambios);

  return coalesce(new, old);
end; $$;

-- ── 2. Faltaban tablas por auditar ─────────────────────────────────────────
-- `truck_recetas_produccion` define cuánto crudo lleva un kilo de producto
-- terminado: tocarla mueve el costo de todo lo que se produce, igual que
-- `truck_recetas`. No estaba en la lista. `truck_proveedores` tampoco.
do $$
declare t text;
begin
  foreach t in array array[
    'truck_recetas_produccion',   -- cuánto crudo por kilo terminado
    'truck_proveedores'
  ] loop
    execute format('drop trigger if exists bitacora_trg on public.%I', t);
    execute format(
      'create trigger bitacora_trg after insert or update or delete on public.%I
       for each row execute function public.trg_bitacora()', t);
  end loop;
end $$;

-- ── 3. Cancelar después de cerrar no devolvía el inventario ────────────────
-- `descontar_venta` solo resta. Si un pedido ya entregado se cancela (una
-- devolución), los movimientos de venta se quedan en el libro pero el pedido deja
-- de contar en Ventas: costo sin ingreso, margen subestimado, e inventario más
-- bajo de lo que hay en el estante.
--
-- No se BORRAN los movimientos —el libro es append-only y esa es toda su gracia—
-- sino que se asienta el contrario, con su propio motivo. Así queda la historia
-- completa: se vendió, se devolvió, y se ve.
--
-- `devolucion` va como motivo propio y no como 'ajuste': un ajuste es "el sistema
-- no cuadraba"; una devolución es un hecho del negocio y hay que poder contarlas.
alter table public.truck_movimientos drop constraint if exists truck_movimientos_motivo_check;
alter table public.truck_movimientos add constraint truck_movimientos_motivo_check
  check (motivo in ('compra','produccion','traslado-entrada','traslado-salida',
                    'venta','merma','ajuste','conteo','devolucion'));

create or replace function public.devolver_venta(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o record; n int;
begin
  perform public.exigir_staff();
  select * into o from public.truck_orders where id = p_order for update;
  if o is null then raise exception 'Pedido no existe'; end if;

  -- Idempotente: si ya se devolvió, no se repite.
  select count(*) into n from public.truck_movimientos
   where referencia = o.code and motivo = 'devolucion';
  if n > 0 then return; end if;

  insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, staff_id)
  select m.ubicacion, m.insumo, -m.cambio, 'devolucion', o.code, auth.uid()
    from public.truck_movimientos m
   where m.referencia = o.code and m.motivo = 'venta';
end; $$;

revoke all on function public.devolver_venta(uuid) from public, anon;
grant execute on function public.devolver_venta(uuid) to authenticated;

-- Se dispara al cancelar un pedido que YA había descontado.
create or replace function public.trg_devolver_venta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelado' and old.status in ('recogido', 'entregado') then
    perform public.devolver_venta(new.id);
  end if;
  return new;
end; $$;

drop trigger if exists devolver_al_cancelar on public.truck_orders;
create trigger devolver_al_cancelar
  after update on public.truck_orders
  for each row execute function public.trg_devolver_venta();
