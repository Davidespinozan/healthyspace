-- ═══════════════════════════════════════════════════════════════════════════
-- SABER QUÉ ESTÁ APLICADO
--
-- Este repo NO está enlazado al CLI de Supabase. Sus migraciones se aplican con
-- `supabase db query --linked -f <archivo>` desde el repo del Club, que sí lo
-- está. Eso funciona, pero `db query` solo EJECUTA: no registra nada. Resultado:
-- de las 24 migraciones de este repo, cero aparecían en ningún lado, y saber qué
-- estaba aplicado dependía de acordarse.
--
-- ¿Por qué no usar `supabase_migrations.schema_migrations`, el historial del CLI?
-- Porque los dos proyectos comparten UNA sola base, y por lo tanto una sola tabla
-- de historial, que le pertenece al repo del Club. Meter ahí versiones tipo
-- `0001` haría que `supabase migration list` del Club reportara dos docenas de
-- migraciones remotas que no tiene en disco. El truck lleva su propia cuenta.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.truck_migraciones (
  archivo     text primary key,
  aplicada_en timestamptz not null default now(),
  nota        text
);

comment on table public.truck_migraciones is
  'Qué migraciones de ~/healthyspace/supabase/migrations ya corrieron. La llena '
  'scripts/migrar.sh — no se edita a mano.';

alter table public.truck_migraciones enable row level security;
drop policy if exists "migraciones admin" on public.truck_migraciones;
create policy "migraciones admin" on public.truck_migraciones for select to authenticated
using (public.es_admin());

-- Las 24 que ya corrieron, incluida ésta. Se registran como aplicadas porque lo
-- están: es la verdad de la base, no una suposición.
insert into public.truck_migraciones (archivo, nota) values
  ('0001_truck_tables.sql',                    'registro retroactivo'),
  ('0002_truck_reservations.sql',              'registro retroactivo'),
  ('0003_ops_staff_branches.sql',              'registro retroactivo'),
  ('0004_truck_bowls.sql',                     'registro retroactivo'),
  ('0005_pos_sales.sql',                       'registro retroactivo'),
  ('0006_lock_anon_orders.sql',                'registro retroactivo'),
  ('0007_bowl_macros.sql',                     'registro retroactivo'),
  ('0008_pedido_vinculado.sql',                'registro retroactivo'),
  ('0009_cierre_caja.sql',                     'registro retroactivo'),
  ('0010_inventario.sql',                      'registro retroactivo'),
  ('0011_traslados_dos_tiempos.sql',           'registro retroactivo'),
  ('0012_recetas_descuento.sql',               'registro retroactivo'),
  ('0013_costeo.sql',                          'registro retroactivo'),
  ('0014_compras_gastos_resultados.sql',       'registro retroactivo'),
  ('0015_produccion.sql',                      'registro retroactivo'),
  ('0016_rendimiento_real.sql',                'registro retroactivo'),
  ('0017_domicilios.sql',                      'registro retroactivo'),
  ('0018_bitacora.sql',                        'registro retroactivo'),
  ('0019_fix_codigo_y_cero.sql',               'registro retroactivo'),
  ('0020_seguridad_y_traslados.sql',           'registro retroactivo'),
  ('0021_dinero_correcto.sql',                 'registro retroactivo'),
  ('0022_estado_no_se_rebobina.sql',           'registro retroactivo'),
  ('0023_recetas_usan_producto_terminado.sql', 'registro retroactivo'),
  ('0024_registro_de_migraciones.sql',         'registro retroactivo')
on conflict (archivo) do nothing;
