-- Venta de mostrador en el POS: de dónde vino el pedido, cómo se pagó y quién lo cobró.
-- El pedido de mostrador usa mode='pickup' (se entrega ahí mismo), así respeta el
-- flujo recibido → preparando → listo → recogido que el POS ya maneja.

alter table public.truck_orders
  add column if not exists channel        text not null default 'app',
  add column if not exists payment_method text,
  add column if not exists paid           boolean not null default false,
  add column if not exists cash_received  numeric,
  add column if not exists staff_id       uuid references auth.users(id);

do $$ begin
  alter table public.truck_orders add constraint truck_orders_channel_chk
    check (channel in ('app', 'mostrador', 'kiosko'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.truck_orders add constraint truck_orders_payment_chk
    check (payment_method is null or payment_method in
      ('efectivo', 'transferencia', 'linea', 'rappi', 'uber', 'didi', 'clip'));
exception when duplicate_object then null; end $$;

-- Reportes de administración: ventas por sucursal, método y día.
create index if not exists truck_orders_branch_created_idx on public.truck_orders (branch, created_at desc);
create index if not exists truck_orders_payment_idx        on public.truck_orders (payment_method);

-- El staff puede registrar ventas: POS solo en SU sucursal, admin en cualquiera.
drop policy if exists "orders staff insert" on public.truck_orders;
create policy "orders staff insert" on public.truck_orders for insert to authenticated
with check (exists (
  select 1 from public.truck_staff s
  where s.id = auth.uid() and s.active
    and s.role in ('pos', 'admin')
    and (s.role = 'admin' or s.branch_id = truck_orders.branch)
));
