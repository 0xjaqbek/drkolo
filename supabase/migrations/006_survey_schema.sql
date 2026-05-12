create table if not exists survey_responses (
  id           uuid primary key default gen_random_uuid(),
  role         text not null check (role in ('wlasciciel', 'serwisant_1', 'serwisant_2')),
  answers      jsonb not null,
  submitted_at timestamptz not null default now()
);

create unique index if not exists survey_responses_role_idx
  on survey_responses(role);

alter table survey_responses enable row level security;

create policy "anon_insert_survey" on survey_responses
  for insert with check (true);

create policy "anon_select_survey" on survey_responses
  for select using (true);
