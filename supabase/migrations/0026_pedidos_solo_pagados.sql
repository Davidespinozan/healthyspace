-- ═══════════════════════════════════════════════════════════════════════════
-- UN BOWL SIN PAGAR NO ES UNA COMIDA
--
-- La app del Club auto-registra en el plan de nutrición los pedidos que devuelve
-- `mis_pedidos_truck` (para cumplir "no vuelves a capturar nada"). Pero la RPC
-- devolvía TODOS los pedidos del usuario sin mirar `paid`, así que con solo
-- seleccionar un bowl —sin terminar de pagar— el pedido ya existía (status
-- 'recibido', paid=false) y la comida se marcaba como consumida.
--
-- truck_orders.paid (0005_pos_sales) es la verdad del cobro: "pagado lo marca
-- quien cobra". Aquí filtramos la RPC a solo pedidos pagados → la comida se marca
-- únicamente cuando el bowl SÍ se pagó. Sin cambios en el cliente.
--
-- Idempotente (create or replace). Correr con scripts/migrar.sh.
-- ═══════════════════════════════════════════════════════════════════════════

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
     and coalesce(o.paid, false) = true   -- ← solo lo realmente pagado
   order by o.created_at desc;
$$;

revoke all on function public.mis_pedidos_truck(timestamptz) from public, anon;
grant execute on function public.mis_pedidos_truck(timestamptz) to authenticated;
