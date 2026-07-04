# Chatbot Booking Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the chatbot save booking inquiries to the database so they appear in the admin calendar, with mobile SMS opening on success and desktop-only confirmation.

**Architecture:** The chatbot (DeepSeek) collects booking data during conversation and emits a `[BOOKING:json]` tag. The chat API (`chat-api/api/chat.ts` on Vercel) parses this tag, POSTs to the existing Supabase `/appointments` edge function, and returns the result. The frontend (`ChatWidget.tsx`) shows a confirmation card and optionally opens the SMS app on mobile.

**Tech Stack:** TypeScript, Vercel serverless functions, DeepSeek API, Supabase edge functions, React, Vitest

---

### Task 1: Rename and extend reply parser

**Files:**
- Rename: `chat-api/lib/parse-sms.ts` → `chat-api/lib/parse-reply.ts`
- Rename: `chat-api/lib/parse-sms.test.ts` → `chat-api/lib/parse-reply.test.ts`

- [ ] **Step 1: Rename the files**

```bash
cd chat-api
git mv lib/parse-sms.ts lib/parse-reply.ts
git mv lib/parse-sms.test.ts lib/parse-reply.test.ts
```

- [ ] **Step 2: Write failing tests for booking tag parsing**

Add these tests to `chat-api/lib/parse-reply.test.ts`. Keep all existing tests but update the import path. Replace the full file content:

```typescript
import { describe, it, expect } from 'vitest';
import { parseReply } from './parse-reply';

describe('parseReply', () => {
  it('returns reply unchanged when no marker present', () => {
    const result = parseReply('Hej, jak mogę pomóc?');
    expect(result.reply).toBe('Hej, jak mogę pomóc?');
    expect(result.smsBody).toBeUndefined();
    expect(result.booking).toBeUndefined();
  });

  it('extracts smsBody when SMS marker is present', () => {
    const result = parseReply(
      'Oto SMS do wysłania.[SMS:Dzień dobry, mam rower MTB]'
    );
    expect(result.smsBody).toBe('Dzień dobry, mam rower MTB');
    expect(result.reply).toBe('Oto SMS do wysłania.');
    expect(result.booking).toBeUndefined();
  });

  it('strips SMS marker entirely from reply text', () => {
    const result = parseReply(
      'Super.[SMS:Treść wiadomości] Kliknij przycisk.'
    );
    expect(result.reply).toBe('Super. Kliknij przycisk.');
    expect(result.smsBody).toBe('Treść wiadomości');
  });

  it('handles multiline SMS body', () => {
    const result = parseReply('Przygotowałem.[SMS:Linia 1\nLinia 2]');
    expect(result.smsBody).toBe('Linia 1\nLinia 2');
  });

  it('returns empty reply string when only SMS marker present', () => {
    const result = parseReply('[SMS:Tylko SMS]');
    expect(result.reply).toBe('');
    expect(result.smsBody).toBe('Tylko SMS');
  });

  it('extracts booking data from BOOKING tag', () => {
    const booking = {
      customer_name: 'Jan',
      customer_phone: '511222333',
      bike_manufacturer: 'Trek',
      bike_model: 'Marlin 7',
      date: '2026-07-10',
      time: '10:00',
      service_note: 'Przegląd generalny',
    };
    const result = parseReply(
      `Zapisuję wizytę.[BOOKING:${JSON.stringify(booking)}]`
    );
    expect(result.booking).toEqual(booking);
    expect(result.reply).toBe('Zapisuję wizytę.');
    expect(result.smsBody).toBeUndefined();
  });

  it('handles BOOKING tag with extra whitespace', () => {
    const json = '{"customer_name":"Jan","customer_phone":"511222333","bike_manufacturer":"Trek","bike_model":"X","date":"2026-07-10","time":"10:00","service_note":"test"}';
    const result = parseReply(`OK. [BOOKING: ${json} ] Gotowe.`);
    expect(result.booking?.customer_name).toBe('Jan');
    expect(result.reply).toBe('OK. Gotowe.');
  });

  it('returns no booking for malformed JSON in BOOKING tag', () => {
    const result = parseReply('OK.[BOOKING:not valid json]');
    expect(result.booking).toBeUndefined();
    expect(result.reply).toBe('OK.[BOOKING:not valid json]');
  });

  it('returns no booking when required fields are missing', () => {
    const partial = JSON.stringify({ customer_name: 'Jan' });
    const result = parseReply(`OK.[BOOKING:${partial}]`);
    expect(result.booking).toBeUndefined();
    expect(result.reply).toBe(`OK.[BOOKING:${partial}]`);
  });

  it('prefers BOOKING over SMS when both present', () => {
    const booking = {
      customer_name: 'Jan',
      customer_phone: '511222333',
      bike_manufacturer: 'Trek',
      bike_model: 'X',
      date: '2026-07-10',
      time: '10:00',
      service_note: 'test',
    };
    const result = parseReply(
      `Msg.[BOOKING:${JSON.stringify(booking)}][SMS:Some sms]`
    );
    expect(result.booking).toEqual(booking);
    expect(result.smsBody).toBeUndefined();
    expect(result.reply).toBe('Msg.');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd chat-api && npx vitest run lib/parse-reply.test.ts
```

