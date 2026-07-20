-- ═══════════════════════════════════════════════════════════════════════════
-- LA CAPA DE DINERO: compras, gastos y estado de resultados.
--
-- Hasta aquí el sistema sabía qué se vende y qué se consume. No sabía si el
-- negocio GANA. Eso necesita tres cosas que faltaban:
--
--   1. COMPRAS que actualicen el costo solas. Un costo tecleado a mano se queda
--      viejo en un mes y todo el costeo se vuelve ficción.
--   2. GASTOS que no son inventario (renta, nómina, luz, gas).
--   3. Un ESTADO DE RESULTADOS que junte las tres cosas.
--
-- COSTO PROMEDIO PONDERADO: al entrar mercancía nueva a otro precio, el costo del
-- insumo se recalcula pesando lo que ya había contra lo que llega:
--
--   nuevo = (existencia × costo_actual + cantidad × costo_compra)
--           ÷ (existencia + cantidad)
--
-- Se usa este método y no "el último precio" porque el último precio hace saltar
-- el costo de todos los platillos por una compra chica de emergencia, y eso
-- distorsiona las decisiones de menú.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Proveedores ─────────────────────────────────────────────────────────────
create table if not exists public.truck_proveedores (
  id         text primary key,
  nombre     text not null,
  contacto   text,
  telefono   text,
  nota       text,
  activo     boolean not null default true
);
alter table public.truck_proveedores enable row level security;
drop policy if exists "prov staff read" on public.truck_proveedores;
create policy "prov staff read" on public.truck_proveedores for select to authenticated using (true);
drop policy if exists "prov admin write" on public.truck_proveedores;
create policy "prov admin write" on public.truck_proveedores for all to authenticated
  using (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role in ('admin','almacen') and s.active))
  with check (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role in ('admin','almacen') and s.active));

-- ── Compras ─────────────────────────────────────────────────────────────────
create table if not exists public.truck_compras (
  id          uuid primary key default gen_random_uuid(),
  folio       text not null unique,
  proveedor   text references public.truck_proveedores(id),
  ubicacion   text not null references public.truck_ubicaciones(id),
  items       jsonb not null,      -- [{insumo, cantidad, costo_unitario}]
  total       numeric not null default 0,
  estado      text not null default 'pendiente' check (estado in ('pendiente','recibida','cancelada')),
  pagada      boolean not null default false,
  factura     text,
  staff_id    uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  recibida_en timestamptz
);
alter table public.truck_compras enable row level security;
create index if not exists compras_fecha_idx on public.truck_compras (created_at desc);
drop policy if exists "compras staff" on public.truck_compras;
create policy "compras staff" on public.truck_compras for all to authenticated
  using (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role in ('admin','almacen') and s.active))
  with check (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role in ('admin','almacen') and s.active));

/**
 * Recibe una compra: asienta las entradas y RECALCULA el costo promedio ponderado
 * de cada insumo. Idempotente.
 */
create or replace function public.recibir_compra(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c record; it jsonb; existencia numeric; costo_viejo numeric; cant numeric; costo_nuevo numeric;
begin
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
end; $$;
revoke all on function public.recibir_compra(uuid) from public, anon;
grant execute on function public.recibir_compra(uuid) to authenticated;

-- ── Gastos que no son inventario ────────────────────────────────────────────
create table if not exists public.truck_gastos (
  id         uuid primary key default gen_random_uuid(),
  fecha      date not null default current_date,
  categoria  text not null check (categoria in
             ('renta','nomina','servicios','combustible','mantenimiento',
              'marketing','comisiones','impuestos','otros')),
  concepto   text not null,
  monto      numeric not null check (monto > 0),
  ubicacion  text references public.truck_ubicaciones(id),  -- null = general
  factura    text,
  staff_id   uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.truck_gastos enable row level security;
create index if not exists gastos_fecha_idx on public.truck_gastos (fecha desc);
drop policy if exists "gastos admin" on public.truck_gastos;
create policy "gastos admin" on public.truck_gastos for all to authenticated
  using (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role='admin' and s.active))
  with check (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role='admin' and s.active));

/**
 * ESTADO DE RESULTADOS del periodo.
 *
 * El costo de ventas NO se estima con un porcentaje: se valúa el consumo REAL
 * registrado en el libro (motivo 'venta') al costo de cada insumo. La merma va
 * aparte a propósito — mezclarla con el costo de ventas esconde justo el número
 * que más conviene vigilar.
 */
create or replace function public.estado_resultados(
  p_desde date default date_trunc('month', current_date)::date,
  p_hasta date default current_date,
  p_ubicacion text default null
)
returns table (
  concepto text, monto numeric, pct_ventas numeric, orden int
)
language sql stable security definer set search_path = public as $$
  with ventas as (
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
  order by orden;
$$;
revoke all on function public.estado_resultados(date, date, text) from public, anon;
grant execute on function public.estado_resultados(date, date, text) to authenticated;

/** Gastos agrupados por categoría, para ver a dónde se va el dinero. */
create or replace function public.gastos_por_categoria(
  p_desde date default date_trunc('month', current_date)::date,
  p_hasta date default current_date
)
returns table (categoria text, monto numeric, n int)
language sql stable security definer set search_path = public as $$
  select g.categoria, sum(g.monto), count(*)::int
    from public.truck_gastos g
   where g.fecha between p_desde and p_hasta
   group by g.categoria order by sum(g.monto) desc;
$$;
revoke all on function public.gastos_por_categoria(date, date) from public, anon;
grant execute on function public.gastos_por_categoria(date, date) to authenticated;
