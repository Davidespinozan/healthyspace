-- ═══════════════════════════════════════════════════════════════════════════
-- BITÁCORA: quién hizo qué.
--
-- En un sistema con dinero e inventario, "el número está mal" es la mitad del
-- problema; la otra mitad es "quién lo cambió y cuándo". Sin bitácora, cada
-- descuadre termina en una conversación de memoria y sospechas.
--
-- Se registra automáticamente por TRIGGER, no desde la app: si dependiera de que
-- cada pantalla se acuerde de escribir, lo primero que se olvidaría es
-- justamente lo que alguien quisiera ocultar.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.truck_bitacora (
  id         bigserial primary key,
  tabla      text not null,
  operacion  text not null check (operacion in ('INSERT','UPDATE','DELETE')),
  registro   text,                 -- id del registro tocado
  actor      uuid,                 -- quién (auth.uid())
  antes      jsonb,
  despues    jsonb,
  cambios    text[],               -- qué columnas cambiaron: lo que se lee primero
  created_at timestamptz not null default now()
);
alter table public.truck_bitacora enable row level security;
create index if not exists bitacora_tabla_idx on public.truck_bitacora (tabla, created_at desc);
create index if not exists bitacora_actor_idx on public.truck_bitacora (actor, created_at desc);

-- Solo admin la lee. Nadie la escribe desde el cliente ni la borra: sin políticas
-- de insert/update/delete, ni el propio admin puede maquillarla.
drop policy if exists "bitacora admin read" on public.truck_bitacora;
create policy "bitacora admin read" on public.truck_bitacora for select to authenticated
using (exists (select 1 from public.truck_staff s
                where s.id = auth.uid() and s.role = 'admin' and s.active));

create or replace function public.trg_bitacora()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_antes jsonb; v_despues jsonb; v_cambios text[]; k text;
begin
  if tg_op = 'DELETE' then
    v_antes := to_jsonb(old); v_despues := null;
  elsif tg_op = 'INSERT' then
    v_antes := null; v_despues := to_jsonb(new);
  else
    v_antes := to_jsonb(old); v_despues := to_jsonb(new);
    -- Qué columnas cambiaron: es lo que se mira primero al investigar algo.
    for k in select jsonb_object_keys(v_despues) loop
      if v_antes->k is distinct from v_despues->k then
        v_cambios := array_append(v_cambios, k);
      end if;
    end loop;
    if v_cambios is null then return new; end if;   -- update que no cambió nada
  end if;

  insert into public.truck_bitacora (tabla, operacion, registro, actor, antes, despues, cambios)
  values (tg_table_name, tg_op,
          coalesce(v_despues->>'id', v_antes->>'id'),
          auth.uid(), v_antes, v_despues, v_cambios);

  return coalesce(new, old);
end; $$;

-- Se vigila lo que mueve dinero, inventario o permisos. No los pedidos del
-- cliente: son miles al día y su historia ya vive en su propio flujo de estados.
do $$
declare t text;
begin
  foreach t in array array[
    'truck_insumos',        -- costos y rendimientos: tocarlos mueve TODO el costeo
    'truck_recetas',        -- cambiar una receta cambia el costo de un platillo
    'truck_cash_closings',  -- arqueos
    'truck_gastos',
    'truck_compras',
    'truck_produccion',
    'truck_traslados',
    'truck_staff',          -- quién tiene qué permisos
    'truck_bowls'           -- precios
  ] loop
    execute format('drop trigger if exists bitacora_trg on public.%I', t);
    execute format(
      'create trigger bitacora_trg after insert or update or delete on public.%I
       for each row execute function public.trg_bitacora()', t);
  end loop;
end $$;

/** Bitácora legible, con el nombre de quien lo hizo. */
create or replace function public.bitacora(
  p_tabla text default null, p_limite int default 100
)
returns table (
  cuando timestamptz, quien text, tabla text, operacion text,
  registro text, cambios text[]
)
language sql stable security definer set search_path = public as $$
  select b.created_at, coalesce(s.name, 'sistema'), b.tabla, b.operacion,
         b.registro, b.cambios
    from public.truck_bitacora b
    left join public.truck_staff s on s.id = b.actor
   where (p_tabla is null or b.tabla = p_tabla)
   order by b.created_at desc
   limit greatest(1, least(p_limite, 500));
$$;
revoke all on function public.bitacora(text, int) from public, anon;
grant execute on function public.bitacora(text, int) to authenticated;
