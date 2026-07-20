-- ═══════════════════════════════════════════════════════════════════════════
-- ENVÍOS A DOMICILIO.
--
-- Hasta ahora un pedido a domicilio solo cambiaba de estado. Faltaba lo que hace
-- operable el reparto: QUIÉN lo lleva, CUÁNDO salió y CUÁNTO tardó.
--
-- Sin el tiempo medido no hay forma de saber si el problema es la cocina o el
-- camino, y esos dos se arreglan de maneras muy distintas.
-- ═══════════════════════════════════════════════════════════════════════════

-- El repartidor es staff, no una tabla aparte: es alguien que entra al sistema,
-- con su sesión y su bitácora, igual que quien atiende el remolque.
alter table public.truck_staff drop constraint if exists truck_staff_role_check;
alter table public.truck_staff add constraint truck_staff_role_check
  check (role in ('pos','admin','almacen','repartidor'));

alter table public.truck_orders
  add column if not exists repartidor_id uuid references auth.users(id),
  add column if not exists salio_en      timestamptz,
  add column if not exists entregado_en  timestamptz,
  add column if not exists direccion_ref text,     -- referencias para encontrar la casa
  add column if not exists tel_contacto  text;

create index if not exists orders_reparto_idx
  on public.truck_orders (repartidor_id, created_at desc)
  where mode = 'delivery';

comment on column public.truck_orders.salio_en is
  'Cuándo salió del remolque. El tiempo de camino es entregado_en − salio_en.';

-- El repartidor solo ve y toca lo que trae asignado.
drop policy if exists "orders repartidor read" on public.truck_orders;
create policy "orders repartidor read" on public.truck_orders for select to authenticated
using (exists (select 1 from public.truck_staff s
                where s.id = auth.uid() and s.active and s.role = 'repartidor')
       and truck_orders.repartidor_id = auth.uid());

drop policy if exists "orders repartidor update" on public.truck_orders;
create policy "orders repartidor update" on public.truck_orders for update to authenticated
using (exists (select 1 from public.truck_staff s
                where s.id = auth.uid() and s.active and s.role = 'repartidor')
       and truck_orders.repartidor_id = auth.uid());

/** Marca que salió del remolque. Idempotente. */
create or replace function public.despachar_pedido(p_id uuid, p_repartidor uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.truck_orders
     set status = 'camino',
         repartidor_id = coalesce(p_repartidor, repartidor_id, auth.uid()),
         salio_en = coalesce(salio_en, now())
   where id = p_id and mode = 'delivery' and status not in ('entregado','cancelado');
end; $$;
revoke all on function public.despachar_pedido(uuid, uuid) from public, anon;
grant execute on function public.despachar_pedido(uuid, uuid) to authenticated;

/** Acusa entrega. El trigger de inventario descuenta al pasar a 'entregado'. */
create or replace function public.entregar_pedido(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.truck_orders
     set status = 'entregado', entregado_en = coalesce(entregado_en, now())
   where id = p_id and mode = 'delivery' and status <> 'cancelado';
end; $$;
revoke all on function public.entregar_pedido(uuid) from public, anon;
grant execute on function public.entregar_pedido(uuid) to authenticated;

/**
 * Desempeño del reparto. Separa el tiempo de COCINA (pedido → salida) del de
 * CAMINO (salida → entrega): son problemas distintos y se arreglan distinto.
 */
create or replace function public.reparto_desempeno(
  p_desde date default current_date - 7,
  p_hasta date default current_date
)
returns table (
  repartidor uuid, nombre text, entregas int,
  min_cocina numeric, min_camino numeric, min_total numeric
)
language sql stable security definer set search_path = public as $$
  select o.repartidor_id, s.name, count(*)::int,
         round(avg(extract(epoch from (o.salio_en - o.created_at)) / 60)::numeric, 1),
         round(avg(extract(epoch from (o.entregado_en - o.salio_en)) / 60)::numeric, 1),
         round(avg(extract(epoch from (o.entregado_en - o.created_at)) / 60)::numeric, 1)
    from public.truck_orders o
    left join public.truck_staff s on s.id = o.repartidor_id
   where o.mode = 'delivery' and o.status = 'entregado'
     and o.entregado_en is not null and o.salio_en is not null
     and o.created_at::date between p_desde and p_hasta
   group by o.repartidor_id, s.name
   order by count(*) desc;
$$;
revoke all on function public.reparto_desempeno(date, date) from public, anon;
grant execute on function public.reparto_desempeno(date, date) to authenticated;
