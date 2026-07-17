-- Reservas de paquetes semanales (validación de demanda). Mismo patrón: anon solo
-- INSERTA, no lee. El equipo las revisa con service_role / panel.
create table if not exists public.truck_reservations (
  id         uuid primary key default gen_random_uuid(),
  package    int not null,               -- 5 o 10 bowls
  sealed     boolean not null default true,
  name       text not null,
  phone      text not null,
  notes      text,
  created_at timestamptz not null default now()
);
alter table public.truck_reservations enable row level security;
drop policy if exists "truck_reservations anon insert" on public.truck_reservations;
create policy "truck_reservations anon insert" on public.truck_reservations
  for insert to anon with check (true);
create index if not exists truck_reservations_created_idx on public.truck_reservations (created_at desc);
