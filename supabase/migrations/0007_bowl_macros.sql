-- Macros del bowl EN LA BASE. Hasta ahora truck_bowls guardaba solo los ingredientes
-- (ids que viven en el código del food truck), así que el Club no podía calcular nada.
-- Con esto, cualquier app del ecosistema lee los macros sin conocer el banco del truck.
--
-- Esto habilita la sustitución en el plan de nutrición del Club: el usuario cambia una
-- comida por un bowl y el motor reajusta el resto del día contra estos números.
alter table public.truck_bowls
  add column if not exists kcal numeric,
  add column if not exists prot numeric,
  add column if not exists carb numeric,
  add column if not exists fat  numeric;

comment on column public.truck_bowls.kcal is 'Macros de la porción servida. Se calculan desde ING del truck (scripts/bowl-macros.mjs) — NO editar a mano.';
