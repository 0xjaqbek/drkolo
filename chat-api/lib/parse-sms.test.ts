import { describe, it, expect } from 'vitest';
import { parseSmsFromReply } from './parse-sms';

describe('parseSmsFromReply', () => {
  it('returns reply unchanged when no SMS marker present', () => {
    const result = parseSmsFromReply('Hej, jak mogę pomóc?');
    expect(result.reply).toBe('Hej, jak mogę pomóc?');
    expect(result.smsBody).toBeUndefined();
  });

  it('extracts smsBody when marker is present', () => {
    const result = parseSmsFromReply(
      'Oto SMS do wysłania.[SMS:Dzień dobry, mam rower MTB]'
    );
    expect(result.smsBody).toBe('Dzień dobry, mam rower MTB');
    expect(result.reply).toBe('Oto SMS do wysłania.');
  });

  it('strips SMS marker entirely from reply text', () => {
    const result = parseSmsFromReply(
      'Super.[SMS:Treść wiadomości] Kliknij przycisk.'
    );
    expect(result.reply).toBe('Super. Kliknij przycisk.');
    expect(result.smsBody).toBe('Treść wiadomości');
  });

  it('handles multiline SMS body', () => {
    const result = parseSmsFromReply('Przygotowałem.[SMS:Linia 1\nLinia 2]');
    expect(result.smsBody).toBe('Linia 1\nLinia 2');
  });

  it('returns empty reply string when only marker present', () => {
    const result = parseSmsFromReply('[SMS:Tylko SMS]');
    expect(result.reply).toBe('');
    expect(result.smsBody).toBe('Tylko SMS');
  });
});
