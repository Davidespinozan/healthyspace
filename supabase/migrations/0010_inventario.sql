-- ═══════════════════════════════════════════════════════════════════════════
-- INVENTARIO MULTI-UBICACIÓN — el núcleo del sistema operativo.
--
-- Lo que David describió desde el principio: inventario en los remolques, en los
-- congeladores y en el almacén; producción; traslados entre ubicaciones. Todo
-- centralizado para que administración vea el negocio por remolque y en total.
--
-- DECISIÓN CENTRAL: el stock NO se guarda como un número que se edita. Se deriva
-- de un LIBRO de movimientos append-only. Un número editable no dice quién lo
-- cambió, ni cuándo, ni por qué — y en inventario eso es justo lo que necesitas
-- cuando algo no cuadra. (Patrón de renovacell: inventory_movements + vista.)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Ubicaciones: remolques, almacén y congeladores ──────────────────────────
-- Un congelador vive DENTRO del almacén, por eso hay `padre`: permite ver el
-- total del almacén o el detalle por congelador sin duplicar el modelo.
create table if not exists public.truck_ubicaciones (
  id      text primary key,
  nombre  text not null,
  tipo    text not null check (tipo in ('remolque','almacen','congelador','cocina')),
  padre   text references public.truck_ubicaciones(id),
  activa  boolean not null default true,
  orden   int not null default 0
);
alter table public.truck_ubicaciones enable row level security;
drop policy if exists "ubic staff read" on public.truck_ubicaciones;
create policy "ubic staff read" on public.truck_ubicaciones for select to authenticated using (true);

-- Los remolques ya existen como sucursales: se reflejan aquí con el mismo id
-- para que un traslado remolque↔almacén use un solo vocabulario.
insert into public.truck_ubicaciones (id, nombre, tipo, orden)
select b.id, b.name, 'remolque', row_number() over (order by b.id)
  from public.truck_branches b
on conflict (id) do nothing;

insert into public.truck_ubicaciones (id, nombre, tipo, padre, orden) values
  ('almacen',      'Almacén central',  'almacen',     null,      10),
  ('congelador-1', 'Congelador 1',     'congelador',  'almacen', 11),
  ('congelador-2', 'Congelador 2',     'congelador',  'almacen', 12),
  ('cocina',       'Cocina/producción','cocina',      'almacen', 13)
on conflict (id) do nothing;

-- ── Insumos: TODO lo que se controla ────────────────────────────────────────
-- Las tres familias que pidió David: lo del menú (comida), lo de empacar y lo de
-- limpiar. `merma_pct` sirve para saber qué se echa a perder más.
create table if not exists public.truck_insumos (
  id          text primary key,
  nombre      text not null,
  categoria   text not null check (categoria in ('comida','empaque','limpieza')),
  unidad      text not null default 'pz',      -- kg, l, pz, caja…
  min_alerta  numeric,                         -- por debajo de esto, avisar
  perecedero  boolean not null default false,  -- exige caducidad al entrar
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.truck_insumos enable row level security;
drop policy if exists "insumos staff read" on public.truck_insumos;
create policy "insumos staff read" on public.truck_insumos for select to authenticated using (true);
drop policy if exists "insumos admin write" on public.truck_insumos;
create policy "insumos admin write" on public.truck_insumos for all to authenticated
  using (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role='admin' and s.active))
  with check (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.role='admin' and s.active));

-- ── El LIBRO: append-only, la única verdad del inventario ───────────────────
create table if not exists public.truck_movimientos (
  id          uuid primary key default gen_random_uuid(),
  ubicacion   text not null references public.truck_ubicaciones(id),
  insumo      text not null references public.truck_insumos(id),
  cambio      numeric not null,          -- + entra, − sale. Nunca cero.
  motivo      text not null check (motivo in (
                'compra','produccion','traslado-entrada','traslado-salida',
                'venta','merma','ajuste','conteo')),
  referencia  text,                      -- folio del traslado, pedido, etc.
  caduca      date,
  nota        text,
  staff_id    uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  constraint cambio_no_cero check (cambio <> 0)
);
alter table public.truck_movimientos enable row level security;
create index if not exists mov_ubic_idx on public.truck_movimientos (ubicacion, insumo, created_at desc);
create index if not exists mov_ref_idx  on public.truck_movimientos (referencia);

-- Cada quien registra en SU ubicación; admin en cualquiera.
drop policy if exists "mov staff read" on public.truck_movimientos;
create policy "mov staff read" on public.truck_movimientos for select to authenticated
using (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.active
  and (s.role in ('admin','almacen') or s.branch_id = truck_movimientos.ubicacion)));

drop policy if exists "mov staff insert" on public.truck_movimientos;
create policy "mov staff insert" on public.truck_movimientos for insert to authenticated
with check (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.active
  and (s.role in ('admin','almacen') or s.branch_id = truck_movimientos.ubicacion)));

