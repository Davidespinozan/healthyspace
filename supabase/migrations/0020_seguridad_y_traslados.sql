-- ═══════════════════════════════════════════════════════════════════════════
-- CIERRE DE SEGURIDAD Y CORRECCIÓN DE TRASLADOS
--
-- El panel operativo vive en el MISMO proyecto de Supabase que Healthy Space
-- Club. Cada socio del gimnasio con sesión iniciada es rol `authenticated`,
-- exactamente el mismo rol al que se le había dado permiso de ejecutar las
-- funciones del negocio. Se probó contra la base real, haciéndose pasar por un
-- socio sin rol de staff: podía leer el estado de resultados, el costo y margen
-- de cada bowl, la bitácora (que la política de 0018 declara solo-admin), el
-- inventario de los tres remolques, y fabricar una venta de mostrador PAGADA de
-- $79,600. Los seis intentos pasaron.
--
-- La causa es que las funciones son SECURITY DEFINER: corren como dueño de las
-- tablas y por diseño se saltan toda la RLS que las migraciones anteriores
-- definen con cuidado. La RLS estaba bien; la puerta de al lado estaba abierta.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Quién es quién ─────────────────────────────────────────────────────────
-- SECURITY DEFINER a propósito: `truck_staff` solo deja leer la fila propia, y
-- estas necesitan resolver el rol del que llama sin depender de esa política.
create or replace function public.es_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.truck_staff s where s.id = auth.uid() and s.active);
$$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.truck_staff s
                  where s.id = auth.uid() and s.active and s.role = 'admin');
$$;

create or replace function public.mi_sucursal()
returns text language sql stable security definer set search_path = public as $$
  select branch_id from public.truck_staff where id = auth.uid() and active;
$$;

-- Las tres que exigen. Fallan ruidosamente: más vale un error en pantalla que
-- una tabla vacía que se lee como "no hay nada que reportar".
create or replace function public.exigir_staff()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_staff() then
    raise exception 'No autorizado: esta operación es del personal de Healthy Space'
      using errcode = '42501';
  end if;
end $$;

create or replace function public.exigir_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado: esta información es de administración'
      using errcode = '42501';
  end if;
end $$;

