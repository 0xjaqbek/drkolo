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