Expected: Multiple failures because `parseReply` doesn't exist yet and booking parsing is not implemented.

- [ ] **Step 4: Implement the parser**

Replace the full content of `chat-api/lib/parse-reply.ts`:

```typescript
export interface BookingData {
  customer_name: string;
  customer_phone: string;
  bike_manufacturer: string;
  bike_model: string;
  date: string;
  time: string;
  service_note: string;
}

export interface ParsedReply {
  reply: string;
  smsBody?: string;
  booking?: BookingData;
}

const BOOKING_FIELDS: (keyof BookingData)[] = [
  'customer_name',
  'customer_phone',
  'bike_manufacturer',
  'bike_model',
  'date',
  'time',
  'service_note',
];

function tryParseBooking(raw: string): ParsedReply | null {
  const match = raw.match(/\[BOOKING:\s*([\s\S]*?)\s*\]/);
  if (!match) return null;

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return null;
  }

  if (typeof data !== 'object' || data === null) return null;

  for (const field of BOOKING_FIELDS) {
    if (typeof (data as Record<string, unknown>)[field] !== 'string') {
      return null;
    }
  }

  const reply = raw.replace(/\[BOOKING:\s*[\s\S]*?\s*\]/, '').trim();
  return { reply, booking: data as BookingData };
}

function tryParseSms(raw: string): ParsedReply {
  const match = raw.match(/\[SMS:([\s\S]*?)\]/);
  if (!match) return { reply: raw.trim() };
  const smsBody = match[1].trim();
  const reply = raw.replace(/\[SMS:[\s\S]*?\]/, '').trim();
  return { reply, smsBody };
}

export function parseReply(raw: string): ParsedReply {
  const bookingResult = tryParseBooking(raw);
  if (bookingResult) return bookingResult;
  return tryParseSms(raw);
}

/** @deprecated Use parseReply instead */
export function parseSmsFromReply(raw: string): ParsedReply {
  return parseReply(raw);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd chat-api && npx vitest run lib/parse-reply.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Update import in chat.ts**

In `chat-api/api/chat.ts`, change line 5:

Old: `import { parseSmsFromReply } from '../lib/parse-sms';`
New: `import { parseReply } from '../lib/parse-reply';`

Also change line 45:

Old: `const { reply, smsBody } = parseSmsFromReply(rawReply);`
New: `const { reply, smsBody } = parseReply(rawReply);`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: rename parse-sms to parse-reply and add BOOKING tag parsing"
```

---

### Task 2: Add booking submission to chat API

**Files:**
- Modify: `chat-api/api/chat.ts`

- [ ] **Step 1: Add the booking submission logic**

