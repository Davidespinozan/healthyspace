-- ═══════════════════════════════════════════════════════════════════════════
-- CUATRO ERRORES DE DINERO
--
-- Ninguno de estos rompe nada visiblemente: todos producen un número plausible
-- pero equivocado, que es la clase de error que sobrevive meses.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. El costo promedio se perdía entre dos compras al mismo tiempo ───────
-- `recibir_compra` bloqueaba la fila de la compra, pero leía la existencia y el
-- costo viejo del insumo SIN bloqueo, y después escribía con esos valores.
--
-- Dos compras de aguacate recibidas casi a la vez por dos personas: ambas leen
-- costo 75, la primera escribe 78, la segunda —que todavía trae 75 en la mano—
-- lo sobreescribe ignorando la primera compra. El aguacate queda con el costo
-- mal, y con él el margen de los cinco bowls.
--
-- El `for update` sobre el insumo serializa a la segunda: espera, vuelve a leer
-- el 78 y calcula sobre él.
create or replace function public.recibir_compra(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c record; it jsonb; existencia numeric; costo_viejo numeric; cant numeric; costo_nuevo numeric;
begin
  perform public.exigir_staff();
  select * into c from public.truck_compras where id = p_id for update;
  if c is null then raise exception 'Compra no existe'; end if;
  if c.estado <> 'pendiente' then return; end if;

  for it in select * from jsonb_array_elements(c.items) loop
    cant := (it->>'cantidad')::numeric;
    costo_nuevo := (it->>'costo_unitario')::numeric;

    -- Una compra es una ENTRADA. Una cantidad negativa aquí no es una devolución
    -- —para eso está el movimiento de salida— sino un error de captura, y además
    -- puede dejar `existencia + cant` en cero y reventar la división de abajo.
    if cant is null or cant <= 0 then
      raise exception 'Cantidad inválida en la compra %: %', c.folio, cant;
    end if;
    if costo_nuevo is null or costo_nuevo < 0 then
      raise exception 'Costo inválido en la compra %: %', c.folio, costo_nuevo;
    end if;

    -- El candado va aquí, ANTES de leer: mientras esta transacción no termine,
    -- ninguna otra compra puede leer un costo que está a punto de cambiar.
    select costo_unitario into costo_viejo
      from public.truck_insumos where id = it->>'insumo' for update;

    -- Existencia GLOBAL del insumo (todas las ubicaciones): el costo es del
    -- insumo, no de dónde esté guardado.
    select coalesce(sum(cambio), 0) into existencia
      from public.truck_movimientos where insumo = it->>'insumo';

    insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, staff_id)
    values (c.ubicacion, it->>'insumo', cant, 'compra', c.folio, coalesce(c.staff_id, auth.uid()));

    update public.truck_insumos
       set costo_unitario = case
             when costo_viejo is null or existencia <= 0 then costo_nuevo
             else round(((existencia * costo_viejo) + (cant * costo_nuevo)) / (existencia + cant), 4)
           end,
           costo_actualizado = current_date
     where id = it->>'insumo';
  end loop;

  update public.truck_compras set estado='recibida', recibida_en=now() where id = p_id;
end; $$;

