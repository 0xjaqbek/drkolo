-- Tables

create table if not exists zlecenia (
  id uuid primary key default gen_random_uuid(),
  hash text unique not null,
  bike_model text not null,
  customer_phone text not null,
  status text not null default 'oczekuje'
    check (status in ('oczekuje', 'w_trakcie', 'gotowe')),
  created_at timestamptz not null default now()
);

create table if not exists zlecenie_items (
  id uuid primary key default gen_random_uuid(),
  zlecenie_id uuid not null references zlecenia(id) on delete cascade,
  label text not null,
  is_done boolean not null default false,
  done_at timestamptz,
  sort_order int not null default 0
);

create table if not exists zlecenie_updates (
  id uuid primary key default gen_random_uuid(),
  zlecenie_id uuid not null references zlecenia(id) on delete cascade,
  item_id uuid references zlecenie_items(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists update_photos (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references zlecenie_updates(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists service_catalog (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  label text not null,
  is_package boolean not null default false,
  parent_id uuid references service_catalog(id) on delete cascade,
  sort_order int not null default 0
);

-- RLS

alter table zlecenia enable row level security;
alter table zlecenie_items enable row level security;
alter table zlecenie_updates enable row level security;
alter table update_photos enable row level security;
alter table service_catalog enable row level security;

create policy "anon_select_zlecenia" on zlecenia for select using (true);
create policy "anon_insert_zlecenia" on zlecenia for insert with check (true);
create policy "anon_update_zlecenia" on zlecenia for update using (true) with check (true);

create policy "anon_select_items" on zlecenie_items for select using (true);
create policy "anon_insert_items" on zlecenie_items for insert with check (true);
create policy "anon_update_items" on zlecenie_items for update using (true) with check (true);

create policy "anon_select_updates" on zlecenie_updates for select using (true);
create policy "anon_insert_updates" on zlecenie_updates for insert with check (true);

create policy "anon_select_photos" on update_photos for select using (true);
create policy "anon_insert_photos" on update_photos for insert with check (true);

create policy "anon_select_catalog" on service_catalog for select using (true);
