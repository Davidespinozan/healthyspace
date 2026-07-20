-- ════════════════════════════════════════════════════════════════
-- Vincular el pedido del food truck con la cuenta del Club.
--
-- Las dos apps viven en el MISMO proyecto de Supabase, así que "vincular" no
-- necesita inventar nada: es la misma `auth.users`. El cliente del truck sigue
-- pudiendo pedir sin cuenta (anónimo); si además es socio y se identifica, su
-- pedido queda ligado y el Club puede registrarlo solo en su plan.
--
-- Lo que NO se hace: mandar el id del usuario en la URL desde el Club. Eso
-- permitiría que cualquiera se hiciera pasar por otro escribiendo el link a mano.
-- La identidad la pone la sesión, no un parámetro.
-- ════════════════════════════════════════════════════════════════

alter table public.truck_orders
  add column if not exists user_id uuid references auth.users(id);

comment on column public.truck_orders.user_id is
  'Socio del Club que hizo el pedido, si se identificó. NULL = pedido anónimo (lo normal).';

create index if not exists truck_orders_user_idx on public.truck_orders (user_id, created_at desc);

-- El socio identificado puede crear su pedido y verlo. Solo el suyo.
drop policy if exists "orders socio insert" on public.truck_orders;
create policy "orders socio insert" on public.truck_orders for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "orders socio read" on public.truck_orders;
create policy "orders socio read" on public.truck_orders for select to authenticated
using (user_id = auth.uid());

-- Sus pedidos, para que el Club los registre en el plan sin capturar nada a mano.
create or replace function public.mis_pedidos_truck(desde timestamptz default now() - interval '2 days')
returns table (
  id uuid, code text, created_at timestamptz, total numeric,
  items jsonb, status text
)
language sql stable security definer set search_path = public as $$
  select o.id, o.code, o.created_at, o.total, o.items, o.status
    from public.truck_orders o
   where o.user_id = auth.uid()
     and o.created_at >= desde
   order by o.created_at desc;
$$;

revoke all on function public.mis_pedidos_truck(timestamptz) from public, anon;
grant execute on function public.mis_pedidos_truck(timestamptz) to authenticated;