-- ── 2. La caja le cobraba al cajero los pedidos cancelados ────────────────
-- `caja_estado` sumaba todo pedido con `paid` y método efectivo, sin mirar el
-- estado. Un pedido cobrado en efectivo, cancelado y devuelto seguía sumando al
-- esperado: el cajero aparece con un faltante que no cometió, y encima tiene que
-- inventar un motivo para explicarlo.
create or replace function public.caja_estado(p_branch text)
returns table (desde timestamptz, ventas_efectivo numeric, n_pedidos int, ultimo_cierre timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_staff_de(p_branch);
  return query (
    with ult as (
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
      and o.status <> 'cancelado'
      and o.created_at >= coalesce((select t from ult), now() - interval '24 hours')
  );
end $$;

-- ── 3. El arqueo permitía hacer cuadrar el turno a mano ────────────────────
-- El comentario de 0009 dice "no se corrige el número para que cuadre", pero
-- `motivo` solo era obligatorio en la interfaz. Un cajero que se llevó dinero
-- podía mandar el insert sin motivo y el arqueo quedaba mudo. La regla vive
-- ahora en la tabla, donde nadie la puede saltar desde otra pantalla.
update public.truck_cash_closings set motivo = 'sin explicación (registro previo)'
 where diferencia <> 0 and (motivo is null or btrim(motivo) = '');
alter table public.truck_cash_closings drop constraint if exists cierre_explica_diferencia;
alter table public.truck_cash_closings add constraint cierre_explica_diferencia
  check (diferencia = 0 or (motivo is not null and length(btrim(motivo)) >= 3));

-- ── 4. El estado de resultados por remolque no cerraba ─────────────────────
-- Dos problemas distintos en la misma función.
--
-- (a) Los gastos generales (`ubicacion is null`) se sumaban COMPLETOS a cada
--     remolque. Con $60,000 de renta general, los tres P&L por sucursal cargaban
--     $60,000 cada uno: $180,000 contra $60,000 reales. Ahora un P&L de remolque
--     muestra solo sus gastos directos, y los generales aparecen como su propia
--     línea únicamente en la vista de todo el negocio. Nada se pierde y nada se
--     cuenta tres veces.
--     (Repartir los generales entre remolques —a prorrata de ventas o de otra
--     forma— es una decisión de negocio, no algo que deba inventar el sistema.)
--
-- (b) Las Ventas contaban pedidos todavía abiertos, mientras que el Costo de
--     ventas solo cuenta lo que ya se descontó del inventario, cosa que pasa al
--     cerrar el pedido. Ingreso adelantado contra costo atrasado: el margen del
--     día en curso salía inflado siempre. Ahora ambos lados usan el mismo corte
--     —el pedido cerrado— y se mueven juntos.
create or replace function public.estado_resultados(
  p_desde date default date_trunc('month', current_date)::date,
  p_hasta date default current_date,
  p_ubicacion text default null
)
returns table (concepto text, monto numeric, pct_ventas numeric, orden int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  return query (
    with ventas as (
      select coalesce(sum(o.total), 0) as v
        from public.truck_orders o
       where o.status in ('entregado', 'recogido')   -- el mismo corte que el costo
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
         and (case when p_ubicacion is null then true else g.ubicacion = p_ubicacion end)
    ),
    generales as (
      select case when p_ubicacion is null then 0
             else coalesce((select sum(g.monto) from public.truck_gastos g
                             where g.fecha between p_desde and p_hasta
                               and g.ubicacion is null), 0) end as gg
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
      union all select
        case when p_ubicacion is null then 'Gastos de operación' else 'Gastos del remolque' end,
        -(select g from gastos),
        case when (select v from ventas) > 0 then round(-(select g from gastos) / (select v from ventas) * 100, 1) end, 5
      union all select 'Utilidad operativa',
        (select v from ventas) - (select c from consumo) - (select mm from merma) - (select g from gastos),
        case when (select v from ventas) > 0 then
          round(((select v from ventas) - (select c from consumo) - (select mm from merma) - (select g from gastos)) / (select v from ventas) * 100, 1) end, 6
      -- Informativa: existe, pero no es de este remolque, así que no se le resta.
      union all select 'Gastos generales del negocio (no asignados)', -(select gg from generales), null::numeric, 7
    ) t(concepto, monto, pct_ventas, orden)
     where not (t.orden = 7 and (select gg from generales) = 0)
     order by t.orden
  );
end $$;

-- ── 5. Una receta podía apuntar a un platillo inexistente ──────────────────
-- Sin llave foránea, un id mal escrito crea una receta que nunca se aplica y
-- nunca da error: el platillo simplemente no descuenta nada.
delete from public.truck_recetas r
 where not exists (select 1 from public.truck_bowls b where b.id = r.producto);
alter table public.truck_recetas drop constraint if exists truck_recetas_producto_fkey;
alter table public.truck_recetas add constraint truck_recetas_producto_fkey
  foreign key (producto) references public.truck_bowls(id) on delete cascade;