-- El cajero cierra SU turno, no el de otro remolque.
create or replace function public.exigir_staff_de(p_branch text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_staff() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if not public.es_admin() and coalesce(public.mi_sucursal(), '') <> coalesce(p_branch, '') then
    raise exception 'Solo puedes consultar la caja de tu remolque' using errcode = '42501';
  end if;
end $$;

revoke all on function public.es_staff(), public.es_admin(), public.mi_sucursal(),
  public.exigir_staff(), public.exigir_admin(), public.exigir_staff_de(text) from public, anon;
grant execute on function public.es_staff(), public.es_admin(), public.mi_sucursal(),
  public.exigir_staff(), public.exigir_admin(), public.exigir_staff_de(text) to authenticated;

-- ── Traslados: había DOS `recibir_traslado` ────────────────────────────────
-- 0011 partió el traslado en dos tiempos (enviar asienta la salida, recibir la
-- entrada) pero nunca borró la versión de 0010, que asienta salida Y entrada.
-- La app llama con un solo argumento, así que Postgres resolvía a la vieja:
-- almacén envía 12 kg, 0011 asienta −12, y al recibir se asentaban otros −12.
-- Doble faltante fantasma sobre cada envío, en el libro que no admite borrado.
drop function if exists public.recibir_traslado(uuid);

CREATE OR REPLACE FUNCTION public.bitacora(p_tabla text DEFAULT NULL::text, p_limite integer DEFAULT 100)
 RETURNS TABLE(cuando timestamp with time zone, quien text, tabla text, operacion text, registro text, cambios text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_admin();
  return query (select b.created_at, coalesce(s.name, 'sistema'), b.tabla, b.operacion,
         b.registro, b.cambios
    from public.truck_bitacora b
    left join public.truck_staff s on s.id = b.actor
   where (p_tabla is null or b.tabla = p_tabla)
   order by b.created_at desc
   limit greatest(1, least(p_limite, 500)));
end
$function$;

CREATE OR REPLACE FUNCTION public.caja_estado(p_branch text)
 RETURNS TABLE(desde timestamp with time zone, ventas_efectivo numeric, n_pedidos integer, ultimo_cierre timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_staff_de(p_branch);
  return query (with ult as (
    select max(cerrado_en) as t from public.truck_cash_closings where branch = p_branch
  )
  select
    coalesce((select t from ult), now() - interval '24 hours') as desde,
    coalesce(sum(o.total), 0) as ventas_efectivo,
    count(*)::int as n_pedidos,
    (select t from ult) as ultimo_cierre
  from public.truck_orders o
  where o.branch = p_branch
    and o.payment_method = 'efectivo'
    and o.paid
    and o.created_at >= coalesce((select t from ult), now() - interval '24 hours'));
end
$function$;

CREATE OR REPLACE FUNCTION public.cerrar_produccion(p_id uuid, p_real numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare pr record; ent record; rend numeric; crudo numeric := 0;
begin
  perform public.exigir_staff();
  select * into pr from public.truck_produccion where id = p_id for update;
  if pr is null then raise exception 'Producción no existe'; end if;
  if pr.estado = 'terminada' then return pr.rendimiento_real; end if;
  if pr.estado = 'cancelada' then raise exception 'Producción cancelada'; end if;
  if p_real <= 0 then raise exception 'La cantidad producida debe ser mayor a cero'; end if;

  for ent in select * from public.truck_recetas_produccion where producto = pr.producto loop
    insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, nota, staff_id)
    values (pr.origen, ent.insumo, -(ent.cantidad * pr.cantidad_plan), 'produccion', pr.folio,
            'Insumo de ' || pr.folio, coalesce(pr.staff_id, auth.uid()));
    crudo := crudo + (ent.cantidad * pr.cantidad_plan);
  end loop;

  insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, caduca, staff_id)
  values (pr.destino, pr.producto, p_real, 'produccion', pr.folio, pr.caduca,
          coalesce(pr.staff_id, auth.uid()));

  -- Lo que de verdad rindió la materia prima.
  rend := case when crudo > 0 then round(p_real / crudo, 4) end;

  update public.truck_produccion
     set estado='terminada', cantidad_real=p_real, rendimiento_real=rend, cerrada_en=now()
   where id = p_id;

  return rend;
end; $function$;

CREATE OR REPLACE FUNCTION public.costeo_detalle(p_producto text)
 RETURNS TABLE(insumo_nombre text, categoria text, unidad text, servido numeric, rendimiento numeric, bruto numeric, costo_unitario numeric, costo numeric, pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_admin();
  return query (with d as (select * from public.truck_costo_detalle where producto = p_producto),
       t as (select nullif(sum(costo), 0) as total from d)
  select d.insumo_nombre, d.categoria, d.unidad, d.servido, d.rendimiento, d.bruto,
         d.costo_unitario, d.costo,
         round(d.costo / (select total from t) * 100, 1)
    from d order by d.costo desc);
end
$function$;

CREATE OR REPLACE FUNCTION public.costeo_platillos()
 RETURNS TABLE(producto text, nombre text, precio numeric, costo_comida numeric, costo_empaque numeric, costo_total numeric, margen numeric, food_cost_pct numeric, sin_costo integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_admin();
  return query (select b.id, b.name, b.price,
         round(coalesce(sum(d.costo) filter (where d.categoria = 'comida'), 0), 2),
         round(coalesce(sum(d.costo) filter (where d.categoria = 'empaque'), 0), 2),
         round(coalesce(sum(d.costo), 0), 2),
         round(b.price - coalesce(sum(d.costo), 0), 2),
         case when b.price > 0
              then round(coalesce(sum(d.costo), 0) / b.price * 100, 1) end,
         count(*) filter (where d.costo_unitario is null)::int
    from public.truck_bowls b
    left join public.truck_costo_detalle d on d.producto = b.id
   group by b.id, b.name, b.price, b.sort
   order by b.sort);
end
$function$;

CREATE OR REPLACE FUNCTION public.despachar_pedido(p_id uuid, p_repartidor uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_staff();
  update public.truck_orders
     set status = 'camino',
         repartidor_id = coalesce(p_repartidor, repartidor_id, auth.uid()),
         salio_en = coalesce(salio_en, now())
   where id = p_id and mode = 'delivery' and status not in ('entregado','cancelado');
end; $function$;

CREATE OR REPLACE FUNCTION public.en_transito()
 RETURNS TABLE(id uuid, folio text, origen text, destino text, enviado_en timestamp with time zone, items jsonb, horas numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_staff();
  return query (select t.id, t.folio, t.origen, t.destino, t.enviado_en, t.items,
         round(extract(epoch from (now() - t.enviado_en)) / 3600, 1)
    from public.truck_traslados t
   where t.estado = 'enviado'
   order by t.enviado_en);
end
$function$;

CREATE OR REPLACE FUNCTION public.entregar_pedido(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_staff();
  update public.truck_orders
     set status = 'entregado', entregado_en = coalesce(entregado_en, now())
   where id = p_id and mode = 'delivery' and status <> 'cancelado';
end; $function$;

CREATE OR REPLACE FUNCTION public.enviar_traslado(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t record; it jsonb;
begin
  perform public.exigir_staff();
  select * into t from public.truck_traslados where id = p_id for update;
  if t is null then raise exception 'Traslado no existe'; end if;
  if t.estado <> 'solicitado' then return; end if;

  for it in select * from jsonb_array_elements(t.items) loop
    insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, staff_id)
    values (t.origen, it->>'insumo', -(it->>'cantidad')::numeric, 'traslado-salida', t.folio, auth.uid());
  end loop;

  update public.truck_traslados
     set estado='enviado', envio=auth.uid(), enviado_en=now()
   where id = p_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.estado_resultados(p_desde date DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date, p_hasta date DEFAULT CURRENT_DATE, p_ubicacion text DEFAULT NULL::text)
 RETURNS TABLE(concepto text, monto numeric, pct_ventas numeric, orden integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_admin();
  return query (with ventas as (
    select coalesce(sum(o.total), 0) as v
      from public.truck_orders o
     where o.status not in ('cancelado')
       and o.created_at::date between p_desde and p_hasta
       and (p_ubicacion is null or o.branch = p_ubicacion)
  ),
  consumo as (
    select coalesce(sum(-m.cambio * i.costo_unitario), 0) as c
      from public.truck_movimientos m join public.truck_insumos i on i.id = m.insumo
     where m.motivo = 'venta' and m.created_at::date between p_desde and p_hasta
       and (p_ubicacion is null or m.ubicacion = p_ubicacion)
  ),
  merma as (
    select coalesce(sum(-m.cambio * i.costo_unitario), 0) as mm
      from public.truck_movimientos m join public.truck_insumos i on i.id = m.insumo
     where m.motivo = 'merma' and m.created_at::date between p_desde and p_hasta
       and (p_ubicacion is null or m.ubicacion = p_ubicacion)
  ),
  gastos as (
    select coalesce(sum(g.monto), 0) as g
      from public.truck_gastos g
     where g.fecha between p_desde and p_hasta
       and (p_ubicacion is null or g.ubicacion = p_ubicacion or g.ubicacion is null)
  )
  select * from (
    select 'Ventas'::text, (select v from ventas), 100.0::numeric, 1
    union all select 'Costo de ventas', -(select c from consumo),
      case when (select v from ventas) > 0 then round(-(select c from consumo) / (select v from ventas) * 100, 1) end, 2
    union all select 'Merma', -(select mm from merma),
      case when (select v from ventas) > 0 then round(-(select mm from merma) / (select v from ventas) * 100, 1) end, 3
    union all select 'Utilidad bruta',
      (select v from ventas) - (select c from consumo) - (select mm from merma),
      case when (select v from ventas) > 0 then
        round(((select v from ventas) - (select c from consumo) - (select mm from merma)) / (select v from ventas) * 100, 1) end, 4
    union all select 'Gastos de operación', -(select g from gastos),
      case when (select v from ventas) > 0 then round(-(select g from gastos) / (select v from ventas) * 100, 1) end, 5
    union all select 'Utilidad operativa',
      (select v from ventas) - (select c from consumo) - (select mm from merma) - (select g from gastos),
      case when (select v from ventas) > 0 then
        round(((select v from ventas) - (select c from consumo) - (select mm from merma) - (select g from gastos)) / (select v from ventas) * 100, 1) end, 6
  ) t(concepto, monto, pct_ventas, orden)
  order by orden);
end
$function$;

CREATE OR REPLACE FUNCTION public.gastos_por_categoria(p_desde date DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date, p_hasta date DEFAULT CURRENT_DATE)
 RETURNS TABLE(categoria text, monto numeric, n integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_admin();
  return query (select g.categoria, sum(g.monto), count(*)::int
    from public.truck_gastos g
   where g.fecha between p_desde and p_hasta
   group by g.categoria order by sum(g.monto) desc);
end
$function$;

CREATE OR REPLACE FUNCTION public.inventario(p_ubicacion text DEFAULT NULL::text)
 RETURNS TABLE(ubicacion text, ubicacion_nombre text, insumo text, insumo_nombre text, categoria text, unidad text, cantidad numeric, min_alerta numeric, bajo_minimo boolean, agotado boolean, negativo boolean, ultimo_movimiento timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_staff();
  return query (select e.ubicacion, u.nombre, e.insumo, i.nombre, i.categoria, i.unidad,
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
   order by (e.cantidad < 0) desc, (e.cantidad <= 0) desc, i.categoria, i.nombre);
end
$function$;

CREATE OR REPLACE FUNCTION public.recibir_compra(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c record; it jsonb; existencia numeric; costo_viejo numeric; cant numeric; costo_nuevo numeric;
begin
  perform public.exigir_staff();
  select * into c from public.truck_compras where id = p_id for update;
  if c is null then raise exception 'Compra no existe'; end if;
  if c.estado <> 'pendiente' then return; end if;

  for it in select * from jsonb_array_elements(c.items) loop
    cant := (it->>'cantidad')::numeric;
    costo_nuevo := (it->>'costo_unitario')::numeric;

    -- Existencia GLOBAL del insumo (todas las ubicaciones): el costo es del
    -- insumo, no de dónde esté guardado.
    select coalesce(sum(cambio), 0) into existencia
      from public.truck_movimientos where insumo = it->>'insumo';
    select costo_unitario into costo_viejo
      from public.truck_insumos where id = it->>'insumo';

    insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, staff_id)
    values (c.ubicacion, it->>'insumo', cant, 'compra', c.folio, coalesce(c.staff_id, auth.uid()));

    -- Promedio ponderado. Si no había existencia ni costo previo, el costo es el
    -- de esta compra.
    update public.truck_insumos
       set costo_unitario = case
             when costo_viejo is null or existencia <= 0 then costo_nuevo
             else round(((existencia * costo_viejo) + (cant * costo_nuevo)) / (existencia + cant), 4)
           end,
           costo_actualizado = current_date
     where id = it->>'insumo';
  end loop;

  update public.truck_compras set estado='recibida', recibida_en=now() where id = p_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.recibir_traslado(p_id uuid, p_recibido jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t record; it jsonb; llego numeric; enviado numeric; faltas jsonb := '[]'::jsonb;
begin
  perform public.exigir_staff();
  select * into t from public.truck_traslados where id = p_id for update;
  if t is null then raise exception 'Traslado no existe'; end if;
  if t.estado = 'recibido' then return; end if;                 -- idempotente
  if t.estado = 'cancelado' then raise exception 'Traslado cancelado'; end if;
  -- Si nunca se marcó enviado, se asienta la salida ahora para no perder la pata.
  if t.estado = 'solicitado' then perform public.enviar_traslado(p_id); end if;

  for it in select * from jsonb_array_elements(t.items) loop
    enviado := (it->>'cantidad')::numeric;
    llego := coalesce(
      (select (x->>'cantidad')::numeric
         from jsonb_array_elements(coalesce(p_recibido, '[]'::jsonb)) x
        where x->>'insumo' = it->>'insumo'),
      enviado);

    if llego > 0 then
      insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, staff_id)
      values (t.destino, it->>'insumo', llego, 'traslado-entrada', t.folio, auth.uid());
    end if;

    if llego < enviado then
      faltas := faltas || jsonb_build_object(
        'insumo', it->>'insumo', 'enviado', enviado, 'llego', llego);
    end if;
  end loop;

  update public.truck_traslados
     set estado='recibido', recibio=auth.uid(), recibido_en=now(),
         recibido_items = p_recibido,
         faltante = case when jsonb_array_length(faltas) > 0 then faltas else null end
   where id = p_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.rendimiento_medido()
 RETURNS TABLE(producto text, nombre text, tandas integer, rendimiento_medido numeric, rendimiento_cargado numeric, desvio_pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_staff();
  return query (select p.producto, i.nombre, count(*)::int,
         round(avg(p.rendimiento_real), 4),
         cru.rendimiento,
         case when cru.rendimiento > 0
              then round((avg(p.rendimiento_real) - cru.rendimiento) / cru.rendimiento * 100, 1) end
    from public.truck_produccion p
    join public.truck_insumos i on i.id = p.producto
    left join lateral (
      select i2.rendimiento
        from public.truck_recetas_produccion rp
        join public.truck_insumos i2 on i2.id = rp.insumo
       where rp.producto = p.producto
       order by rp.cantidad desc limit 1
    ) cru on true
   where p.estado = 'terminada' and p.rendimiento_real is not null
   group by p.producto, i.nombre, cru.rendimiento);
end
$function$;

CREATE OR REPLACE FUNCTION public.reparto_desempeno(p_desde date DEFAULT (CURRENT_DATE - 7), p_hasta date DEFAULT CURRENT_DATE)
 RETURNS TABLE(repartidor uuid, nombre text, entregas integer, min_cocina numeric, min_camino numeric, min_total numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.exigir_staff();
  return query (select o.repartidor_id, s.name, count(*)::int,
         round(avg(extract(epoch from (o.salio_en - o.created_at)) / 60)::numeric, 1),
         round(avg(extract(epoch from (o.entregado_en - o.salio_en)) / 60)::numeric, 1),
         round(avg(extract(epoch from (o.entregado_en - o.created_at)) / 60)::numeric, 1)
    from public.truck_orders o
    left join public.truck_staff s on s.id = o.repartidor_id
   where o.mode = 'delivery' and o.status = 'entregado'
     and o.entregado_en is not null and o.salio_en is not null
     and o.created_at::date between p_desde and p_hasta
   group by o.repartidor_id, s.name
   order by count(*) desc);
end
$function$;

-- ── Un socio del gimnasio podía fabricar ventas pagadas ────────────────────
-- 0006 cerró este hueco para `anon` ("cualquiera podría inventar ventas de
-- mostrador pagadas e inflar los reportes"). 0008, al permitir que un socio
-- vincule su pedido del Club, lo reabrió para `authenticated` sin replicar
-- ninguna de esas restricciones: `with check (user_id = auth.uid())` y nada más.
--
-- Encadenado con `entregar_pedido` el daño era permanente: insertar un pedido de
-- 400 bowls y marcarlo entregado disparaba el descuento de inventario contra un
-- libro append-only que no se puede borrar. Y `paid=true` en efectivo le cargaba
-- un faltante de caja al cajero del turno.
drop policy if exists "orders socio insert" on public.truck_orders;
create policy "orders socio insert" on public.truck_orders for insert to authenticated
with check (
  user_id = auth.uid()
  and channel = 'app'          -- un socio pide desde la app, no desde el mostrador
  and coalesce(paid, false) = false   -- pagado lo marca quien cobra
  and payment_method is null
  and staff_id is null
  and status = 'recibido'      -- nace al principio del flujo, no al final
);

-- ── Costos y proveedores eran de lectura pública ───────────────────────────
-- `truck_insumos` tenía `select using (true)` de 0010. 0013 le agregó después
-- `costo_unitario` y `proveedor` a esa misma tabla, así que la estructura de
-- costos y la lista de proveedores quedaron legibles por cualquiera.
drop policy if exists "insumos read" on public.truck_insumos;
drop policy if exists "insumos read all" on public.truck_insumos;
drop policy if exists "insumos staff read" on public.truck_insumos;
create policy "insumos staff read" on public.truck_insumos for select to authenticated
using (public.es_staff());

-- ── El repartidor podía reescribir el pedido completo ──────────────────────
-- La política de 0017 solo tenía USING (qué filas puede tocar), sin WITH CHECK
-- (en qué quedan). Sobre un pedido asignado a él podía poner `total = 0`,
-- marcar `paid` en un pedido que cobró en efectivo, o pasarle la entrega tardía
-- a un compañero cambiando `repartidor_id`.
drop policy if exists "orders repartidor update" on public.truck_orders;
create policy "orders repartidor update" on public.truck_orders for update to authenticated
using (
  exists (select 1 from public.truck_staff s
           where s.id = auth.uid() and s.active and s.role = 'repartidor')
  and truck_orders.repartidor_id = auth.uid()
)
with check (
  truck_orders.repartidor_id = auth.uid()
  and truck_orders.status in ('camino', 'entregado')
);

-- ── `status` era texto libre ───────────────────────────────────────────────
-- Un 'Entregado' con mayúscula o un 'entregado ' con espacio no dispara el
-- trigger que descuenta inventario: la venta sale y el libro nunca se entera.
update public.truck_orders set status = lower(trim(status)) where status <> lower(trim(status));
alter table public.truck_orders drop constraint if exists truck_orders_status_check;
alter table public.truck_orders add constraint truck_orders_status_check
  check (status in ('recibido','preparando','listo','camino','entregado','recogido','cancelado'));
