# Chatbot Feature — Design Spec
**Date:** 2026-05-11
**Project:** Dr Koło — bike repair shop website
**Stack:** React + Vite + Supabase (GitHub Pages) + Vercel (API only)

---

## Overview

A floating Polish-language chatbot widget embedded on all pages of the Dr Koło website. The bot answers questions about services, prices, opening hours, and contact details. When it has gathered enough information about a customer's needs, it proposes to draft an SMS to the shop — customer confirms, bot generates a summary, and a pre-filled `sms:` link appears for the customer to send.

Conversations are stored in Supabase and reviewable/deletable by the admin through a password-protected page in the existing React app.

---

## Architecture

```
GitHub Pages (React SPA)
├── ChatWidget — floating button, rendered in App.tsx (all pages)
│   ├── sessionStorage for sessionId (new session per browser tab)
│   ├── POST /api/chat on Vercel for each message
│   └── SMS button — appears only when bot triggers it
└── /chat-admin — password-protected admin page
    ├── Lists all sessions from Vercel admin API
    └── Delete per session

Vercel Project (API only, no frontend)
├── POST   /api/chat
├── GET    /api/admin/sessions
├── GET    /api/admin/sessions/:id
└── DELETE /api/admin/sessions/:id

Supabase
├── chat_sessions table
└── chat_messages table
```

**Cross-origin:** Vercel API configured with CORS to allow requests from the GitHub Pages domain only.

---

## Data Model (Supabase)

```sql
chat_sessions
├── id              uuid primary key default gen_random_uuid()
├── created_at      timestamptz default now()
└── last_message_at timestamptz

chat_messages
├── id          uuid primary key default gen_random_uuid()
├── session_id  uuid references chat_sessions(id) on delete cascade
├── role        text  -- 'user' | 'assistant'
├── content     text
└── created_at  timestamptz default now()
```

### RLS Policies

All DB access goes through Vercel (service role key). The browser never touches Supabase directly.

RLS is enabled on both tables with **no public policies** — service role bypasses RLS, so no explicit grants are needed. This means even if the Vercel URL were called with the anon key, no data would be accessible or writable.

---

## Vercel API Routes

### `POST /api/chat`

**Request body:**
```json
{
  "sessionId": "uuid-string",
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Logic:**
1. If `sessionId` not in `chat_sessions`, create it.
2. Prepend system prompt to message history.
3. Call DeepSeek API (OpenAI-compatible) with full history.
4. Parse response for `[SMS:treść wiadomości]` marker.
5. Save user message + stripped assistant reply to `chat_messages`.
6. Update `last_message_at` on session.

**Response:**
```json
{
  "reply": "string",
  "smsBody": "string | undefined"
}
```

---

### `GET /api/admin/sessions`

**Header:** `Authorization: Bearer <ADMIN_PASSWORD>`

Returns all sessions ordered by `last_message_at` desc, each with:
- `id`, `created_at`, `last_message_at`
- `message_count` (int)
- `last_preview` (first 80 chars of last user message)

---

### `GET /api/admin/sessions/:id`

**Header:** `Authorization: Bearer <ADMIN_PASSWORD>`

Returns the full message thread for a single session:
- Session metadata
- `messages[]` — all messages ordered by `created_at` asc

---

### `DELETE /api/admin/sessions/:id`

**Header:** `Authorization: Bearer <ADMIN_PASSWORD>`

Deletes the session; cascade deletes all messages via FK constraint.

---

## Vercel Environment Variables

| Variable | Purpose |
|----------|---------|
| `DEEPSEEK_API_KEY` | DeepSeek API auth |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | All DB access (inserts + admin reads/deletes) |
| `ADMIN_PASSWORD` | Protects admin endpoints |
| `ALLOWED_ORIGIN` | GitHub Pages URL for CORS |

---

## System Prompt

Stored in a dedicated file in the Vercel project (`lib/system-prompt.ts`) for easy editing. Contains:

- Shop identity: Dr Koło, Kielnieńska 111, Gdańsk 80-299, +48 511 061 221
- Opening hours: Mon–Fri 10:00–19:00, Sat 10:00–16:00
- Full service list with prices (from Cennik.tsx)
- Instructions: respond in Polish only, be helpful and concise
- SMS instruction: when enough info is gathered about customer needs, proactively propose drafting an SMS. When customer confirms, output the summary in the format `[SMS:treść]` at the end of the reply. The SMS body should be professional and in Polish, summarising the customer's bike type, issue, and any relevant details.

---

## Chat Widget (`ChatWidget.tsx`)

**Placement:** Rendered once in `App.tsx`, outside all routes — appears on every page.

**State:**
- `sessionId: string` — generated on first message, stored in `sessionStorage`
- `messages: {role, content}[]` — full history in React state
- `smsBody: string | null` — set when API returns `smsBody`
- `isOpen: boolean` — panel open/closed
- `isLoading: boolean` — shows typing indicator

**UI elements:**
- Floating button bottom-right, with chat bubble icon
- Panel: ~380px wide, fixed overlay, mobile-friendly
- Header: "Asystent Dr Koło" + close button
- Message list: scrollable, distinct user/bot bubble styles
- Input + send button (disabled while loading)
- Typing indicator while waiting for response
- SMS button: renders only when `smsBody !== null`
  - `<a href="sms:+48511061221?body={encoded smsBody}">Wyślij SMS do serwisu</a>`
  - On desktop: also shows the text to copy manually

---

## Admin Page (`/chat-admin`)

**Auth:** Same `VITE_CREATION_PASSWORD` env var pattern used in existing admin pages. Admin calls Vercel with `Authorization: Bearer <password>`.

**UI:**
- Password gate on mount
- Session list: start time, last activity, message count, last message preview
- Expand session inline to see full conversation thread
- Delete button per session with confirmation

---

## SMS Flow (detailed)

1. Customer chats — bot gathers bike type, problem, relevant details
2. Bot decides it has enough context → proposes in Polish: *"Zebrałem informacje o Twoim problemie. Czy chcesz, żebym przygotował treść SMS do wysłania do serwisu?"*
3. Customer confirms
4. Bot replies with summary + appends `[SMS:Dzień dobry, mam rower MTB...]`
5. Vercel strips `[SMS:...]`, returns `smsBody` field
6. Widget renders SMS button — opens native SMS app on mobile, shows copyable text on desktop
7. `smsBody` persists in state for the rest of the session

---

## Vercel Project Structure

```
chat-api/                     (subfolder in existing drkolo repo)
├── api/
│   ├── chat.ts
│   └── admin/
│       └── sessions/
│           ├── index.ts      (GET all sessions)
│           └── [id].ts       (GET one session, DELETE)
├── lib/
│   ├── supabase.ts
│   └── system-prompt.ts
├── package.json
└── vercel.json
```

The Vercel project lives in a `/chat-api` subfolder of the existing drkolo repo. Vercel is configured to use `chat-api` as the root directory. No second repo needed.

---

## Out of Scope

- User authentication for chatbot visitors (anonymous only)
- Pushing conversations to external CRM
- Multi-language support (Polish only)
- Rate limiting (can be added later via Vercel middleware)
