-- Capa operativa: sucursales (remolques) + staff con roles + permisos.

-- ── Sucursales ───────────────────────────────────────────────────────────────
create table if not exists public.truck_branches (
  id         text primary key,
  name       text not null,
  address    text,
  hours      text,
  open_hour  int not null default 8,
  close_hour int not null default 22,
  lat        double precision,
  lng        double precision,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.truck_branches enable row level security;
drop policy if exists "branches read all" on public.truck_branches;
create policy "branches read all" on public.truck_branches for select using (true); -- el cliente las lee

insert into public.truck_branches (id, name, address, hours, lat, lng) values
  ('las-quintas',  'Las Quintas',  'Blvd. Pedro Infante 2500, Las Quintas, Culiacán', 'Lun a Dom · 8:00 – 22:00', 24.8069, -107.4108),
  ('tres-rios',    'Tres Ríos',    'Av. Álvaro Obregón, Tres Ríos, Culiacán',          'Lun a Dom · 8:00 – 22:00', 24.8250, -107.4200),
  ('la-primavera', 'La Primavera', 'Blvd. El Dorado, La Primavera, Culiacán',          'Lun a Dom · 8:00 – 22:00', 24.7520, -107.4640)
on conflict (id) do nothing;

-- ── Staff (vincula auth.users → rol + sucursal) ──────────────────────────────
create table if not exists public.truck_staff (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  role       text not null check (role in ('pos','admin','almacen')),
  branch_id  text references public.truck_branches(id),
  active      boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.truck_staff enable row level security;
drop policy if exists "staff read self" on public.truck_staff;
create policy "staff read self" on public.truck_staff for select to authenticated using (id = auth.uid());

-- ── Permisos sobre pedidos para staff ────────────────────────────────────────
-- Admin ve/edita todo; POS y almacén, solo su sucursal.
drop policy if exists "orders staff read" on public.truck_orders;
create policy "orders staff read" on public.truck_orders for select to authenticated
using (exists (select 1 from public.truck_staff s where s.id = auth.uid() and s.active
  and (s.role = 'admin' or s.branch_id = truck_orders.branch)));

drop policy if exists "orders staff update" on public.truck_orders;
create policy "orders staff update" on public.truck_orders for update to authenticated
using (exists (select 1 from public.truck_staff s where s.id = auth.uid() and s.active
  and (s.role = 'admin' or s.branch_id = truck_orders.branch)));

-- Realtime para pedidos en vivo en el POS
alter publication supabase_realtime add table public.truck_orders;
