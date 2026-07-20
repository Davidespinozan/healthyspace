-- ═══════════════════════════════════════════════════════════════════════════
-- VENDER DESCUENTA INVENTARIO.
--
-- Hasta ahora se vendía y el stock no bajaba: el inventario se desfasaba solo con
-- operar, que es la forma más rápida de que nadie vuelva a confiar en él.
--
-- Falta una pieza: la RECETA. Un bowl no es un insumo, es una combinación —
-- 180 g de chamberete + 150 g de arroz + un bowl de papel + cubiertos. Sin eso
-- no hay forma de saber qué descontar.
--
-- CUÁNDO se descuenta: cuando el pedido llega a un estado FINAL (recogido o
-- entregado), no al crearlo. Un pedido cancelado no consumió nada, y descontar
-- al vuelo dejaría el inventario mintiendo cada vez que alguien se arrepiente.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.truck_recetas (
  producto  text not null,                        -- id del bowl (truck_bowls.id)
  insumo    text not null references public.truck_insumos(id),
  cantidad  numeric not null check (cantidad > 0),
  primary key (producto, insumo)
);
alter table public.truck_recetas enable row level security;
drop policy if exists "recetas staff read" on public.truck_recetas;
create policy "recetas staff read" on public.truck_recetas for select to authenticated using (true);
drop policy if exists "recetas admin write" on public.truck_recetas;
create policy "recetas admin write" on public.truck_recetas for all to authenticated
  using (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role='admin' and s.active))
  with check (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role='admin' and s.active));

-- ── Insumos base ────────────────────────────────────────────────────────────
-- ⚠️ Las cantidades son un punto de partida razonable, NO la receta real de
-- cocina. David y Magaly deben ajustarlas: de esto depende que el inventario
-- cuadre con lo que de verdad se gasta.
insert into public.truck_insumos (id, nombre, categoria, unidad, min_alerta, perecedero) values
  ('chamberete',   'Chamberete crudo',        'comida',   'kg', 10, true),
  ('pollo',        'Pollo crudo',             'comida',   'kg', 10, true),
  ('cerdo',        'Cerdo crudo',             'comida',   'kg',  8, true),
  ('arroz',        'Arroz',                   'comida',   'kg', 15, false),
  ('quinoa',       'Quinoa',                  'comida',   'kg',  5, false),
  ('aguacate',     'Aguacate',                'comida',   'kg',  6, true),
  ('verduras-mix', 'Verduras frescas',        'comida',   'kg', 10, true),
  ('hummus',       'Hummus (sub-receta)',     'comida',   'kg',  4, true),
  ('salsa',        'Salsas (sub-receta)',     'comida',   'l',   3, true),
  ('bowl-papel',   'Bowl de papel',           'empaque',  'pz', 200, false),
  ('tapa',         'Tapa para bowl',          'empaque',  'pz', 200, false),
  ('cubiertos',    'Juego de cubiertos',      'empaque',  'pz', 200, false),
  ('bolsa',        'Bolsa para llevar',       'empaque',  'pz', 150, false),
  ('servilletas',  'Servilletas',             'empaque',  'pz', 300, false),
  ('cloro',        'Cloro',                   'limpieza', 'l',   2, false),
  ('jabon',        'Jabón de trastes',        'limpieza', 'l',   2, false),
  ('toallas',      'Toallas de papel',        'limpieza', 'pz',  20, false)
on conflict (id) do nothing;

-- ── Recetas de los 5 bowls ──────────────────────────────────────────────────
-- Empaque igual para todos; la proteína y la base cambian según el bowl.
insert into public.truck_recetas (producto, insumo, cantidad)
select b.id, e.insumo, e.cantidad
  from public.truck_bowls b
  cross join (values
    ('bowl-papel', 1), ('tapa', 1), ('cubiertos', 1), ('servilletas', 2)
  ) as e(insumo, cantidad)
on conflict do nothing;

insert into public.truck_recetas (producto, insumo, cantidad) values
  ('fuego','pollo',0.18),      ('fuego','arroz',0.15),  ('fuego','aguacate',0.05),
  ('fuego','hummus',0.06),     ('fuego','salsa',0.03),  ('fuego','verduras-mix',0.10),
  ('brasa','chamberete',0.18), ('brasa','quinoa',0.14), ('brasa','aguacate',0.05),
  ('brasa','hummus',0.06),     ('brasa','salsa',0.03),  ('brasa','verduras-mix',0.12),
  ('humo','chamberete',0.18),  ('humo','arroz',0.15),   ('humo','aguacate',0.05),
  ('humo','hummus',0.06),      ('humo','salsa',0.03),   ('humo','verduras-mix',0.10),
  ('oro','chamberete',0.18),   ('oro','arroz',0.15),    ('oro','aguacate',0.05),
  ('oro','hummus',0.06),       ('oro','verduras-mix',0.12),
  ('verde','pollo',0.18),      ('verde','quinoa',0.14), ('verde','aguacate',0.05),
  ('verde','hummus',0.06),     ('verde','salsa',0.03),  ('verde','verduras-mix',0.14)
on conflict do nothing;

/**
 * Descuenta del inventario del remolque lo que consumió un pedido.
 * Idempotente: si ya se descontó (hay movimientos con esa referencia), no repite.
 */
create or replace function public.descontar_venta(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o record; it jsonb; bowl_id text; qty numeric;
begin
  select * into o from public.truck_orders where id = p_order;
  if o is null or o.branch is null then return; end if;

  -- Ya descontado → salir. Es lo que hace seguro llamarla desde un trigger.
  if exists (select 1 from public.truck_movimientos
              where referencia = o.code and motivo = 'venta') then return; end if;

  for it in select * from jsonb_array_elements(o.items) loop
    qty := coalesce((it->>'qty')::numeric, 1);
    -- Los renglones guardan el NOMBRE del bowl; se resuelve a su id.
    select b.id into bowl_id from public.truck_bowls b
      where lower(b.name) = lower(coalesce(it->>'name','')) limit 1;
    if bowl_id is null then continue; end if;      -- bebida/extra: sin receta aún

    insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, nota, staff_id)
    select o.branch, r.insumo, -(r.cantidad * qty), 'venta', o.code,
           qty || ' × ' || (it->>'name'), coalesce(o.staff_id, auth.uid())
      from public.truck_recetas r
     where r.producto = bowl_id;
  end loop;
end; $$;

revoke all on function public.descontar_venta(uuid) from public, anon;
grant execute on function public.descontar_venta(uuid) to authenticated;

-- ── El descuento se dispara solo al cerrar el pedido ────────────────────────
-- En trigger y no en la app: si dependiera de que el POS se acuerde de llamarlo,
-- el día que falle la red o alguien cierre desde otra pantalla, el inventario
-- queda mintiendo y nadie se entera.
create or replace function public.trg_descontar_venta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('recogido','entregado')
     and (old.status is distinct from new.status) then
    perform public.descontar_venta(new.id);
  end if;
  return new;
end; $$;

drop trigger if exists descontar_al_cerrar on public.truck_orders;
create trigger descontar_al_cerrar
  after update on public.truck_orders
  for each row execute function public.trg_descontar_venta();
