-- ═══════════════════════════════════════════════════════════════════════════
-- Traslados en DOS TIEMPOS de verdad.
--
-- La versión anterior decía "dos tiempos" pero asentaba salida y entrada juntas
-- al recibir. Resultado: mientras la mercancía viajaba seguía contada en el
-- origen, y lo que se perdiera en el camino no aparecía — justo lo que se quería
-- evitar.
--
--   enviar   → asienta la SALIDA del origen. Queda "en tránsito".
--   recibir  → asienta la ENTRADA al destino con lo que DE VERDAD llegó.
--
-- Sobre el faltante: si salieron 12 y llegaron 10, el libro YA refleja la
-- pérdida (origen −12, destino +10). Asentar además una merma de 2 la contaría
-- dos veces. Lo que falta no es un movimiento, es SABER por qué — por eso el
-- faltante se guarda en el traslado, que es donde tiene dueño y contexto.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.truck_traslados
  add column if not exists recibido_items jsonb,   -- lo que de verdad llegó
  add column if not exists faltante jsonb;         -- [{insumo, enviado, llego}]

comment on column public.truck_traslados.faltante is
  'Diferencia entre lo enviado y lo recibido. El libro ya refleja la pérdida; esto explica cuál fue.';

/** Marca enviado y descuenta del origen. Idempotente. */
create or replace function public.enviar_traslado(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t record; it jsonb;
begin
  select * into t from public.truck_traslados where id = p_id for update;
  if t is null then raise exception 'Traslado no existe'; end if;
  if t.estado <> 'solicitado' then return; end if;

  for it in select * from jsonb_array_elements(t.items) loop
    insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, staff_id)
    values (t.origen, it->>'insumo', -(it->>'cantidad')::numeric, 'traslado-salida', t.folio, auth.uid());
  end loop;

  update public.truck_traslados
     set estado='enviado', envio=auth.uid(), enviado_en=now()
   where id = p_id;
end; $$;

/**
 * Acusa recibo. `p_recibido` = lo que de verdad llegó ([{insumo, cantidad}]);
 * si va null se asume completo. La diferencia se guarda en `faltante`.
 */
create or replace function public.recibir_traslado(p_id uuid, p_recibido jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare t record; it jsonb; llego numeric; enviado numeric; faltas jsonb := '[]'::jsonb;
begin
  select * into t from public.truck_traslados where id = p_id for update;
  if t is null then raise exception 'Traslado no existe'; end if;
  if t.estado = 'recibido' then return; end if;                 -- idempotente
  if t.estado = 'cancelado' then raise exception 'Traslado cancelado'; end if;
  -- Si nunca se marcó enviado, se asienta la salida ahora para no perder la pata.
  if t.estado = 'solicitado' then perform public.enviar_traslado(p_id); end if;

  for it in select * from jsonb_array_elements(t.items) loop
    enviado := (it->>'cantidad')::numeric;
    llego := coalesce(
      (select (x->>'cantidad')::numeric
         from jsonb_array_elements(coalesce(p_recibido, '[]'::jsonb)) x
        where x->>'insumo' = it->>'insumo'),
      enviado);

    if llego > 0 then
      insert into public.truck_movimientos (ubicacion, insumo, cambio, motivo, referencia, staff_id)
      values (t.destino, it->>'insumo', llego, 'traslado-entrada', t.folio, auth.uid());
    end if;

    if llego < enviado then
      faltas := faltas || jsonb_build_object(
        'insumo', it->>'insumo', 'enviado', enviado, 'llego', llego);
    end if;
  end loop;

  update public.truck_traslados
     set estado='recibido', recibio=auth.uid(), recibido_en=now(),
         recibido_items = p_recibido,
         faltante = case when jsonb_array_length(faltas) > 0 then faltas else null end
   where id = p_id;
end; $$;

revoke all on function public.enviar_traslado(uuid) from public, anon;
grant execute on function public.enviar_traslado(uuid) to authenticated;
revoke all on function public.recibir_traslado(uuid, jsonb) from public, anon;
grant execute on function public.recibir_traslado(uuid, jsonb) to authenticated;

/** Lo que va en camino: salió y no ha llegado. El hueco que antes no existía. */
create or replace function public.en_transito()
returns table (id uuid, folio text, origen text, destino text,
               enviado_en timestamptz, items jsonb, horas numeric)
language sql stable security definer set search_path = public as $$
  select t.id, t.folio, t.origen, t.destino, t.enviado_en, t.items,
         round(extract(epoch from (now() - t.enviado_en)) / 3600, 1)
    from public.truck_traslados t
   where t.estado = 'enviado'
   order by t.enviado_en;
$$;
revoke all on function public.en_transito() from public, anon;
grant execute on function public.en_transito() to authenticated;
