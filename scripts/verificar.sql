-- Invariantes del sistema operativo. Todo lo que salga aquí es un problema.
--
-- Se escribió después de romper dos veces los costos reales probando contra la
-- base: los scripts de prueba borraban los movimientos que creaban pero no
-- revertían el `costo_unitario` que dejaban escrito, y el chamberete apareció en
-- $10 en vez de $185. Nada se veía mal — solo los márgenes mentían.
--
-- Correr con:  ./scripts/verificar.sh

select * from (

  -- Un insumo que se usa en una receta pero no tiene costo hace que el costeo de
  -- ese platillo esté incompleto sin decirlo.
  select 'insumo sin costo' as problema,
         i.id as detalle,
         'lo usa una receta pero no tiene costo_unitario' as porque
    from public.truck_insumos i
   where i.activo and i.costo_unitario is null
     and (exists (select 1 from public.truck_recetas r where r.insumo = i.id)
       or exists (select 1 from public.truck_recetas_produccion rp where rp.insumo = i.id))

  union all
  -- Recetas de venta que piden el crudo de algo que se produce: doble descuento.
  select 'receta pide crudo', platillo || ' → ' || pide_crudo,
         'debería pedir ' || deberia_pedir || ': hoy se descuenta dos veces'
    from public.truck_recetas_sospechosas

  union all
  -- Existencia negativa: se consumió más de lo registrado, falta capturar algo.
  select 'existencia negativa', e.ubicacion || ' / ' || e.insumo,
         'hay ' || e.cantidad || ': falta capturar una entrada'
    from public.truck_existencias e where e.cantidad < 0

  union all
  -- Códigos repetidos rompen la idempotencia del descuento de inventario.
  select 'código de pedido repetido', o.code, count(*) || ' pedidos con el mismo código'
    from public.truck_orders o group by o.code having count(*) > 1

  union all
  -- Un arqueo con diferencia y sin explicación es justo el que hay que revisar.
  select 'arqueo sin explicar', c.branch || ' ' || c.cerrado_en::date::text,
         'diferencia de ' || c.diferencia || ' sin motivo'
    from public.truck_cash_closings c
   where c.diferencia <> 0 and (c.motivo is null or btrim(c.motivo) = '')

  union all
  -- Rendimiento fuera de rango: 0 revienta la división del costeo, >1 significa
  -- que rinde más de lo que se compró, que solo es cierto si se costea distinto.
  select 'rendimiento inválido', i.id, 'rendimiento = ' || i.rendimiento
    from public.truck_insumos i
   where i.activo and (i.rendimiento is null or i.rendimiento <= 0 or i.rendimiento > 1)

  union all
  -- Una receta que apunta a un platillo que ya no existe nunca se aplica.
  select 'receta huérfana', r.producto || ' / ' || r.insumo, 'el platillo no existe'
    from public.truck_recetas r
   where not exists (select 1 from public.truck_bowls b where b.id = r.producto)

  union all
  -- Un platillo activo sin receta se vende sin descontar nada del inventario.
  select 'platillo sin receta', b.id, 'se vende pero no descuenta inventario'
    from public.truck_bowls b
   where b.active and not exists (select 1 from public.truck_recetas r where r.producto = b.id)

) t order by problema, detalle;