Replace the full content of `chat-api/api/chat.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import { SYSTEM_PROMPT } from '../lib/system-prompt';
import { parseReply, type BookingData } from '../lib/parse-reply';
import { setCors, handleOptions } from '../lib/cors';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildSmsBody(booking: BookingData): string {
  return `Nowe zapytanie - Dr Koło\nData: ${booking.date} o ${booking.time}\nImię: ${booking.customer_name}\nTelefon: ${booking.customer_phone}\nRower: ${booking.bike_manufacturer} ${booking.bike_model}\nOpis: ${booking.service_note}`;
}

async function submitBooking(booking: BookingData): Promise<{ id: string; status: string }> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_ANON_KEY!;

  const response = await fetch(`${supabaseUrl}/functions/v1/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({
      date: booking.date,
      time: booking.time,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      bike_manufacturer: booking.bike_manufacturer,
      bike_model: booking.bike_model,
      service_note: booking.service_note,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as Record<string, unknown>).message ?? 'Booking failed';
    throw new Error(String(message));
  }

  const data = await response.json() as { id: string; status: string };
  return { id: data.id, status: data.status };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (req.method !== 'POST') return res.status(405).end();

  const { sessionId, messages } = req.body as {
    sessionId?: string;
    messages?: ChatMessage[];
  };

  if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'sessionId and messages[] required' });
  }

  // Ensure session row exists
  await supabase
    .from('chat_sessions')
    .upsert({ id: sessionId }, { onConflict: 'id', ignoreDuplicates: true });

  // Call DeepSeek via OpenAI-compatible SDK
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: 'https://api.deepseek.com',
  });

  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
  });

  const rawReply = completion.choices[0].message.content ?? '';
  const parsed = parseReply(rawReply);

  // Persist the latest user message and assistant reply
  const lastUserMessage = messages[messages.length - 1];
  await supabase.from('chat_messages').insert([
    { session_id: sessionId, role: lastUserMessage.role, content: lastUserMessage.content },
    { session_id: sessionId, role: 'assistant', content: parsed.reply },
  ]);

  await supabase
    .from('chat_sessions')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sessionId);

  // If booking data was extracted, submit to Supabase
  if (parsed.booking) {
    try {
      const result = await submitBooking(parsed.booking);
      const smsBody = buildSmsBody(parsed.booking);
      return res.status(200).json({
        reply: parsed.reply,
        booking: result,
        smsBody,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zapisać wizyty';
      return res.status(200).json({
        reply: parsed.reply,
        bookingError: message,
        smsBody: buildSmsBody(parsed.booking),
      });
    }
  }

  return res.status(200).json({
    reply: parsed.reply,
    ...(parsed.smsBody ? { smsBody: parsed.smsBody } : {}),
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd chat-api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run existing tests to confirm nothing is broken**

```bash
cd chat-api && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add chat-api/api/chat.ts
git commit -m "feat: submit booking to Supabase when chatbot generates BOOKING tag"
```

---

### Task 3: Update the system prompt

**Files:**
- Modify: `chat-api/lib/system-prompt.ts`

- [ ] **Step 1: Replace the system prompt**

Replace the full content of `chat-api/lib/system-prompt.ts`:

```typescript
export const SYSTEM_PROMPT = `Jesteś pomocnym asystentem serwisu rowerowego Dr Koło. Odpowiadaj WYŁĄCZNIE po polsku. Bądź uprzejmy, zwięzły i pomocny.

## Informacje o serwisie

**Nazwa:** Dr Koło — Serwis Rowerowy
**Telefon:** 511 061 221

### Lokalizacje

**Gdańsk (serwis główny)**
- Adres: Kielnieńska 111, Gdańsk 80-299
- Godziny otwarcia: Pon – Pt 10:00–19:00, Sobota 10:00–16:00, Niedziela: nieczynne
- Dostępne sloty co 30 minut (10:00, 10:30, 11:00, ...)

**Kartuzy (dowóz / odbiór roweru)**
- Adres: Słowackiego 36, Kartuzy
- Możliwe spotkanie w Kartuzach i odbiór roweru bezpośrednio od klienta
- Wymagany wcześniejszy kontakt telefoniczny: 511 061 221

### Zakres usług
- Rowery każdego typu: MTB, szosowe, gravel, miejskie, dziecięce, elektryczne
- Serwis i regeneracja amortyzatorów oraz tylnych zawieszeń
- Przeglądy, diagnostyka, regulacja przerzutek, hamulców, centrowanie kół
- Diagnostyka systemów Bosch (rowery elektryczne)

## Cennik usług

### Przeglądy

**Przegląd generalny Full Suspension – 649 zł** (obejmuje):
- Regulacja przerzutek
- Regulacja hamulców (odpowietrzanie, regulacja zacisków, mycie zacisków, sprawdzenie stanu klocków, mycie klocków)
- Mycie napędu i smarowanie łańcucha
- Kasacja luzów (stery, piasty, ramiona korb, pedały)
- Sprawdzenie łożysk w piastach kół
- Pompowanie kół (sprawdzenie czy jest mleko)
- Czyszczenie sterów
- Przegląd suportu
- Przegląd pancerzy i linek hamulcowych oraz przerzutkowych
- Sprawdzenie śrub mostka
- Przegląd i czyszczenie ISOSPEED
- Przegląd i czyszczenie łożysk wahaczy i dampera

**Przegląd generalny hardtail – 449 zł** (obejmuje):
- Regulacja przerzutek
- Regulacja hamulców (odpowietrzanie, regulacja zacisków)
- Mycie i smarowanie łańcucha
- Kasacja luzów (stery, piasty, ramiona korb, pedały)
- Pompowanie kół (sprawdzenie czy jest mleko)
- Sprawdzenie śrub mostka
- Centrowanie kół (dociągnięcie szprych)

**Przegląd podstawowy – 249 zł** (obejmuje):
- Regulacja przerzutek
- Regulacja hamulców (odpowietrzanie, regulacja zacisków)
- Mycie i smarowanie łańcucha
- Kasacja luzów (stery, piasty, ramiona korb, pedały)
- Pompowanie kół (sprawdzenie czy jest mleko)
- Sprawdzenie śrub mostka

### Zawieszenie
- Duży serwis zawieszenia: 400 zł
- Mały serwis zawieszenia: 200 zł

### Napęd
- Założenie łańcucha + regulacja przerzutki: 80 zł
- Mycie napędu: 80 zł
- Regulacja przerzutki: 50 zł

### Koła
- Montaż systemu tubeless: 150 zł
- Zmiana opony tubeless: 50 zł
- Centrowanie koła: 50 zł
- Dolanie uszczelniacza: 40 zł
- Wymiana dętki: 30 zł

### Hamulce i diagnostyka
- Diagnostyka Bosch: 200 zł
- Serwis hamulca: 50 zł
- Prostowanie haka przerzutki: 30 zł

## Uwagi

Ceny są orientacyjne. Ostateczna wycena po oględzinach roweru. Jeśli klient jest z okolic Kartuz, poinformuj go o możliwości odbioru roweru w Kartuzach po wcześniejszym kontakcie telefonicznym.

## Twoje zadanie

1. Odpowiadaj na pytania o usługi, ceny i godziny otwarcia.
2. Pomagaj klientom opisać problem z rowerem — pytaj o typ roweru i szczegóły usterki.
3. Gdy klient chce umówić wizytę, zbierz WSZYSTKIE wymagane dane:
   - Imię
   - Numer telefonu
   - Producent roweru (np. Trek, Specialized, Giant, Kross)
   - Model roweru
   - Preferowana data wizyty (format YYYY-MM-DD, np. 2026-07-10)
   - Preferowana godzina (slot co 30 min w godzinach otwarcia, np. 10:00, 10:30, 14:00)
   - Opis problemu / co ma być zrobione
4. Pytaj o brakujące dane pojedynczo, nie wszystko naraz.
5. Gdy masz komplet danych, wypisz je klientowi i zapytaj: "Czy dane są poprawne?"
6. Dopiero po potwierdzeniu klienta (odpowie "tak", "zgadza się" itp.) wygeneruj odpowiedź potwierdzającą, a NA JEJ KOŃCU umieść tag:
   [BOOKING:{"customer_name":"...","customer_phone":"...","bike_manufacturer":"...","bike_model":"...","date":"YYYY-MM-DD","time":"HH:mm","service_note":"..."}]
7. NIGDY nie generuj tagu [BOOKING:...] bez wcześniejszego potwierdzenia klienta.
8. NIGDY nie generuj tagu [SMS:...] — używaj wyłącznie [BOOKING:...].
9. Po wygenerowaniu [BOOKING:...] poinformuj klienta: "Twoje zapytanie zostało zapisane. Serwis skontaktuje się z Tobą telefonicznie w celu potwierdzenia terminu."`;
```

- [ ] **Step 2: Run tests to confirm nothing is broken**

```bash
cd chat-api && npx vitest run
```

Expected: All tests PASS (system prompt is not unit-tested, but other tests should still pass).

- [ ] **Step 3: Commit**

```bash
git add chat-api/lib/system-prompt.ts
git commit -m "feat: update chatbot prompt to collect booking data instead of generating SMS"
```

---

### Task 4: Extend frontend ChatResponse type

**Files:**
- Modify: `src/lib/chatApi.ts`

- [ ] **Step 1: Add booking and bookingError fields to ChatResponse**

In `src/lib/chatApi.ts`, replace the `ChatResponse` interface (lines 8-11):

Old:
```typescript
export interface ChatResponse {
  reply: string;
  smsBody?: string;
}
```

New:
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/chatApi.ts
git commit -m "feat: add booking fields to ChatResponse type"
```

---

### Task 5: Update ChatWidget with mobile detection and booking confirmation

**Files:**
- Modify: `src/components/ChatWidget.tsx`

- [ ] **Step 1: Replace the full ChatWidget content**

Replace the full content of `src/components/ChatWidget.tsx`:

```typescript
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, MessageSquare, CheckCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendChatMessage, type ChatMessage, type ChatResponse } from '@/lib/chatApi';

function getOrCreateSessionId(): string {
  const key = 'chat_session_id';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (navigator.maxTouchPoints > 0) {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  return false;
}

const SERVICE_PHONE = '+48511061221';

type BookingStatus =
  | { type: 'success' }
  | { type: 'error'; message: string }
  | null;

export function ChatWidget() {
  const [apiReady, setApiReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [smsBody, setSmsBody] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>(null);
  const sessionIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mobile = isMobileDevice();

  useEffect(() => {
    const url = import.meta.env.VITE_CHAT_API_URL as string;
    if (!url) return;
    fetch(`${url}/api/health`)
      .then((res) => { if (res.ok) setApiReady(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isLoading, bookingStatus]);

  const handleBookingResponse = (response: ChatResponse) => {
    if (response.booking) {
      setBookingStatus({ type: 'success' });
      if (response.smsBody) {
        setSmsBody(`${response.smsBody}\n\n[wiadomość wygenerowana przez Wirtualnego Asystenta Dr Koło]`);
      }
    } else if (response.bookingError) {
      setBookingStatus({ type: 'error', message: response.bookingError });
      if (mobile && response.smsBody) {
        setSmsBody(`${response.smsBody}\n\n[wiadomość wygenerowana przez Wirtualnego Asystenta Dr Koło]`);
      }
    } else if (response.smsBody) {
      setSmsBody(`${response.smsBody}\n\n[wiadomość wygenerowana przez Wirtualnego Asystenta Dr Koło]`);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    if (!sessionIdRef.current) {
      sessionIdRef.current = getOrCreateSessionId();
    }

    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(sessionIdRef.current, updatedMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
      handleBookingResponse(response);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!apiReady) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Zamknij czat' : 'Otwórz czat'}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-glow flex items-center justify-center hover:scale-105 transition-transform"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Czat z asystentem"
          className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-background border border-border rounded-lg shadow-bold flex flex-col"
          style={{ height: '480px' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="font-display font-semibold text-sm">Wirtualny Asystent Dr Koło</div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Zamknij"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-8">
                Cześć! Jak mogę pomóc z Twoim rowerem?
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary px-3 py-2 rounded-lg text-sm text-muted-foreground animate-pulse">
                  ...
                </div>
              </div>
            )}

            {bookingStatus?.type === 'success' && (
              <div className="mx-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm space-y-2">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Zapytanie zapisane
                </div>
                <p className="text-green-800/80 text-xs">
                  Serwis skontaktuje się z Tobą telefonicznie w celu potwierdzenia terminu.
                </p>
              </div>
            )}

            {bookingStatus?.type === 'error' && !mobile && (
              <div className="mx-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm space-y-2">
                <p className="text-yellow-800 text-xs">
                  Nie udało się automatycznie zapisać wizyty. Zadzwoń do serwisu:
                </p>
                <a
                  href={`tel:${SERVICE_PHONE.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent text-accent-foreground rounded-full text-xs font-medium hover:bg-accent/90 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  511 061 221
                </a>
              </div>
            )}

            {smsBody && mobile && (
              <div className="flex justify-center pt-2">
                <a
                  href={`sms:${SERVICE_PHONE}?body=${encodeURIComponent(smsBody)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Wyślij SMS do serwisu
                </a>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-border flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Napisz wiadomość..."
              disabled={isLoading}
              aria-label="Wiadomość"
              className="flex-1 text-sm bg-secondary border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              aria-label="Wyślij"
              className="h-9 w-9 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChatWidget.tsx
git commit -m "feat: show booking confirmation in chat with mobile SMS and desktop fallback"
```

---

### Task 6: Add SUPABASE_ANON_KEY to Vercel environment

**Files:**
- No code files — environment variable configuration

- [ ] **Step 1: Check if SUPABASE_ANON_KEY is already set**

```bash
cd chat-api && grep -r "SUPABASE_ANON_KEY" . --include="*.ts" --include="*.env*"
```

The `chat-api/api/chat.ts` (Task 2) references `process.env.SUPABASE_ANON_KEY`. This must be set in the Vercel project for `drkolo-chat-api`.

- [ ] **Step 2: Get the anon key value**

The anon key is the same one used in the frontend. Check:

```bash
grep VITE_SUPABASE_ANON_KEY .env* 2>/dev/null || grep SUPABASE_ANON_KEY .env* 2>/dev/null
```

- [ ] **Step 3: Set the env var in Vercel**

The user must run this manually (requires Vercel CLI authentication):

```bash
cd chat-api && vercel env add SUPABASE_ANON_KEY
```

Or set it via the Vercel dashboard: Project Settings → Environment Variables → Add `SUPABASE_ANON_KEY` with the Supabase anon/public key value.

- [ ] **Step 4: Commit (no code changes — just a checkpoint)**

No commit needed for this task.

---

### Task 7: Final verification and deploy

- [ ] **Step 1: Run all chat-api tests**

```bash
cd chat-api && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 2: Run frontend type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Push all changes**

```bash
git push
```

- [ ] **Step 4: Deploy chat-api to Vercel**

```bash
cd chat-api && vercel --prod
```

Or let it auto-deploy if configured.

- [ ] **Step 5: Manual smoke test**

1. Open https://drkolo.pl on desktop
2. Open the chat widget
3. Say "Chcę umówić wizytę"
4. Provide all required details when chatbot asks
5. Confirm the booking
6. Verify: confirmation card appears in chat (no SMS button on desktop)
7. Check admin calendar: the inquiry should appear in "Oczekujące zapytania"
8. Repeat on mobile: verify SMS button appears alongside confirmation
