create table if not exists chat_sessions (
  id              uuid primary key,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references chat_sessions(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

create index if not exists chat_messages_session_id_idx
  on chat_messages(session_id);
create index if not exists chat_sessions_last_message_idx
  on chat_sessions(last_message_at desc nulls last);
