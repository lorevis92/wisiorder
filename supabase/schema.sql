-- =====================================================================
-- WisiOrder — schema Supabase (multi-tenant, solo-ordine)
-- Esegui tutto nel SQL Editor di Supabase.
-- Progetto condiviso WiSiVERSE: tutte le tabelle sono prefissate dal
-- restaurant_id e isolate via RLS, quindi convivono con gli altri progetti.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- TABELLE ----------

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  primary_color text default '#E8352A',
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  photo_url text,
  is_available boolean not null default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_number int,
  table_number text,
  customer_name text not null,
  status text not null default 'received',  -- received | preparing | ready | completed
  total numeric(10,2) default 0,
  created_at timestamptz default now(),
  ready_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,      -- snapshot al momento dell'ordine
  quantity int not null,
  unit_price numeric(10,2) not null,  -- snapshot prezzo
  note text
);

create index if not exists idx_menu_items_restaurant on public.menu_items(restaurant_id);
create index if not exists idx_orders_restaurant_status on public.orders(restaurant_id, status);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- ---------- RLS ----------

alter table public.restaurants    enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items     enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;

-- RESTAURANTS: lettura pubblica (serve al menu white-label + join stato ordine)
drop policy if exists "restaurants public read" on public.restaurants;
create policy "restaurants public read" on public.restaurants
  for select using (true);

drop policy if exists "restaurants owner insert" on public.restaurants;
create policy "restaurants owner insert" on public.restaurants
  for insert with check (owner_user_id = auth.uid());

drop policy if exists "restaurants owner update" on public.restaurants;
create policy "restaurants owner update" on public.restaurants
  for update using (owner_user_id = auth.uid());

drop policy if exists "restaurants owner delete" on public.restaurants;
create policy "restaurants owner delete" on public.restaurants
  for delete using (owner_user_id = auth.uid());

-- MENU CATEGORIES: lettura pubblica, scrittura solo proprietario
drop policy if exists "categories public read" on public.menu_categories;
create policy "categories public read" on public.menu_categories
  for select using (true);

drop policy if exists "categories owner write" on public.menu_categories;
create policy "categories owner write" on public.menu_categories
  for all using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_user_id = auth.uid())
  );

-- MENU ITEMS: lettura pubblica, scrittura solo proprietario
drop policy if exists "items public read" on public.menu_items;
create policy "items public read" on public.menu_items
  for select using (true);

drop policy if exists "items owner write" on public.menu_items;
create policy "items owner write" on public.menu_items
  for all using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_user_id = auth.uid())
  );

-- ORDERS: lettura pubblica (id UUID non indovinabile, serve a realtime cliente),
-- update solo proprietario. L'inserimento avviene via RPC place_order.
drop policy if exists "orders public read" on public.orders;
create policy "orders public read" on public.orders
  for select using (true);

drop policy if exists "orders owner update" on public.orders;
create policy "orders owner update" on public.orders
  for update using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_user_id = auth.uid())
  );

-- ORDER ITEMS: lettura pubblica (status + dashboard). Insert via RPC.
drop policy if exists "order_items public read" on public.order_items;
create policy "order_items public read" on public.order_items
  for select using (true);

-- ---------- RPC: place_order (atomico, prezzi validati lato server) ----------

create or replace function public.place_order(
  p_restaurant_id uuid,
  p_customer_name text,
  p_table_number text,
  p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_menu record;
  v_total numeric(10,2) := 0;
  v_qty int;
  v_num int;
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'Nome cliente obbligatorio';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Ordine vuoto';
  end if;
  if not exists (select 1 from restaurants where id = p_restaurant_id) then
    raise exception 'Ristorante inesistente';
  end if;

  -- numero ordine progressivo per ristorante, resettato ogni giorno
  select coalesce(max(order_number), 0) + 1 into v_num
  from orders
  where restaurant_id = p_restaurant_id and created_at >= date_trunc('day', now());

  insert into orders (restaurant_id, order_number, table_number, customer_name, status, total)
  values (p_restaurant_id, v_num, nullif(trim(coalesce(p_table_number,'')),''), trim(p_customer_name), 'received', 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    select id, name, price, is_available into v_menu
    from menu_items
    where id = (v_item->>'menu_item_id')::uuid and restaurant_id = p_restaurant_id;

    if v_menu.id is null or v_menu.is_available = false then
      continue;  -- salta item non valido o esaurito
    end if;

    insert into order_items (order_id, menu_item_id, item_name, quantity, unit_price, note)
    values (v_order_id, v_menu.id, v_menu.name, v_qty, v_menu.price,
            nullif(trim(coalesce(v_item->>'note','')), ''));

    v_total := v_total + v_menu.price * v_qty;
  end loop;

  update orders set total = v_total where id = v_order_id;
  return v_order_id;
end;
$$;

grant execute on function public.place_order(uuid, text, text, jsonb) to anon, authenticated;

-- ---------- STORAGE: bucket foto menu + loghi ----------

insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do nothing;

drop policy if exists "menu photos public read" on storage.objects;
create policy "menu photos public read" on storage.objects
  for select using (bucket_id = 'menu-photos');

drop policy if exists "menu photos owner insert" on storage.objects;
create policy "menu photos owner insert" on storage.objects
  for insert with check (
    bucket_id = 'menu-photos'
    and (storage.foldername(name))[1] in (select id::text from public.restaurants where owner_user_id = auth.uid())
  );

drop policy if exists "menu photos owner update" on storage.objects;
create policy "menu photos owner update" on storage.objects
  for update using (
    bucket_id = 'menu-photos'
    and (storage.foldername(name))[1] in (select id::text from public.restaurants where owner_user_id = auth.uid())
  );

drop policy if exists "menu photos owner delete" on storage.objects;
create policy "menu photos owner delete" on storage.objects
  for delete using (
    bucket_id = 'menu-photos'
    and (storage.foldername(name))[1] in (select id::text from public.restaurants where owner_user_id = auth.uid())
  );

-- ---------- REALTIME ----------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- Fine schema.
