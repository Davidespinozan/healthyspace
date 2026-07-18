-- Menú editable: bowls en la BD (admin CRUD). El member app los lee con fallback
-- al estático. Precios y "agotado" se manejan sin redeploy.
create table if not exists public.truck_bowls (
  id          text primary key,
  name        text not null,
  tagline     text,
  price       numeric not null,
  img         text,
  accent      text,
  ingredients jsonb not null default '[]',
  active      boolean not null default true,
  sold_out    boolean not null default false,
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);
alter table public.truck_bowls enable row level security;

drop policy if exists "bowls read active" on public.truck_bowls;
create policy "bowls read active" on public.truck_bowls for select using (active = true);

drop policy if exists "bowls admin all" on public.truck_bowls;
create policy "bowls admin all" on public.truck_bowls for all to authenticated
  using (exists (select 1 from public.truck_staff s where s.id = auth.uid() and s.role = 'admin' and s.active))
  with check (exists (select 1 from public.truck_staff s where s.id = auth.uid() and s.role = 'admin' and s.active));

-- Seed desde el menú actual
insert into public.truck_bowls (id, name, tagline, price, img, accent, ingredients, sort) values
  ('fuego', 'Fuego', 'Pollo a las brasas, chipotle ahumado y elote rostizado.', 149, 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/INGREDIENTES%20BOWLS/BOWLS/fuego-bowl.webp', '#C75B3A', '["pollo-lento","arroz-blanco","elote","pico","aguacate","hummus-elote","s-chipotle"]', 1),
  ('brasa', 'Brasa', 'Chamberete braseado, quinoa y frescura de pepino.', 179, 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/INGREDIENTES%20BOWLS/BOWLS/brasa-bowl.webp', '#8A5A2B', '["chamberete","quinoa","pepino","cebolla","aguacate","hummus-chiles","s-cilantro"]', 2),
  ('humo', 'Humo', 'Res deshebrada braseada, ahumada y jugosa.', 175, 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/INGREDIENTES%20BOWLS/BOWLS/humo-bowl.webp', '#7A4A2E', '["chamberete","arroz-integral","aguacate","cebolla","pico","hummus-chiles","s-chipotle"]', 3),
  ('oro', 'Oro', 'Res, camote y hummus de elote. Dulce y dorado.', 179, 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/INGREDIENTES%20BOWLS/BOWLS/oro-bowl.webp', '#BFA065', '["chamberete","arroz-blanco","camote","pico","aguacate","hummus-elote"]', 4),
  ('verde', 'Verde', 'Pollo, brócoli y quinoa. Ligero, nunca poco.', 155, 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/INGREDIENTES%20BOWLS/BOWLS/verde-bowl.webp', '#4E7A45', '["pollo-lento","quinoa","brocoli","pepino","aguacate","hummus-jalapeno","s-cilantro"]', 5)
on conflict (id) do nothing;
