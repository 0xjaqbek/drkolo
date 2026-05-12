create table if not exists survey_responses (
  id           uuid primary key default gen_random_uuid(),
  answers      jsonb not null,
  submitted_at timestamptz not null default now()
);

alter table survey_responses enable row level security;

create policy "anon_insert_survey" on survey_responses
  for insert with check (true);

create policy "anon_select_survey" on survey_responses
  for select using (true);
