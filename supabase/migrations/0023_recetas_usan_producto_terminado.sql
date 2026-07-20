-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUCCIÓN Y RECETAS VIVÍAN EN UNIVERSOS DISTINTOS
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Reparación de datos: costos que ensucié yo ──────────────────────────
-- Al probar el promedio ponderado contra la base real, mis scripts borraban los
-- movimientos que creaban pero NO revertían el `costo_unitario` que dejaban
-- escrito. El chamberete quedó en $10 (real: $185), el pollo en $81.67 (real:
-- $135), y cloro, jabón y toallas —que nunca tuvieron costo— quedaron con uno
-- inventado. Se restauran a los valores de 0013.
update public.truck_insumos set costo_unitario = v.c
  from (values ('chamberete', 185.0), ('pollo', 135.0), ('cerdo', 150.0)) as v(id, c)
 where truck_insumos.id = v.id;

update public.truck_insumos set costo_unitario = null, costo_actualizado = null
 where id in ('cloro', 'jabon', 'toallas');

-- ── 1. El crudo se consumía dos veces ──────────────────────────────────────
-- 0015 creó los insumos terminados (chamberete-braseado, pollo-lento,
-- cerdo-lento) y la función que los produce, pero nunca tocó `truck_recetas`,
-- que seguía apuntando al CRUDO. En cada ciclo real pasaba esto:
--
--   • Cocina cierra una tanda:  −161 kg de chamberete crudo, +100 kg braseado.
--   • Se venden los bowls:      descontar_venta descuenta chamberete CRUDO otra vez.
--
-- El crudo se iba a negativo aceleradamente por la misma carne, y el braseado
-- crecía sin límite porque nada lo consumía nunca. El módulo de producción —el
-- que convierte el costeo de estimación en hecho— no estaba conectado a nada.
--
-- Lo que va en el bowl es carne BRASEADA, no cruda. Así que la receta de venta
-- debe pedir el producto terminado, y el crudo lo consume producción. Cada kilo
-- se descuenta una sola vez, donde de verdad se usa.
update public.truck_recetas set insumo = 'chamberete-braseado'
 where insumo = 'chamberete';
update public.truck_recetas set insumo = 'pollo-lento'
 where insumo = 'pollo';
update public.truck_recetas set insumo = 'cerdo-lento'
 where insumo = 'cerdo';

-- ── 2. Costo del producto terminado ────────────────────────────────────────
-- El terminado ya viene rendido (rendimiento = 1), así que su costo tiene que
-- absorber la merma de cocción: es lo que cuesta el crudo que se necesitó para
-- sacar un kilo. Sale de la receta de producción: 1.613 kg de chamberete crudo
-- por kilo braseado × $185 = $298.41.
--
-- El costo del platillo NO cambia con esto, y no debe cambiar: antes se llegaba
-- al mismo número por el rendimiento (0.18 ÷ 0.62 × $185 = $53.71) y ahora por
-- el costo del terminado (0.18 × $298.41 = $53.71). Lo que cambia es de qué
-- estante sale la carne, que es lo que estaba mal.
update public.truck_insumos i
   set costo_unitario = round(sub.costo, 4),
       costo_actualizado = current_date,
       rendimiento = 1
  from (
    select rp.producto, sum(rp.cantidad * ic.costo_unitario) as costo
      from public.truck_recetas_produccion rp
      join public.truck_insumos ic on ic.id = rp.insumo
     where ic.costo_unitario is not null
     group by rp.producto
  ) sub
 where i.id = sub.producto;

-- ── 3. Que no se vuelva a desconectar en silencio ──────────────────────────
-- Una receta de venta que pide un insumo que se PRODUCE internamente está bien.
-- Una que pide el crudo del que ese producto se hace, no: significa que alguien
-- volvió a saltarse producción. Esta vista lo deja a la vista en vez de que se
-- descubra meses después en un conteo físico.
create or replace view public.truck_recetas_sospechosas as
  select r.producto as platillo,
         r.insumo   as pide_crudo,
         rp.producto as deberia_pedir
    from public.truck_recetas r
    join public.truck_recetas_produccion rp on rp.insumo = r.insumo;

comment on view public.truck_recetas_sospechosas is
  'Recetas de venta que piden un insumo crudo que en realidad se transforma en '
  'producción. Si aquí sale algo, ese insumo se está descontando dos veces: una '
  'al producir y otra al vender. Debe estar vacía.';
