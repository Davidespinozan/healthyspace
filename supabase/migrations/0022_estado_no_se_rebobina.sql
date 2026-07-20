-- ═══════════════════════════════════════════════════════════════════════════
-- LA IDEMPOTENCIA ERA DECORATIVA
--
-- `recibir_compra`, `enviar_traslado`, `recibir_traslado` y `cerrar_produccion`
-- evitan repetirse leyendo `estado` y saliendo temprano si el trabajo ya se hizo.
-- Pero `estado` es una columna común y corriente, y las políticas de estas tres
-- tablas son `for all` sin restricción de columnas: el mismo usuario que llama a
-- la función puede escribirla por PostgREST.
--
-- Probado contra la base: el encargado de almacén recibe una compra de 50 kg,
-- hace `update truck_compras set estado='pendiente'`, la vuelve a recibir, y
-- quedan 100 kg en el libro sobre una compra de 50 — con el costo promedio
-- ponderado contaminado dos veces. Lo mismo con traslados (doble salida del
-- origen) y con producción.
--
-- El candado no puede vivir en la función que se está saltando. Vive aquí.
-- ═══════════════════════════════════════════════════════════════════════════

/**
 * Impide, DESDE EL CLIENTE, que una fila salga de un estado terminal.
 *
 * El discriminante es `current_user`: PostgREST ejecuta como `authenticated`,
 * mientras que las funciones SECURITY DEFINER corren como dueño de la tabla. Así
 * que las funciones siguen pudiendo hacer su trabajo y nadie puede rebobinar el
 * estado a mano por la puerta de atrás.
 *
 * Esta función NO puede ser SECURITY DEFINER: si lo fuera, `current_user` dentro
 * del trigger sería siempre el dueño y la comparación no distinguiría nada.
 * Corre con el rol de quien está escribiendo, que es justo lo que hay que leer.
 *
 * No bloquea cancelar ni avanzar: solo el regreso desde el punto en que ya se
 * asentaron movimientos en el libro, que es exactamente lo que no se puede
 * deshacer sin dejar rastro.
 */
create or replace function public.trg_estado_no_rebobina()
returns trigger language plpgsql set search_path = public as $$
declare terminales text[];
begin
  if new.estado is not distinct from old.estado then return new; end if;
  if current_user <> 'authenticated' then return new; end if;   -- viene de una función

  terminales := case tg_table_name
    when 'truck_compras'    then array['recibida']
    when 'truck_traslados'  then array['enviado', 'recibido']
    when 'truck_produccion' then array['terminada']
    else array[]::text[]
  end;

  if old.estado = any (terminales) then
    raise exception
      'No se puede regresar % de "%" a "%": ya hay movimientos asentados en el inventario. Corrige con un movimiento nuevo, no rebobinando el estado.',
      tg_table_name, old.estado, new.estado
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists estado_no_rebobina on public.truck_compras;
create trigger estado_no_rebobina before update on public.truck_compras
  for each row execute function public.trg_estado_no_rebobina();

drop trigger if exists estado_no_rebobina on public.truck_traslados;
create trigger estado_no_rebobina before update on public.truck_traslados
  for each row execute function public.trg_estado_no_rebobina();

drop trigger if exists estado_no_rebobina on public.truck_produccion;
create trigger estado_no_rebobina before update on public.truck_produccion
  for each row execute function public.trg_estado_no_rebobina();
