-- ═══════════════════════════════════════════════════════════════════════════
-- COSTEO UNITARIO — metodología para saber cuánto cuesta de verdad cada bowl.
--
-- EL ERROR QUE ESTO CORRIGE: la receta decía "180 g de chamberete", pero eso es
-- lo que va SERVIDO en el bowl. Del inventario sale más, porque:
--   · el chamberete pierde ~35% de peso al brasearse
--   · el aguacate trae hueso y cáscara (se aprovecha ~70%)
--   · la verdura se merma al limpiarla
--
-- Si se descuenta lo servido en vez de lo bruto, pasan dos cosas malas a la vez:
-- el inventario queda largo (parece que hay más de lo que hay) y el costo del
-- platillo sale barato (parece que ganas más de lo que ganas).
--
-- MÉTODO:
--   rendimiento = peso aprovechable ÷ peso comprado     (se MIDE en cocina)
--   bruto       = servido ÷ rendimiento                  (lo que sale del inventario)
--   costo       = bruto × costo por unidad comprada
--
-- Cómo medir el rendimiento (una vez por insumo, se reconfirma cada trimestre o
-- al cambiar de proveedor):
--   1. Pesa la pieza como llega.            → peso_comprado
--   2. Límpiala/cuécela como en operación.  → peso_aprovechable
--   3. rendimiento = aprovechable ÷ comprado
--   Repetir 3 veces y promediar: una sola medición arrastra el error del día.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.truck_insumos
  add column if not exists costo_unitario numeric,      -- $ por unidad COMPRADA
  add column if not exists rendimiento numeric not null default 1
    check (rendimiento > 0 and rendimiento <= 1),
  add column if not exists proveedor text,
  add column if not exists costo_actualizado date;

comment on column public.truck_insumos.costo_unitario is
  '$ por unidad tal como se COMPRA (kg de carne cruda, pieza de bowl). No el costo servido.';
comment on column public.truck_insumos.rendimiento is
  'Aprovechable ÷ comprado. 1 = no se pierde nada (empaque). 0.65 = se pierde 35% al cocer/limpiar.';

-- La receta ahora dice explícitamente que la cantidad es la SERVIDA.
comment on column public.truck_recetas.cantidad is
  'Lo que va SERVIDO en el platillo. Lo que sale del inventario es cantidad ÷ rendimiento.';

-- ── Rendimientos y costos de arranque ───────────────────────────────────────
-- ⚠️ MEDIR EN COCINA. Estos son valores de referencia de industria para poder
-- operar desde hoy, no la realidad de Healthy Space.
update public.truck_insumos set rendimiento = v.r, costo_unitario = v.c
  from (values
    ('chamberete',   0.62, 185.0),   -- braseado 8 h: pierde ~38%
    ('pollo',        0.72, 135.0),   -- cocción lenta
    ('cerdo',        0.68, 150.0),
    ('arroz',        1.00,  32.0),   -- se compra crudo y rinde MÁS, se costea crudo
    ('quinoa',       1.00,  95.0),
    ('aguacate',     0.68,  75.0),   -- hueso y cáscara
    ('verduras-mix', 0.85,  38.0),   -- merma de limpieza
    ('hummus',       1.00, 110.0),   -- sub-receta ya rendida
    ('salsa',        1.00,  85.0),
    ('bowl-papel',   1.00,   4.50),
    ('tapa',         1.00,   2.20),
    ('cubiertos',    1.00,   1.80),
    ('bolsa',        1.00,   1.20),
    ('servilletas',  1.00,   0.25)
  ) as v(id, r, c)
 where truck_insumos.id = v.id;

/**
 * Costo unitario de cada platillo, desglosado.
 * `bruto` es lo que de verdad sale del inventario; `costo` sale de ahí.
 */
create or replace view public.truck_costo_detalle as
  select r.producto,
         i.id as insumo, i.nombre as insumo_nombre, i.categoria, i.unidad,
         r.cantidad as servido,
         round(r.cantidad / i.rendimiento, 4) as bruto,
         i.rendimiento,
         i.costo_unitario,
         round((r.cantidad / i.rendimiento) * coalesce(i.costo_unitario, 0), 4) as costo
    from public.truck_recetas r
    join public.truck_insumos i on i.id = r.insumo;

/**
 * Costo, precio y margen por bowl. Es la tabla que decide si un platillo se queda
 * en el menú: un bowl que se vende mucho con 45% de food cost puede estar
 * costándote dinero comparado con otro que vende menos.
 */
create or replace function public.costeo_platillos()
returns table (
  producto text, nombre text, precio numeric,
  costo_comida numeric, costo_empaque numeric, costo_total numeric,
  margen numeric, food_cost_pct numeric, sin_costo int
)
language sql stable security definer set search_path = public as $$
  select b.id, b.name, b.price,
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
   order by b.sort;
$$;
revoke all on function public.costeo_platillos() from public, anon;
grant execute on function public.costeo_platillos() to authenticated;

/** Desglose de un platillo, para ver de dónde sale el costo. */
create or replace function public.costeo_detalle(p_producto text)
returns table (
  insumo_nombre text, categoria text, unidad text,
  servido numeric, rendimiento numeric, bruto numeric,
  costo_unitario numeric, costo numeric, pct numeric
)
language sql stable security definer set search_path = public as $$
  with d as (select * from public.truck_costo_detalle where producto = p_producto),
       t as (select nullif(sum(costo), 0) as total from d)
  select d.insumo_nombre, d.categoria, d.unidad, d.servido, d.rendimiento, d.bruto,
         d.costo_unitario, d.costo,
         round(d.costo / (select total from t) * 100, 1)
    from d order by d.costo desc;
$$;
revoke all on function public.costeo_detalle(text) from public, anon;
grant execute on function public.costeo_detalle(text) to authenticated;

-- ── El descuento de inventario ahora usa el BRUTO ───────────────────────────
-- Antes descontaba lo servido, así que el inventario quedaba largo: parecía que
-- había más carne de la que de verdad quedaba.
create or replace function public.descontar_venta(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o record; it jsonb; bowl_id text; qty numeric;
begin
  select * into o from public.truck_orders where id = p_order;
  if o is null or o.branch is null then return; end if;
  if exists (select 1 from public.truck_movimientos
              where referencia = o.code and motivo = 'venta') then return; end if;

  for it in select * from jsonb_array_elements(o.items) loop
    qty := coalesce((it->>'qty')::numeric, 1);
    select b.id into bowl_id from public.truck_bowls b
      where lower(b.name) = lower(coalesce(it->>'name','')) limit 1;
    if bowl_id is null then continue; end if;

    insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, nota, staff_id)
    select o.branch, d.insumo, -(d.bruto * qty), 'venta', o.code,
           qty || ' × ' || (it->>'name'), coalesce(o.staff_id, auth.uid())
      from public.truck_costo_detalle d
     where d.producto = bowl_id;
  end loop;
end; $$;
