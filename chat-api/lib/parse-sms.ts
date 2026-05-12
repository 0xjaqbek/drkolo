export interface ParsedReply {
  reply: string;
  smsBody?: string;
}

export function parseSmsFromReply(raw: string): ParsedReply {
  const match = raw.match(/\[SMS:([\s\S]*?)\]/);
  if (!match) return { reply: raw.trim() };
  const smsBody = match[1].trim();
  const reply = raw.replace(/\[SMS:[\s\S]*?\]/, '').trim();
  return { reply, smsBody };
}
