# Chatbot Booking Integration

**Date:** 2026-07-05
**Status:** Approved

## Problem

The chatbot currently only generates SMS text for the customer to send manually. This means:
- On desktop, customers can't easily send the SMS — the booking may be lost
- Inquiries from the chatbot never appear in the admin calendar
- The service has no way to proactively contact the customer

## Solution

Extend the chatbot to collect all required booking data during conversation, save the inquiry to `service_appointments` via the existing Supabase `/appointments` edge function, and adapt the confirmation UX based on device type (mobile vs desktop).

## Data Flow

```
Customer → ChatWidget → chat API (Vercel/DeepSeek)
                               ↓ AI generates [BOOKING:json]
                               ↓ parse-booking extracts data
                               ↓ POST to Supabase /appointments
                               ↓ returns {reply, booking: {id, status}, smsBody?}
                        ChatWidget ←
                               ↓
                     mobile: confirms + opens SMS app
                     desktop: confirms booking saved
```

## Changes by File

### 1. `chat-api/lib/system-prompt.ts`

Replace the SMS generation flow with a booking data collection flow.

The chatbot must collect before generating a booking:
- **Imię** (customer name)
- **Telefon** (phone number)
- **Producent roweru** (bike manufacturer)
- **Model roweru** (bike model)
- **Preferowana data** (preferred date, YYYY-MM-DD)
- **Preferowana godzina** (preferred time, HH:mm)
- **Opis problemu** (service description)

Flow:
1. Answer questions about services, prices, hours as before
2. When the customer wants to book, ask for missing details one by one
3. When all data is collected, ask: "Czy dane są poprawne?" and list them
4. After customer confirms, generate the response ending with:
   ```
   [BOOKING:{"customer_name":"...","customer_phone":"...","bike_manufacturer":"...","bike_model":"...","date":"YYYY-MM-DD","time":"HH:mm","service_note":"..."}]
   ```
5. Do NOT generate `[SMS:...]` anymore — the `[BOOKING:...]` tag replaces it entirely

The chatbot should be aware of working hours (Mon-Fri 10:00-19:00, Sat 10:00-16:00, Sun closed) and guide customers toward valid time slots (half-hour intervals). It should not reject times outright — the backend validates availability.

### 2. `chat-api/lib/parse-sms.ts` → rename to `chat-api/lib/parse-reply.ts`

Add booking tag parsing alongside the existing SMS parsing (keep SMS parsing for backward compatibility during rollout).

```typescript
export interface ParsedReply {
  reply: string;
  smsBody?: string;
  booking?: {
    customer_name: string;
    customer_phone: string;
    bike_manufacturer: string;
    bike_model: string;
    date: string;      // YYYY-MM-DD
    time: string;      // HH:mm
    service_note: string;
  };
}
```

Parsing priority: check for `[BOOKING:{...}]` first, then `[SMS:...]` as fallback. Extract the tag from the reply text (strip it from the displayed message).

### 3. `chat-api/api/chat.ts`

After getting the AI reply and parsing it:

1. If `booking` data is present:
   - POST to the Supabase `/appointments` edge function with the booking data
   - Use the existing `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars (add if not present)
   - The RPC `create_public_appointment` already hardcodes `source = 'ai_agent'` — no extra field needed in the POST body
   - On success: return `{ reply, booking: { id, status } }` to the frontend
   - On failure: return `{ reply, bookingError: "error message" }` — the frontend falls back to SMS behavior
   - Also generate `smsBody` from the booking data for mobile SMS opening

2. If only `smsBody` is present: existing behavior (backward compat)

3. If neither: plain reply

### 4. `src/lib/chatApi.ts`

Extend `ChatResponse`:

```typescript
export interface ChatResponse {
  reply: string;
  smsBody?: string;
  booking?: {
    id: string;
    status: string;
  };
  bookingError?: string;
}
```

### 5. `src/components/ChatWidget.tsx`

**Device detection:**

```typescript
function isMobileDevice(): boolean {
  if (navigator.maxTouchPoints > 0) {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  return false;
}
```

**After receiving a response with `booking` (success):**

- Show a confirmation card in the chat:
  > "Twoje zapytanie zostało zapisane. Serwis skontaktuje się z Tobą w celu potwierdzenia wizyty."
- On **mobile**: also show the "Wyślij SMS do serwisu" button (existing behavior) using `smsBody` from the response
- On **desktop**: show only the confirmation, no SMS button

**After receiving a response with `bookingError` (failure):**

- On **mobile**: fall back to SMS behavior (show SMS button as before)
- On **desktop**: show message suggesting to call the service directly

**No `booking` in response:** existing behavior unchanged.

## Environment Variables

The chat API (`chat-api/`) needs access to Supabase to call the appointments edge function:

- `SUPABASE_URL` — the Supabase project URL (e.g., `https://xxx.supabase.co`)
- `SUPABASE_ANON_KEY` — the anonymous/public API key

These are used to construct the POST request to `${SUPABASE_URL}/functions/v1/appointments`.

## Security

- No new attack surface: bookings go through the existing `/appointments` edge function which has rate limiting, input validation, phone normalization, and booking constraints
- The chat API acts as a proxy — it doesn't access the database directly
- The `source` field should be set to `'ai_agent'` when creating bookings from the chatbot (already supported by the appointments schema)

## Edge Cases

- **Customer provides partial data then stops responding:** No booking is created — data is only submitted when the AI generates the `[BOOKING:...]` tag after customer confirmation
- **Supabase is down:** Chat API returns `bookingError`, frontend falls back to SMS on mobile or shows "call us" on desktop
- **Slot is already taken:** The appointments API returns `SLOT_TAKEN` error — chatbot should tell the customer to try a different time. The `bookingError` message is shown in chat
- **Rate limit hit:** Same as above — error message shown in chat
- **AI generates malformed JSON in booking tag:** `parse-reply.ts` catches the parse error, treats it as a plain reply (no booking, no SMS)

## Testing

- Unit tests for `parse-reply.ts`: valid booking tag, malformed JSON, SMS tag, no tag, booking + SMS combined
- Manual test: full chat flow on mobile and desktop
- Verify booking appears in admin calendar after chatbot creates it

## Not In Scope

- Availability checking in chatbot (decided: "blind" booking, admin contacts customer)
- Email notifications
- Push notifications for new inquiries
