create table if not exists page_views (
  id         uuid        primary key default gen_random_uuid(),
  path       text        not null,
  referrer   text,
  session_id uuid        not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table page_views enable row level security;

create policy "anon_insert_page_views" on page_views
  for insert with check (true);

create policy "anon_select_page_views" on page_views
  for select using (true);
