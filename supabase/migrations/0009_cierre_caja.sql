-- ════════════════════════════════════════════════════════════════
-- Cierre de caja (arqueo) por turno y remolque.
--
-- El POS ya registra las ventas con su método de pago; esto cierra el ciclo:
-- al final del turno se cuenta el efectivo y se compara contra lo que DEBERÍA
-- haber. La diferencia se guarda con su motivo — no se corrige el número, se
-- registra el faltante o sobrante. Un arqueo que "cuadra siempre" no sirve.
--
-- Esperado = fondo inicial + ventas en EFECTIVO del turno. Las de tarjeta,
-- transferencia y marketplaces no tocan la caja física.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.truck_cash_closings (
  id            uuid primary key default gen_random_uuid(),
  branch        text not null references public.truck_branches(id),
  staff_id      uuid not null references auth.users(id),
  abierto_desde timestamptz not null,          -- inicio del turno (fin del cierre anterior)
  cerrado_en    timestamptz not null default now(),
  fondo_inicial numeric not null default 0,    -- con cuánto abrió la caja
  esperado      numeric not null,              -- fondo + ventas en efectivo del turno
  contado       numeric not null,              -- lo que de verdad había
  diferencia    numeric generated always as (contado - esperado) stored,
  motivo        text,                          -- obligatorio si hay diferencia
  ventas_efectivo numeric not null default 0,
  n_pedidos     int not null default 0,
  created_at    timestamptz not null default now()
);
alter table public.truck_cash_closings enable row level security;

create index if not exists cash_closings_branch_idx
  on public.truck_cash_closings (branch, cerrado_en desc);

-- El POS ve y cierra SU remolque; admin todos.
drop policy if exists "caja staff read" on public.truck_cash_closings;
create policy "caja staff read" on public.truck_cash_closings for select to authenticated
using (exists (select 1 from public.truck_staff s where s.id = auth.uid() and s.active
  and (s.role = 'admin' or s.branch_id = truck_cash_closings.branch)));

drop policy if exists "caja staff insert" on public.truck_cash_closings;
create policy "caja staff insert" on public.truck_cash_closings for insert to authenticated
with check (exists (select 1 from public.truck_staff s where s.id = auth.uid() and s.active
  and s.role in ('pos','admin')
  and (s.role = 'admin' or s.branch_id = truck_cash_closings.branch)));

-- Nadie edita ni borra un arqueo: es un registro contable. Sin políticas de
-- update/delete, ni el que lo hizo puede maquillarlo después.

/**
 * Qué debería haber en la caja de un remolque ahora mismo.
 * El turno empieza donde terminó el último cierre (o hace 24 h si es el primero).
 */
create or replace function public.caja_estado(p_branch text)
returns table (desde timestamptz, ventas_efectivo numeric, n_pedidos int, ultimo_cierre timestamptz)
language sql stable security definer set search_path = public as $$
  with ult as (
    select max(cerrado_en) as t from public.truck_cash_closings where branch = p_branch
  )
  select
    coalesce((select t from ult), now() - interval '24 hours') as desde,
    coalesce(sum(o.total), 0) as ventas_efectivo,
    count(*)::int as n_pedidos,
    (select t from ult) as ultimo_cierre
  from public.truck_orders o
  where o.branch = p_branch
    and o.payment_method = 'efectivo'
    and o.paid
    and o.created_at >= coalesce((select t from ult), now() - interval '24 hours');
$$;

revoke all on function public.caja_estado(text) from public, anon;
grant execute on function public.caja_estado(text) to authenticated;
