-- Healthy Space (food trucks) — tablas en el MISMO proyecto que Healthy Space Club,
-- namespaced con prefijo `truck_` para NO cruzarse con las tablas de HSC.
-- RLS: el rol anon (app pública) solo puede INSERTAR; no puede leer los pedidos/leads
-- de otros → cero fuga de datos. El panel del truck leerá con service_role / staff autenticado.

-- ── Pedidos ──────────────────────────────────────────────────────────────────
create table if not exists public.truck_orders (
  id         uuid primary key default gen_random_uuid(),
  code       text not null,
  mode       text not null check (mode in ('pickup','delivery')),
  items      jsonb not null,
  subtotal   numeric not null,
  fee        numeric not null default 0,
  total      numeric not null,
  address    text,
  customer   jsonb,
  status     text not null default 'recibido',
  created_at timestamptz not null default now()
);
alter table public.truck_orders enable row level security;
drop policy if exists "truck_orders anon insert" on public.truck_orders;
create policy "truck_orders anon insert" on public.truck_orders
  for insert to anon with check (true);

-- ── Leads (promos) ───────────────────────────────────────────────────────────
create table if not exists public.truck_leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null,
  email      text,
  source     text,
  created_at timestamptz not null default now()
);
alter table public.truck_leads enable row level security;
drop policy if exists "truck_leads anon insert" on public.truck_leads;
create policy "truck_leads anon insert" on public.truck_leads
  for insert to anon with check (true);

-- Índices útiles para el panel
create index if not exists truck_orders_created_idx on public.truck_orders (created_at desc);
create index if not exists truck_leads_created_idx  on public.truck_leads  (created_at desc);
