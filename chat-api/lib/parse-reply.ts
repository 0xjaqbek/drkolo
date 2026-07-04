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

  const reply = raw
    .replace(/\[BOOKING:\s*[\s\S]*?\s*\]/, '')
    .replace(/\[SMS:[\s\S]*?\]/, '')
    .replace(/ {2,}/g, ' ')
    .trim();
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
