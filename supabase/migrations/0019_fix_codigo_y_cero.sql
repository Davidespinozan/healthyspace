-- ═══════════════════════════════════════════════════════════════════════════
-- DOS BUGS ENCONTRADOS EN REVISIÓN.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── BUG 1: códigos de pedido que se repiten ────────────────────────────────
-- Los códigos eran 4 dígitos al azar: 9000 posibles. Por el problema del
-- cumpleaños hay ~50% de probabilidad de repetición a los 112 pedidos, y no
-- había restricción de unicidad.
--
-- Importa porque la idempotencia del descuento de inventario usa el código: dos
-- pedidos con el mismo código descuentan UNA vez. Probado: dos ventas de un bowl
-- descontaron 1 empaque en vez de 2. El inventario se queda largo en silencio, y
-- lo mismo afecta al registro automático de pedidos en el plan del Club.
--
-- La restricción va primero para que NUNCA pueda volver a pasar callado: si algún
-- día se repite, falla el insert en vez de corromper el inventario.
do $$
declare dup record; n int := 0;
begin
  for dup in
    select code from public.truck_orders group by code having count(*) > 1
  loop
    -- Renombra los duplicados existentes conservando el más viejo.
    update public.truck_orders o set code = o.code || '-' || substr(o.id::text, 1, 4)
     where o.code = dup.code
       and o.id <> (select id from public.truck_orders where code = dup.code
                     order by created_at limit 1);
    n := n + 1;
  end loop;
  raise notice 'códigos duplicados corregidos: %', n;
end $$;

alter table public.truck_orders drop constraint if exists truck_orders_code_key;
alter table public.truck_orders add constraint truck_orders_code_key unique (code);

-- ── BUG 2: lo que llega a cero desaparece ──────────────────────────────────
-- La vista filtraba `having sum(cambio) <> 0`, así que un insumo agotado se
-- borraba de la pantalla. Justo cuando se acaba algo —el momento en que más
-- urge verlo— la alerta de bajo mínimo se esfumaba.
--
-- Ahora se conserva el cero y solo se ocultan las existencias negativas
-- imposibles... que TAMPOCO se ocultan: un negativo significa que se vendió más
-- de lo que había registrado, y eso hay que verlo, no esconderlo.
create or replace view public.truck_existencias as
  select m.ubicacion, m.insumo, sum(m.cambio) as cantidad,
         max(m.created_at) as ultimo_movimiento
    from public.truck_movimientos m
   group by m.ubicacion, m.insumo;

-- `inventario()` ahora marca también lo agotado y lo negativo.
-- Se borra primero: cambia el tipo de retorno (columnas nuevas) y create or
-- replace no puede hacerlo.
drop function if exists public.inventario(text);
create function public.inventario(p_ubicacion text default null)
returns table (
  ubicacion text, ubicacion_nombre text, insumo text, insumo_nombre text,
  categoria text, unidad text, cantidad numeric, min_alerta numeric,
  bajo_minimo boolean, agotado boolean, negativo boolean, ultimo_movimiento timestamptz
)
language sql stable security definer set search_path = public as $$
  select e.ubicacion, u.nombre, e.insumo, i.nombre, i.categoria, i.unidad,
         e.cantidad, i.min_alerta,
         (i.min_alerta is not null and e.cantidad <= i.min_alerta) as bajo_minimo,
         (e.cantidad <= 0) as agotado,
         (e.cantidad < 0) as negativo,
         e.ultimo_movimiento
    from public.truck_existencias e
    join public.truck_ubicaciones u on u.id = e.ubicacion
    join public.truck_insumos i on i.id = e.insumo
   where (p_ubicacion is null or e.ubicacion = p_ubicacion)
     and i.activo
   order by (e.cantidad < 0) desc, (e.cantidad <= 0) desc, i.categoria, i.nombre;
$$;

revoke all on function public.inventario(text) from public, anon;
grant execute on function public.inventario(text) to authenticated;