-- Sin update ni delete: un movimiento equivocado se corrige con OTRO movimiento
-- (un ajuste), no borrando el historial. Así siempre se puede reconstruir.

-- ── Existencias: se DERIVAN del libro ───────────────────────────────────────
create or replace view public.truck_existencias as
  select m.ubicacion, m.insumo, sum(m.cambio) as cantidad,
         max(m.created_at) as ultimo_movimiento
    from public.truck_movimientos m
   group by m.ubicacion, m.insumo
  having sum(m.cambio) <> 0;

/** Existencias con nombre, categoría y si están bajo mínimo. */
create or replace function public.inventario(p_ubicacion text default null)
returns table (
  ubicacion text, ubicacion_nombre text, insumo text, insumo_nombre text,
  categoria text, unidad text, cantidad numeric, min_alerta numeric,
  bajo_minimo boolean, ultimo_movimiento timestamptz
)
language sql stable security definer set search_path = public as $$
  select e.ubicacion, u.nombre, e.insumo, i.nombre, i.categoria, i.unidad,
         e.cantidad, i.min_alerta,
         (i.min_alerta is not null and e.cantidad <= i.min_alerta) as bajo_minimo,
         e.ultimo_movimiento
    from public.truck_existencias e
    join public.truck_ubicaciones u on u.id = e.ubicacion
    join public.truck_insumos i on i.id = e.insumo
   where (p_ubicacion is null or e.ubicacion = p_ubicacion)
     and i.activo
   order by i.categoria, i.nombre;
$$;
revoke all on function public.inventario(text) from public, anon;
grant execute on function public.inventario(text) to authenticated;

-- ── Traslados: mover mercancía entre ubicaciones, con acuse ─────────────────
-- Se registra en DOS tiempos (envía / recibe) a propósito: si saliera y entrara
-- en un solo paso, lo que se pierde en el camino nunca aparecería.
create table if not exists public.truck_traslados (
  id         uuid primary key default gen_random_uuid(),
  folio      text not null unique,
  origen     text not null references public.truck_ubicaciones(id),
  destino    text not null references public.truck_ubicaciones(id),
  estado     text not null default 'solicitado'
             check (estado in ('solicitado','enviado','recibido','cancelado')),
  items      jsonb not null default '[]',   -- [{insumo, cantidad}]
  solicito   uuid references auth.users(id),
  envio      uuid references auth.users(id),
  recibio    uuid references auth.users(id),
  nota       text,
  created_at timestamptz not null default now(),
  enviado_en timestamptz,
  recibido_en timestamptz,
  constraint origen_distinto check (origen <> destino)
);
alter table public.truck_traslados enable row level security;
create index if not exists tras_estado_idx on public.truck_traslados (estado, created_at desc);

drop policy if exists "tras staff read" on public.truck_traslados;
create policy "tras staff read" on public.truck_traslados for select to authenticated
using (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.active
  and (s.role in ('admin','almacen') or s.branch_id in (truck_traslados.origen, truck_traslados.destino))));

drop policy if exists "tras staff write" on public.truck_traslados;
create policy "tras staff write" on public.truck_traslados for all to authenticated
using (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.active
  and (s.role in ('admin','almacen') or s.branch_id in (truck_traslados.origen, truck_traslados.destino))))
with check (exists (select 1 from public.truck_staff s where s.id=auth.uid() and s.active
  and (s.role in ('admin','almacen') or s.branch_id in (truck_traslados.origen, truck_traslados.destino))));

/** Marca un traslado como recibido y ASIENTA los movimientos en un solo golpe:
 *  salida del origen y entrada al destino. Atómico — o pasan las dos o ninguna,
 *  para que nunca exista mercancía que salió y no llegó a ningún lado. */
create or replace function public.recibir_traslado(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t record; it jsonb;
begin
  select * into t from public.truck_traslados where id = p_id for update;
  if t is null then raise exception 'Traslado no existe'; end if;
  if t.estado = 'recibido' then return; end if;          -- idempotente
  if t.estado = 'cancelado' then raise exception 'Traslado cancelado'; end if;

  for it in select * from jsonb_array_elements(t.items) loop
    insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, staff_id)
    values (t.origen,  it->>'insumo', -(it->>'cantidad')::numeric, 'traslado-salida', t.folio, auth.uid()),
           (t.destino, it->>'insumo',  (it->>'cantidad')::numeric, 'traslado-entrada', t.folio, auth.uid());
  end loop;

  update public.truck_traslados
     set estado='recibido', recibio=auth.uid(), recibido_en=now()
   where id = p_id;
end; $$;
revoke all on function public.recibir_traslado(uuid) from public, anon;
grant execute on function public.recibir_traslado(uuid) to authenticated;
