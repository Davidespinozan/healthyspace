-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUCCIÓN: convertir insumos en insumos.
--
-- El almacén no solo guarda: cuece. Entran 100 kg de chamberete CRUDO y salen
-- ~62 kg de chamberete BRASEADO que se congela en porciones. Son dos cosas
-- distintas en el inventario, y hasta ahora el sistema solo conocía una.
--
-- POR QUÉ IMPORTA MÁS DE LO QUE PARECE: cada tanda MIDE el rendimiento real.
-- El 0.62 que cargué era un supuesto de industria; con esto el sistema aprende
-- el rendimiento de la cocina de Healthy Space, con su carne y sus tiempos. Ahí
-- el costeo deja de ser una estimación y pasa a ser un hecho medido.
-- ═══════════════════════════════════════════════════════════════════════════

-- Receta de producción: qué consume una unidad de producto terminado.
create table if not exists public.truck_recetas_produccion (
  producto  text not null references public.truck_insumos(id),   -- lo que SALE
  insumo    text not null references public.truck_insumos(id),   -- lo que ENTRA
  cantidad  numeric not null check (cantidad > 0),               -- por unidad producida
  primary key (producto, insumo)
);
alter table public.truck_recetas_produccion enable row level security;
drop policy if exists "recprod read" on public.truck_recetas_produccion;
create policy "recprod read" on public.truck_recetas_produccion for select to authenticated using (true);
drop policy if exists "recprod write" on public.truck_recetas_produccion;
create policy "recprod write" on public.truck_recetas_produccion for all to authenticated
  using (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role in ('admin','almacen') and s.active))
  with check (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role in ('admin','almacen') and s.active));

create table if not exists public.truck_produccion (
  id             uuid primary key default gen_random_uuid(),
  folio          text not null unique,
  producto       text not null references public.truck_insumos(id),
  cantidad_plan  numeric not null check (cantidad_plan > 0),
  cantidad_real  numeric check (cantidad_real >= 0),
  origen         text not null references public.truck_ubicaciones(id),  -- de dónde salen los crudos
  destino        text not null references public.truck_ubicaciones(id),  -- dónde queda lo producido
  estado         text not null default 'planeada'
                 check (estado in ('planeada','en-proceso','terminada','cancelada')),
  rendimiento_real numeric,     -- se calcula al cerrar: real ÷ esperado
  caduca         date,
  nota           text,
  staff_id       uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  cerrada_en     timestamptz
);
alter table public.truck_produccion enable row level security;
create index if not exists prod_estado_idx on public.truck_produccion (estado, created_at desc);
drop policy if exists "prod staff" on public.truck_produccion;
create policy "prod staff" on public.truck_produccion for all to authenticated
  using (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role in ('admin','almacen') and s.active))
  with check (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role in ('admin','almacen') and s.active));

-- ── Insumos de producto terminado ───────────────────────────────────────────
-- El crudo y el cocido son insumos DISTINTOS: se compran, se guardan y se
-- cuentan por separado. `rendimiento` del terminado es 1 porque ya viene rendido.
insert into public.truck_insumos (id, nombre, categoria, unidad, min_alerta, perecedero, rendimiento) values
  ('chamberete-braseado', 'Chamberete braseado (listo)', 'comida', 'kg', 8, true, 1),
  ('pollo-lento',         'Pollo cocción lenta (listo)', 'comida', 'kg', 8, true, 1),
  ('cerdo-lento',         'Cerdo cocción lenta (listo)', 'comida', 'kg', 6, true, 1)
on conflict (id) do nothing;

-- Cuánto crudo lleva 1 kg de terminado (el inverso del rendimiento esperado).
insert into public.truck_recetas_produccion (producto, insumo, cantidad) values
  ('chamberete-braseado', 'chamberete', 1.613),   -- 1 ÷ 0.62
  ('pollo-lento',         'pollo',      1.389),   -- 1 ÷ 0.72
  ('cerdo-lento',         'cerdo',      1.471)    -- 1 ÷ 0.68
on conflict do nothing;

/**
 * Cierra una tanda: consume los crudos, ingresa lo producido y MIDE el
 * rendimiento real. Idempotente.
 *
 * `p_real` es lo que de verdad salió. Si salió menos de lo planeado, el
 * rendimiento baja y queda registrado — así se detecta si una carne rinde peor
 * o si algo se está haciendo distinto en cocina.
 */
create or replace function public.cerrar_produccion(p_id uuid, p_real numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare pr record; ent record; rend numeric;
begin
  select * into pr from public.truck_produccion where id = p_id for update;
  if pr is null then raise exception 'Producción no existe'; end if;
  if pr.estado = 'terminada' then return pr.rendimiento_real; end if;
  if pr.estado = 'cancelada' then raise exception 'Producción cancelada'; end if;
  if p_real <= 0 then raise exception 'La cantidad producida debe ser mayor a cero'; end if;

  -- Consume los crudos según lo PLANEADO: se metieron a la olla, salga lo que salga.
  for ent in select * from public.truck_recetas_produccion where producto = pr.producto loop
    insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, nota, staff_id)
    values (pr.origen, ent.insumo, -(ent.cantidad * pr.cantidad_plan), 'produccion', pr.folio,
            'Insumo de ' || pr.folio, coalesce(pr.staff_id, auth.uid()));
  end loop;

  -- Ingresa lo que DE VERDAD salió, al destino (normalmente un congelador).
  insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, caduca, staff_id)
  values (pr.destino, pr.producto, p_real, 'produccion', pr.folio, pr.caduca,
          coalesce(pr.staff_id, auth.uid()));

  rend := round(p_real / pr.cantidad_plan, 4);

  update public.truck_produccion
     set estado='terminada', cantidad_real=p_real, rendimiento_real=rend, cerrada_en=now()
   where id = p_id;

  return rend;
end; $$;
revoke all on function public.cerrar_produccion(uuid, numeric) from public, anon;
grant execute on function public.cerrar_produccion(uuid, numeric) to authenticated;

/**
 * Rendimiento MEDIDO por producto: el promedio de las tandas reales.
 * Esto es lo que convierte el costeo de estimación en hecho. Si el medido se
 * separa del cargado, el costo de todos los platillos con ese insumo está mal.
 */
create or replace function public.rendimiento_medido()
returns table (
  producto text, nombre text, tandas int,
  rendimiento_medido numeric, rendimiento_cargado numeric, desvio_pct numeric
)
language sql stable security definer set search_path = public as $$
  select p.producto, i.nombre, count(*)::int,
         round(avg(p.rendimiento_real), 4),
         i.rendimiento,
         case when i.rendimiento > 0
              then round((avg(p.rendimiento_real) - i.rendimiento) / i.rendimiento * 100, 1) end
    from public.truck_produccion p
    join public.truck_insumos i on i.id = p.producto
   where p.estado = 'terminada' and p.rendimiento_real is not null
   group by p.producto, i.nombre, i.rendimiento;
$$;
revoke all on function public.rendimiento_medido() from public, anon;
grant execute on function public.rendimiento_medido() to authenticated;
