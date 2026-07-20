-- El rendimiento real es PRODUCIDO ÷ CRUDO CONSUMIDO, no producido ÷ planeado.
-- Lo anterior medía si se cumplió el plan; esto mide lo que de verdad rinde la
-- carne, que es el número comparable contra `insumos.rendimiento` y el que hace
-- que el costeo deje de ser un supuesto.
comment on column public.truck_produccion.rendimiento_real is
  'Producido ÷ crudo consumido. Comparable directo contra truck_insumos.rendimiento.';

create or replace function public.cerrar_produccion(p_id uuid, p_real numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare pr record; ent record; rend numeric; crudo numeric := 0;
begin
  select * into pr from public.truck_produccion where id = p_id for update;
  if pr is null then raise exception 'Producción no existe'; end if;
  if pr.estado = 'terminada' then return pr.rendimiento_real; end if;
  if pr.estado = 'cancelada' then raise exception 'Producción cancelada'; end if;
  if p_real <= 0 then raise exception 'La cantidad producida debe ser mayor a cero'; end if;

  for ent in select * from public.truck_recetas_produccion where producto = pr.producto loop
    insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, nota, staff_id)
    values (pr.origen, ent.insumo, -(ent.cantidad * pr.cantidad_plan), 'produccion', pr.folio,
            'Insumo de ' || pr.folio, coalesce(pr.staff_id, auth.uid()));
    crudo := crudo + (ent.cantidad * pr.cantidad_plan);
  end loop;

  insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, caduca, staff_id)
  values (pr.destino, pr.producto, p_real, 'produccion', pr.folio, pr.caduca,
          coalesce(pr.staff_id, auth.uid()));

  -- Lo que de verdad rindió la materia prima.
  rend := case when crudo > 0 then round(p_real / crudo, 4) end;

  update public.truck_produccion
     set estado='terminada', cantidad_real=p_real, rendimiento_real=rend, cerrada_en=now()
   where id = p_id;

  return rend;
end; $$;

-- El comparativo va contra el rendimiento del INSUMO CRUDO, que es el que se usa
-- para costear. Antes comparaba contra el del terminado, que siempre es 1.
create or replace function public.rendimiento_medido()
returns table (
  producto text, nombre text, tandas int,
  rendimiento_medido numeric, rendimiento_cargado numeric, desvio_pct numeric
)
language sql stable security definer set search_path = public as $$
  select p.producto, i.nombre, count(*)::int,
         round(avg(p.rendimiento_real), 4),
         cru.rendimiento,
         case when cru.rendimiento > 0
              then round((avg(p.rendimiento_real) - cru.rendimiento) / cru.rendimiento * 100, 1) end
    from public.truck_produccion p
    join public.truck_insumos i on i.id = p.producto
    left join lateral (
      select i2.rendimiento
        from public.truck_recetas_produccion rp
        join public.truck_insumos i2 on i2.id = rp.insumo
       where rp.producto = p.producto
       order by rp.cantidad desc limit 1
    ) cru on true
   where p.estado = 'terminada' and p.rendimiento_real is not null
   group by p.producto, i.nombre, cru.rendimiento;
$$;
